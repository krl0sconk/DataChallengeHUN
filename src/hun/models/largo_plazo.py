"""Modelo de demanda de largo plazo a 4 meses (120 días), sin rezagos cortos.

La base del hospital termina el 2026-07-16 y el modelo operativo de 7 días usa llegadas de
semanas recientes (`llegadas_lag_7..56`), por lo que no puede proyectar de agosto a noviembre
de 2026 sin realimentar predicciones con error acumulado. Este módulo construye un modelo
independiente para horizontes de hasta 120 días basado exclusivamente en:

1. **Calendario y estacionalidad:** día de la semana, mes, armónicos anuales y semanales, y
   el grupo validado de festivos y puentes (`festivos_y_puentes`).
2. **Tendencia secular (`tendencia_anios`):** años transcurridos desde 2023-01-01, ponderando
   las observaciones recientes con decaimiento exponencial (vida media de 180 días).
3. **Clima típico por día del año:** mediana histórica de temperatura, lluvia y humedad para
   cada día del calendario calculada solo con fechas anteriores al corte (sin fuga y disponible
   para cualquier fecha futura aunque el pronóstico meteorológico ya no exista).
4. **Intervalos más anchos y crecientes con el horizonte:** cuantiles base p05/p95 combinados
   con un factor de ensanchamiento progresivo `1 + c * (mes_horizonte - 1)` que refleja la
   mayor incertidumbre a 2, 3 y 4 meses vista.
"""

from __future__ import annotations

import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import holidays
import lightgbm as lgb
import numpy as np
import pandas as pd

from hun import config
from hun.data.agregados import OTROS, agrupar_bajo_volumen, fecha_corte, serie_llegadas
from hun.models.explicacion import cobertura_intervalo, corregir_cuantiles_cruzados
from hun.models.validacion import Pliegue, metricas, pliegues_walk_forward

log = logging.getLogger("largo_plazo")

COLUMNAS_CALENDARIO: tuple[str, ...] = (
    "dia_semana",
    "mes",
    "sin_dia_anio",
    "cos_dia_anio",
    "es_fin_de_semana",
    "sin_dia_semana",
    "cos_dia_semana",
)
COLUMNAS_FESTIVOS: tuple[str, ...] = (
    "es_festivo",
    "es_puente",
    "es_dia_no_laboral",
    "dia_post_festivo",
    "dias_a_festivo",
    "dias_desde_festivo",
)
COLUMNAS_CLIMA_BASE: tuple[str, ...] = (
    "clima_temperature_2m_mean",
    "clima_precipitation_sum",
    "clima_relative_humidity_2m_mean",
)

VIDA_MEDIA_DIAS: float = 180.0
CUANTIL_BAJO: float = 0.05
CUANTIL_ALTO: float = 0.95
ENSANCHAMIENTO_MENSUAL: float = 0.10


def clima_tipico_por_fecha(
    externos: pd.DataFrame,
    corte: pd.Timestamp | None = None,
    columnas_clima: tuple[str, ...] = COLUMNAS_CLIMA_BASE,
) -> pd.DataFrame:
    """Clima típico (mediana histórica por día del año) calculado solo con fechas `< corte`.

    Garantiza que no haya fuga del futuro en el backtest y que cualquier fecha futura
    (por ejemplo agosto–noviembre de 2026, donde `externos.parquet` ya no trae clima medido)
    tenga un valor climático típico válido.
    """
    ext = externos.copy()
    if "fecha" in ext.columns and not isinstance(ext.index, pd.DatetimeIndex):
        ext = ext.set_index("fecha")
    ext.index = pd.to_datetime(ext.index).normalize()

    cols = [c for c in columnas_clima if c in ext.columns]
    hist = ext[ext.index < pd.Timestamp(corte)] if corte is not None else ext
    if len(hist) == 0:
        hist = ext

    medianas = hist[cols].groupby(hist.index.day_of_year).median()
    globales = hist[cols].median()

    out = pd.DataFrame(index=ext.index)
    for c in cols:
        serie_doy = pd.Series(ext.index.day_of_year.map(medianas[c]), index=ext.index, dtype=float)
        out[f"tipico_{c}"] = serie_doy.bfill().ffill().fillna(float(globales.get(c, 0.0)))
    return out


def _asegurar_calendario(ext: pd.DataFrame) -> pd.DataFrame:
    """Completa las columnas de calendario y festivos si `externos` no las trae todas."""
    df = ext.copy()
    idx = pd.DatetimeIndex(df.index)
    dow = idx.day_of_week
    doy = idx.day_of_year

    if "dia_semana" not in df.columns:
        df["dia_semana"] = dow
    if "mes" not in df.columns:
        df["mes"] = idx.month
    if "sin_dia_anio" not in df.columns:
        df["sin_dia_anio"] = np.sin(2 * np.pi * doy / 365.25)
    if "cos_dia_anio" not in df.columns:
        df["cos_dia_anio"] = np.cos(2 * np.pi * doy / 365.25)
    if "es_fin_de_semana" not in df.columns:
        df["es_fin_de_semana"] = (dow >= 5).astype(int)
    if "sin_dia_semana" not in df.columns:
        df["sin_dia_semana"] = np.sin(2 * np.pi * dow / 7.0)
    if "cos_dia_semana" not in df.columns:
        df["cos_dia_semana"] = np.cos(2 * np.pi * dow / 7.0)

    if "es_festivo" not in df.columns:
        co = holidays.Colombia(years=range(idx.min().year, idx.max().year + 1))
        df["es_festivo"] = [int(d in co) for d in idx.date]
    if "es_dia_no_laboral" not in df.columns:
        df["es_dia_no_laboral"] = ((dow >= 5) | (df["es_festivo"] == 1)).astype(int)
    if "es_puente" not in df.columns:
        df["es_puente"] = df["es_festivo"].astype(int)
    if "dia_post_festivo" not in df.columns:
        df["dia_post_festivo"] = df["es_dia_no_laboral"].shift(1, fill_value=0).astype(int)
    if "dias_a_festivo" not in df.columns:
        df["dias_a_festivo"] = 0.0
    if "dias_desde_festivo" not in df.columns:
        df["dias_desde_festivo"] = 0.0
    return df


def construir_features_largo_plazo(
    serie: pd.DataFrame,
    externos: pd.DataFrame,
    corte: pd.Timestamp | None = None,
) -> tuple[pd.DataFrame, list[str]]:
    """Arma la tabla de features de largo plazo (sin ningún rezago de llegadas).

    Returns:
        Tupla `(df, columnas)` lista para entrenar o predecir.
    """
    ext = externos.copy()
    if "fecha" in ext.columns and not isinstance(ext.index, pd.DatetimeIndex):
        ext = ext.set_index("fecha")
    ext.index = pd.to_datetime(ext.index).normalize()
    ext = _asegurar_calendario(ext)

    corte_ef = pd.Timestamp(corte) if corte is not None else pd.to_datetime(serie["ts"]).max()
    tipico = clima_tipico_por_fecha(ext, corte=corte_ef)

    cols_cal = [c for c in COLUMNAS_CALENDARIO + COLUMNAS_FESTIVOS if c in ext.columns]
    tabla_ext = ext[cols_cal].join(tipico)
    tabla_ext = tabla_ext[~tabla_ext.index.duplicated(keep="first")]

    df = serie.copy()
    df["ts"] = pd.to_datetime(df["ts"])
    df["fecha"] = df["ts"].dt.normalize()
    df = df.sort_values(["serie", "ts"]).reset_index(drop=True)
    df = df.merge(tabla_ext, left_on="fecha", right_index=True, how="left")

    df["tendencia_anios"] = (df["ts"] - pd.Timestamp("2023-01-01")).dt.days / 365.25
    df["serie_cod"] = df["serie"].astype("category").cat.codes

    columnas = cols_cal + list(tipico.columns) + ["tendencia_anios", "serie_cod"]
    return df, columnas


def ensanchar_intervalos_por_horizonte(
    p10: np.ndarray | pd.Series,
    p50: np.ndarray | pd.Series,
    p90: np.ndarray | pd.Series,
    mes_horizonte: np.ndarray | pd.Series,
    coef_mensual: float = ENSANCHAMIENTO_MENSUAL,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Abre el intervalo gradualmente según el mes del horizonte (1 a 4) y corrige cruces."""
    lo_b, mid, hi_b = corregir_cuantiles_cruzados(p10, p50, p90)
    mes = np.maximum(np.asarray(mes_horizonte, dtype=float), 1.0)
    escala = 1.0 + coef_mensual * (mes - 1.0)
    lo = np.maximum(0.0, mid - (mid - lo_b) * escala)
    hi = mid + (hi_b - mid) * escala
    return corregir_cuantiles_cruzados(lo, mid, hi)


def ajustar_predecir_largo_plazo(
    train: pd.DataFrame,
    test: pd.DataFrame,
    columnas: list[str],
    mes_horizonte: np.ndarray | pd.Series,
    vida_media_dias: float = VIDA_MEDIA_DIAS,
) -> pd.DataFrame:
    """Entrena el modelo puntual (Poisson) y los cuantiles base (p05/p95) y predice en `test`."""
    tr = train[train["y"].notna() & (train["y"] >= 0)].copy()
    if len(tr) == 0:
        ceros = np.zeros(len(test), dtype=float)
        return pd.DataFrame({"pred": ceros, "pred_p10": ceros, "pred_p90": ceros}, index=test.index)

    edad = (tr["ts"].max() - tr["ts"]).dt.days.to_numpy()
    pesos = 0.5 ** (edad / vida_media_dias)
    cats = ["serie_cod"] if "serie_cod" in columnas else "auto"

    params = dict(
        random_state=config.RANDOM_SEED,
        n_estimators=200,
        learning_rate=0.05,
        num_leaves=15,
        min_child_samples=20,
        verbose=-1,
    )
    m_puntual = lgb.LGBMRegressor(objective="poisson", **params)
    m_puntual.fit(tr[columnas], tr["y"], sample_weight=pesos, categorical_feature=cats)
    pred = np.maximum(0.0, m_puntual.predict(test[columnas]))

    cuantiles = {}
    for q in (CUANTIL_BAJO, CUANTIL_ALTO):
        mq = lgb.LGBMRegressor(objective="quantile", alpha=q, **params)
        mq.fit(tr[columnas], tr["y"], sample_weight=pesos, categorical_feature=cats)
        cuantiles[q] = mq.predict(test[columnas])

    lo, mid, hi = ensanchar_intervalos_por_horizonte(
        cuantiles[CUANTIL_BAJO], pred, cuantiles[CUANTIL_ALTO], mes_horizonte
    )
    return pd.DataFrame({"pred": mid, "pred_p10": lo, "pred_p90": hi}, index=test.index)


def evaluar_backtest_largo_plazo(
    serie: pd.DataFrame,
    externos: pd.DataFrame,
    horizonte: str = "120D",
    paso: str = "30D",
    ventana_evaluacion: str = "480D",
) -> pd.DataFrame:
    """Evalúa el modelo de largo plazo en pliegues walk-forward de 120 días."""
    base = serie[serie["serie"] != OTROS].sort_values(["serie", "ts"]).reset_index(drop=True)
    pliegues: list[Pliegue] = pliegues_walk_forward(
        base["ts"], horizonte=horizonte, paso=paso, ventana_evaluacion=ventana_evaluacion
    )
    partes = []
    for p in pliegues:
        df, cols = construir_features_largo_plazo(base, externos, corte=p.origen)
        tr = p.entrenamiento(df)
        te = p.prueba(df).copy()
        dia_h = ((te["ts"] - p.origen) // pd.Timedelta("1D")).astype(int) + 1
        mes_h = np.minimum(((dia_h - 1) // 30) + 1, 4)
        preds = ajustar_predecir_largo_plazo(tr, te, cols, mes_h)
        te["pred"] = preds["pred"]
        te["pred_p10"] = preds["pred_p10"]
        te["pred_p90"] = preds["pred_p90"]
        te["pliegue"] = p.numero
        te["origen"] = p.origen
        te["dia_horizonte"] = dia_h
        te["mes_horizonte"] = mes_h
        partes.append(
            te[
                [
                    "ts",
                    "serie",
                    "y",
                    "pred",
                    "pred_p10",
                    "pred_p90",
                    "pliegue",
                    "origen",
                    "dia_horizonte",
                    "mes_horizonte",
                    "es_festivo",
                ]
            ]
        )
    return pd.concat(partes, ignore_index=True)


def pronosticar_rango(
    serie: pd.DataFrame,
    externos: pd.DataFrame,
    inicio: str | pd.Timestamp = "2026-08-01",
    fin: str | pd.Timestamp = "2026-11-30",
) -> pd.DataFrame:
    """Entrena con toda la historia disponible y pronostica el rango `[inicio, fin]`."""
    base = serie[serie["serie"] != OTROS].sort_values(["serie", "ts"]).reset_index(drop=True)
    corte = base["ts"].max() + pd.Timedelta("1D")
    fechas_fut = pd.date_range(pd.Timestamp(inicio), pd.Timestamp(fin), freq="D")
    servicios = sorted(base["serie"].unique())

    grilla_fut = pd.MultiIndex.from_product([servicios, fechas_fut], names=["serie", "ts"])
    df_fut = grilla_fut.to_frame().reset_index(drop=True)
    df_fut["y"] = np.nan

    combinado = pd.concat([base[["ts", "serie", "y"]], df_fut], ignore_index=True)
    df_feat, cols = construir_features_largo_plazo(combinado, externos, corte=corte)

    tr = df_feat[df_feat["ts"] < pd.Timestamp(inicio)]
    te = df_feat[df_feat["ts"] >= pd.Timestamp(inicio)].copy()
    dia_h = ((te["ts"] - pd.Timestamp(inicio)) // pd.Timedelta("1D")).astype(int) + 1
    mes_h = np.minimum(((dia_h - 1) // 30) + 1, 4)

    preds = ajustar_predecir_largo_plazo(tr, te, cols, mes_h)
    te["pred"] = preds["pred"]
    te["pred_p10"] = preds["pred_p10"]
    te["pred_p90"] = preds["pred_p90"]
    te["dia_horizonte"] = dia_h
    te["mes_horizonte"] = mes_h
    return te[
        [
            "ts",
            "serie",
            "pred",
            "pred_p10",
            "pred_p90",
            "dia_horizonte",
            "mes_horizonte",
            "es_festivo",
        ]
    ].reset_index(drop=True)


def reporte_markdown(
    backtest: pd.DataFrame,
    pronostico: pd.DataFrame,
    nombres_series: dict[Any, str] | None = None,
) -> str:
    """Genera `docs/resultados/largo_plazo.md` con el backtest y el pronóstico ago–nov."""
    nombres = nombres_series or {}
    hoy = datetime.now().strftime("%Y-%m-%d %H:%M")
    n_pl = backtest["pliegue"].nunique()
    ori_ini = pd.Timestamp(backtest["origen"].min()).strftime("%Y-%m-%d")
    ori_fin = pd.Timestamp(backtest["origen"].max()).strftime("%Y-%m-%d")

    m_glob = metricas(backtest["y"], backtest["pred"])
    cob_glob = cobertura_intervalo(backtest["y"], backtest["pred_p10"], backtest["pred_p90"])

    lineas = [
        "# Resultados · Modelo de Largo Plazo (Horizonte 4 Meses / 120 Días)",
        "",
        f"_Generado automáticamente por `python -m hun.models.largo_plazo` el {hoy}. "
        "Solo métricas agregadas._",
        "",
        "- **Por qué hace falta:** la base termina el `2026-07-16` y el modelo operativo de 7 días "
        "depende de llegadas de semanas recientes (`llegadas_lag_7..56`). A 120 días esos rezagos "
        "no existen.",
        "- **Variables usadas (sin rezagos cortos):** calendario, grupo aceptado "
        "`festivos_y_puentes`, tendencia secular ponderada por recencia (vida media 180 días) y "
        "clima típico del día del año (mediana histórica de temperatura, lluvia y humedad antes "
        "del corte).",
        f"- **Validación (backtest a 120 días):** {n_pl} pliegues walk-forward, orígenes "
        f"`{ori_ini}` → `{ori_fin}`, paso de 30 días.",
        f"- **Desempeño global a 120 días:** exactitud **{1 - m_glob['wape']:.1%}** "
        f"(WAPE {m_glob['wape']:.1%}, MAE {m_glob['mae']:.1f}), cobertura del intervalo "
        f"**{cob_glob:.1%}**.",
        "",
        "## 1. Backtest a 120 Días por Servicio",
        "",
        "| Servicio | Exactitud (1 − WAPE) | WAPE | MAE | Sesgo | Cobertura Intervalo | "
        "Promedio Real |",
        "|---|---|---|---|---|---|---|",
    ]

    for s_id, g in backtest.groupby("serie"):
        m = metricas(g["y"], g["pred"])
        cob = cobertura_intervalo(g["y"], g["pred_p10"], g["pred_p90"])
        nom = nombres.get(s_id, str(s_id))
        lineas.append(
            f"| {nom} | {1 - m['wape']:.1%} | {m['wape']:.1%} | {m['mae']:.1f} | "
            f"{m['sesgo']:+.1f} | {cob:.1%} | {g['y'].mean():.1f} |"
        )
        if g["y"].mean() < 30:
            sem = g.groupby(["pliegue", (g["dia_horizonte"] - 1) // 7])[["y", "pred"]].sum()
            ex_sem = 1.0 - metricas(sem["y"], sem["pred"])["wape"]
            lineas.append(
                f"| ↳ _{nom} (agregado por semana)_ | _{ex_sem:.1%}_ | "
                f"_{1 - ex_sem:.1%}_ | — | — | — | _{g['y'].mean() * 7:.1f}/sem_ |"
            )

    lineas.extend(
        [
            "",
            "## 2. Desempeño y Ancho del Intervalo por Mes del Horizonte (1 a 4)",
            "",
            "El intervalo se ensancha con `1 + 0,10 × (mes − 1)` sobre los cuantiles base "
            "p05/p95 para sostener una cobertura ≥ 80 % a medida que crece el horizonte.",
            "",
            "| Mes del Horizonte | Días | Exactitud (1 − WAPE) | WAPE | Cobertura | "
            "Ancho Medio (p90 − p10) |",
            "|---|---|---|---|---|---|",
        ]
    )
    for mh, g in backtest.groupby("mes_horizonte"):
        m = metricas(g["y"], g["pred"])
        cob = cobertura_intervalo(g["y"], g["pred_p10"], g["pred_p90"])
        ancho = float((g["pred_p90"] - g["pred_p10"]).mean())
        d_ini, d_fin = int(g["dia_horizonte"].min()), int(g["dia_horizonte"].max())
        lineas.append(
            f"| Mes {int(mh)} | {d_ini}–{d_fin} | {1 - m['wape']:.1%} | {m['wape']:.1%} | "
            f"{cob:.1%} | {ancho:.1f} |"
        )

    lineas.extend(
        [
            "",
            "## 3. Pronóstico Agosto–Noviembre 2026 por Servicio y Mes",
            "",
            "Resumen mensual del pronóstico de 4 meses posteriores al cierre de la base "
            "(`2026-08-01` a `2026-11-30`).",
            "",
            "| Servicio | Mes | Promedio Diario Predicho | "
            "Intervalo Diario Medio [p10, p90] | Total Mensual Predicho |",
            "|---|---|---|---|---|",
        ]
    )
    pron = pronostico.copy()
    pron["ym"] = pd.to_datetime(pron["ts"]).dt.strftime("%Y-%m")
    for (s_id, ym), g in pron.groupby(["serie", "ym"]):
        nom = nombres.get(s_id, str(s_id))
        lineas.append(
            f"| {nom} | {ym} | {g['pred'].mean():.1f} | "
            f"[{g['pred_p10'].mean():.1f}, {g['pred_p90'].mean():.1f}] | "
            f"{g['pred'].sum():.0f} |"
        )

    return "\n".join(lineas) + "\n"


def _generar_plantilla_todo(salida: Path) -> None:
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(
        "# Resultados · Modelo de Largo Plazo (Horizonte 4 Meses)\n\n"
        "TODO: completar con resultado real ejecutando `python -m hun.models.largo_plazo` "
        "cuando `data/raw/entradas_por_hora.parquet` esté disponible.\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Modelo de demanda a 4 meses (120 días).")
    parser.add_argument("--entrada", default=str(config.RAW_DIR / "entradas_por_hora.parquet"))
    parser.add_argument("--externos", default=str(config.DATA_DIR / "externos.parquet"))
    parser.add_argument("--salida", default=str(config.ROOT_DIR / "docs/resultados/largo_plazo.md"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    entrada_path = Path(args.entrada)
    salida_path = Path(args.salida)
    if not entrada_path.exists():
        log.warning("No se encontró %s. Escribiendo plantilla TODO.", entrada_path)
        _generar_plantilla_todo(salida_path)
        return

    entradas = pd.read_parquet(entrada_path)
    corte = fecha_corte(entradas)
    entradas = entradas[pd.to_datetime(entradas["hora"]) < corte]
    serie = agrupar_bajo_volumen(serie_llegadas(entradas, freq="D"), min_por_dia=1.0)
    externos = pd.read_parquet(args.externos)

    nombres: dict[Any, str] = {}
    tipos_path = config.RAW_DIR / "tipos_visita.parquet"
    if tipos_path.exists():
        t = pd.read_parquet(tipos_path)
        nombres = dict(
            zip(t["visit_concept_id"], t["concept_name"].fillna("(sin nombre)"), strict=False)
        )

    log.info("Ejecutando backtest walk-forward a 120 días...")
    bt = evaluar_backtest_largo_plazo(serie, externos)
    log.info("Generando pronóstico ago–nov 2026...")
    pron = pronosticar_rango(serie, externos, inicio="2026-08-01", fin="2026-11-30")

    salida_path.parent.mkdir(parents=True, exist_ok=True)
    salida_path.write_text(reporte_markdown(bt, pron, nombres), encoding="utf-8")
    log.info("Reporte de largo plazo guardado en %s", salida_path)


if __name__ == "__main__":
    main()
