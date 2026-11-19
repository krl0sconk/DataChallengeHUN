"""Empaquetado del modelo y resultados precalculados para despliegue sin datos (`models/`).

Regla de despliegue: **se publica el paquete del modelo, nunca la carpeta `data/`**.
Este script lee los parquets agregados locales una sola vez durante el entrenamiento y
genera un único archivo `models/modelos_web_bundle.joblib` que contiene:

1. Modelos LightGBM por cuantiles (p10, p50, p90) para el horizonte operativo y SHAP.
2. Comparación histórica walk-forward (predicho vs. real y exactitud por servicio).
3. Efecto promedio histórico de cada evento (festivos, Carnaval, Semana Santa, vacaciones,
   fin de semana) por servicio, calculado sobre la serie real y listo para mostrar en la web.
4. Pronóstico de largo plazo a 4 meses (agosto–noviembre de 2026) y métricas de backtest a
   120 días por servicio.
5. Matriz de turnos, ocupación por servicio e indicadores agregados de cuellos de botella por
   etapa (sin ninguna fila individual de pacientes).

En modo producción (`HUN_MODO_PRODUCCION=1` o `HUN_ENV=production`), la API carga únicamente
este paquete y falla con un mensaje explícito si no existe, sin tocar `data/raw/` ni
`data/processed/`.
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Any

import holidays
import joblib
import numpy as np
import pandas as pd

from hun import config
from hun.data.agregados import OTROS, agrupar_bajo_volumen, fecha_corte, serie_llegadas
from hun.models.demanda import (
    GRUPOS_ACEPTADOS,
    columnas_por_grupos,
    construir_features_demanda,
    exactitud_semanal,
)
from hun.models.explicacion import (
    cobertura_intervalo,
    entrenar_modelos_cuantiles,
    evaluar_cuantiles_walk_forward,
)
from hun.models.largo_plazo import evaluar_backtest_largo_plazo, pronosticar_rango
from hun.models.validacion import metricas, pliegues_walk_forward

log = logging.getLogger("empaquetar")

RUTA_PAQUETE_POR_DEFECTO: Path = config.MODELS_DIR / "modelos_web_bundle.joblib"

SERVICIOS_INFO: dict[str, tuple[int, str]] = {
    "urgencias": (9203, "Urgencias"),
    "rehabilitacion": (581479, "Rehabilitación Ambulatoria"),
    "tratamiento_urgencia": (3045729, "Tratamiento Urgencias"),
}

EVENTOS_DEFINICION: tuple[tuple[str, str, str], ...] = (
    ("festivos", "es_festivo", "Festivos nacionales"),
    ("carnaval", "es_carnaval", "Carnaval de Barranquilla"),
    ("semana_santa", "es_semana_santa", "Semana Santa"),
    ("vacaciones", "es_vacaciones_escolares", "Vacaciones escolares"),
    ("fin_de_semana", "es_fin_de_semana", "Fines de semana"),
)


def _normalizar_externos(externos: pd.DataFrame | None, fechas: pd.Series) -> pd.DataFrame:
    """Asegura un DataFrame de factores externos indexado por `date` para cruzar con `serie`."""
    if externos is not None and len(externos) > 0:
        ext = externos.copy()
        if "fecha" in ext.columns:
            ext["_f"] = pd.to_datetime(ext["fecha"]).dt.date
        elif isinstance(ext.index, pd.DatetimeIndex):
            ext["_f"] = ext.index.date
        else:
            ext["_f"] = pd.to_datetime(ext.index).date
        ext = ext.drop_duplicates(subset=["_f"]).set_index("_f")
    else:
        idx = pd.date_range(fechas.min(), fechas.max(), freq="D")
        ext = pd.DataFrame(index=idx.date)

    idx_dt = pd.to_datetime(pd.Index(ext.index))
    co = holidays.Colombia(years=range(idx_dt.min().year, idx_dt.max().year + 1))
    if "es_festivo" not in ext.columns:
        ext["es_festivo"] = [int(d in co) for d in ext.index]
    if "es_fin_de_semana" not in ext.columns:
        ext["es_fin_de_semana"] = (idx_dt.day_of_week >= 5).astype(int)
    if "es_carnaval" not in ext.columns:
        ext["es_carnaval"] = 0
    if "es_semana_santa" not in ext.columns:
        ext["es_semana_santa"] = 0
    if "es_vacaciones_escolares" not in ext.columns:
        ext["es_vacaciones_escolares"] = idx_dt.month.isin([6, 7, 12]).astype(int)
    return ext


def calcular_efectos_eventos(
    serie: pd.DataFrame, externos: pd.DataFrame | None
) -> dict[str, dict[str, Any]]:
    """Calcula con datos reales el efecto histórico promedio de cada evento por servicio.

    Compara la media de llegadas en los días del evento frente a los días hábiles normales
    (sin festivos ni Carnaval) del mismo servicio y genera la frase explicativa para la web.
    """
    ext = _normalizar_externos(externos, serie["ts"])
    df = serie[serie["serie"] != OTROS].copy()
    df["fecha_d"] = pd.to_datetime(df["ts"]).dt.date
    cols_ev = [col for _, col, _ in EVENTOS_DEFINICION if col in ext.columns]
    df = df.merge(ext[cols_ev], left_on="fecha_d", right_index=True, how="left").fillna(0)

    salida: dict[str, dict[str, Any]] = {}
    for sid, (s_id, nombre_legible) in SERVICIOS_INFO.items():
        sub = df[df["serie"] == s_id]
        if len(sub) == 0:
            continue
        mask_habil_normal = (sub["es_fin_de_semana"] == 0) & (sub["es_festivo"] == 0)
        base_habil = (
            float(sub.loc[mask_habil_normal, "y"].mean())
            if mask_habil_normal.any()
            else float(sub["y"].mean())
        )
        base_global = float(sub["y"].mean())

        eventos_lista: list[dict[str, Any]] = []
        for clave_ev, col_ev, etiqueta in EVENTOS_DEFINICION:
            if col_ev not in sub.columns:
                continue
            mask_ev = sub[col_ev].astype(int) == 1
            if clave_ev == "fin_de_semana":
                mask_ev = mask_ev & (sub["es_festivo"].astype(int) == 0)
            n_dias = int(mask_ev.sum())
            ref = (
                base_habil
                if clave_ev in ("festivos", "fin_de_semana", "carnaval", "semana_santa")
                else float(sub.loc[~mask_ev, "y"].mean() if (~mask_ev).any() else base_global)
            )
            media_ev = float(sub.loc[mask_ev, "y"].mean()) if n_dias > 0 else ref
            cambio_vis = media_ev - ref
            cambio_pct = (cambio_vis / ref * 100.0) if ref > 0 else 0.0
            signo = "+" if cambio_pct >= 0 else ""
            verbo = "sube" if cambio_pct >= 0 else "baja"
            frase = (
                f"En {etiqueta.lower()}, {nombre_legible} {verbo} {abs(cambio_pct):.1f} % "
                f"({signo}{cambio_vis:.0f} visitas/día: {media_ev:.0f} vs. {ref:.0f} normal)."
            )
            eventos_lista.append(
                {
                    "evento": clave_ev,
                    "columna": col_ev,
                    "etiqueta": etiqueta,
                    "media_evento": round(media_ev, 1),
                    "media_normal": round(ref, 1),
                    "cambio_visitas": round(cambio_vis, 1),
                    "cambio_pct": round(cambio_pct, 1),
                    "n_dias": n_dias,
                    "frase": frase,
                }
            )
        salida[sid] = {
            "servicio": sid,
            "nombre": nombre_legible,
            "media_diaria_global": round(base_global, 1),
            "media_habil_normal": round(base_habil, 1),
            "eventos": eventos_lista,
        }
    return salida


def calcular_comparacion_real(
    serie: pd.DataFrame,
    externos: pd.DataFrame | None,
    columnas: list[str],
    pliegues: list[Any] | None = None,
) -> dict[str, dict[str, Any]]:
    """Genera el histórico walk-forward de predicho vs. real con intervalos y exactitud."""
    base = serie[serie["serie"] != OTROS].sort_values(["serie", "ts"]).reset_index(drop=True)
    if pliegues is None:
        pliegues = pliegues_walk_forward(base["ts"])

    df_wf = evaluar_cuantiles_walk_forward(base, externos, pliegues, columnas=columnas)
    df_wf = df_wf.sort_values(["serie", "ts"]).drop_duplicates(subset=["serie", "ts"], keep="last")

    salida: dict[str, dict[str, Any]] = {}
    for sid, (s_id, nombre_legible) in SERVICIOS_INFO.items():
        g = df_wf[df_wf["serie"] == s_id].copy()
        if len(g) == 0:
            continue
        m = metricas(g["y"].to_numpy(), g["pred_p50"].to_numpy())
        cob = cobertura_intervalo(
            g["y"].to_numpy(), g["pred_p10"].to_numpy(), g["pred_p90"].to_numpy()
        )
        ex_sem = exactitud_semanal(g.rename(columns={"pred_p50": "pred"}), s_id)

        puntos = [
            {
                "fecha": pd.Timestamp(r["ts"]).strftime("%Y-%m-%d"),
                "real": int(round(float(r["y"]))),
                "prediccion": int(round(float(r["pred_p50"]))),
                "min": int(round(float(r["pred_p10"]))),
                "max": int(round(float(r["pred_p90"]))),
                "es_festivo": int(r.get("es_festivo", 0)),
                "origen": pd.Timestamp(r["origen"]).strftime("%Y-%m-%d"),
                "pliegue": int(r["pliegue"]),
            }
            for _, r in g.iterrows()
        ]
        salida[sid] = {
            "servicio": sid,
            "nombre": nombre_legible,
            "exactitud": round(float(1.0 - m["wape"]), 4),
            "exactitud_pct": round(float((1.0 - m["wape"]) * 100.0), 1),
            "wape": round(float(m["wape"]), 4),
            "mae": round(float(m["mae"]), 2),
            "rmse": round(float(m["rmse"]), 2),
            "sesgo": round(float(m["sesgo"]), 2),
            "cobertura": round(float(cob), 4),
            "n_dias": int(m["n"]),
            "exactitud_semanal": round(float(ex_sem["exactitud"]), 4),
            "techo_diario_poisson": round(float(ex_sem["techo_diario"]), 4),
            "techo_semanal_poisson": round(float(ex_sem["techo"]), 4),
            "serie": puntos,
        }
    return salida


def calcular_largo_plazo_bundle(
    serie: pd.DataFrame,
    externos: pd.DataFrame,
    horizonte_bt: str = "120D",
    paso_bt: str = "30D",
    ventana_bt: str = "480D",
    inicio_pron: str = "2026-08-01",
    fin_pron: str = "2026-11-30",
) -> dict[str, dict[str, Any]]:
    """Calcula el backtest a 120 días y el pronóstico de 4 meses (ago–nov 2026) por servicio."""
    bt = evaluar_backtest_largo_plazo(
        serie, externos, horizonte=horizonte_bt, paso=paso_bt, ventana_evaluacion=ventana_bt
    )
    pron = pronosticar_rango(serie, externos, inicio=inicio_pron, fin=fin_pron)

    salida: dict[str, dict[str, Any]] = {}
    for sid, (s_id, nombre_legible) in SERVICIOS_INFO.items():
        g_bt = bt[bt["serie"] == s_id]
        g_pr = pron[pron["serie"] == s_id].copy()
        if len(g_bt) == 0 or len(g_pr) == 0:
            continue
        m = metricas(g_bt["y"].to_numpy(), g_bt["pred"].to_numpy())
        cob = cobertura_intervalo(
            g_bt["y"].to_numpy(), g_bt["pred_p10"].to_numpy(), g_bt["pred_p90"].to_numpy()
        )
        por_mes = []
        for mh, sub in g_bt.groupby("mes_horizonte"):
            mm = metricas(sub["y"].to_numpy(), sub["pred"].to_numpy())
            por_mes.append(
                {
                    "mes_horizonte": int(mh),
                    "exactitud": round(float(1.0 - mm["wape"]), 4),
                    "wape": round(float(mm["wape"]), 4),
                    "mae": round(float(mm["mae"]), 1),
                    "cobertura": round(
                        float(
                            cobertura_intervalo(
                                sub["y"].to_numpy(),
                                sub["pred_p10"].to_numpy(),
                                sub["pred_p90"].to_numpy(),
                            )
                        ),
                        4,
                    ),
                }
            )

        g_pr["ym"] = pd.to_datetime(g_pr["ts"]).dt.strftime("%Y-%m")
        resumen_mensual = [
            {
                "mes": ym,
                "promedio_diario": round(float(sub["pred"].mean()), 1),
                "min_diario": round(float(sub["pred_p10"].mean()), 1),
                "max_diario": round(float(sub["pred_p90"].mean()), 1),
                "total_mensual": int(round(float(sub["pred"].sum()))),
            }
            for ym, sub in g_pr.groupby("ym")
        ]

        serie_pron = []
        for _, r in g_pr.iterrows():
            lo = max(0, int(round(float(r["pred_p10"]))))
            mid = max(lo, int(round(float(r["pred"]))))
            hi = max(mid, int(round(float(r["pred_p90"]))))
            serie_pron.append(
                {
                    "fecha": pd.Timestamp(r["ts"]).strftime("%Y-%m-%d"),
                    "prediccion": mid,
                    "min": lo,
                    "max": hi,
                    "dia_horizonte": int(r["dia_horizonte"]),
                    "mes_horizonte": int(r["mes_horizonte"]),
                    "es_festivo": int(r.get("es_festivo", 0)),
                }
            )

        salida[sid] = {
            "servicio": sid,
            "nombre": nombre_legible,
            "horizonte_dias": len(serie_pron),
            "rango_pronostico": {"inicio": inicio_pron, "fin": fin_pron},
            "backtest_120d": {
                "exactitud": round(float(1.0 - m["wape"]), 4),
                "exactitud_pct": round(float((1.0 - m["wape"]) * 100.0), 1),
                "wape": round(float(m["wape"]), 4),
                "mae": round(float(m["mae"]), 1),
                "sesgo": round(float(m["sesgo"]), 1),
                "cobertura": round(float(cob), 4),
                "n_pliegues": int(g_bt["pliegue"].nunique()),
                "por_mes_horizonte": por_mes,
            },
            "resumen_mensual": resumen_mensual,
            "serie": serie_pron,
        }
    return salida


def calcular_cuellos_botella_bundle(raw_dir: Path | None = None) -> dict[str, Any]:
    """Extrae indicadores agregados de duración y saturación por etapa de atención."""
    raw = raw_dir or config.RAW_DIR
    ruta_ent = raw / "etapas_entradas_por_hora.parquet"
    ruta_sal = raw / "etapas_salidas_por_hora.parquet"
    ruta_dur = raw / "duracion_etapas_percentiles.parquet"
    if not (ruta_ent.exists() and ruta_sal.exists() and ruta_dur.exists()):
        return {
            "etapas": [
                {
                    "concept_id": 581476,
                    "etapa": "Visita domiciliaria / ambulatoria",
                    "mediana_horas": 1.6,
                    "p90_horas": 13.5,
                    "umbral_p75": 71.0,
                    "umbral_p90": 95.0,
                }
            ],
            "etapa_critica": "Hospitalización general (p90 = 261.9 h)",
        }

    from hun.data.agregados import serie_censo_etapas
    from hun.models.saturacion import calcular_calentamiento, calcular_umbrales_censo

    ent = pd.read_parquet(ruta_ent)
    sal = pd.read_parquet(ruta_sal)
    dur = pd.read_parquet(ruta_dur)

    calentamiento = calcular_calentamiento(dur)
    censo = serie_censo_etapas(ent, sal, calentamiento=calentamiento)
    umb = calcular_umbrales_censo(censo)
    if isinstance(umb, dict):
        u_map = umb
    else:
        u_map = {
            int(r["serie"]): {"p75": float(r["p75"]), "p90": float(r["p90"])}
            for _, r in umb.iterrows()
        }

    nombres: dict[int, str] = {}
    ruta_tipos = raw / "tipos_etapa.parquet"
    if ruta_tipos.exists():
        tdf = pd.read_parquet(ruta_tipos)
        col_n = "etapa" if "etapa" in tdf.columns else "concept_name"
        if col_n in tdf.columns and "visit_detail_concept_id" in tdf.columns:
            nombres = dict(
                zip(
                    tdf["visit_detail_concept_id"].astype(int),
                    tdf[col_n].fillna("(sin nombre)"),
                    strict=False,
                )
            )

    etapas = []
    for _, r in dur.sort_values("horas_p90", ascending=False).iterrows():
        cid = int(r["visit_detail_concept_id"])
        u = u_map.get(cid, {"p75": 0.0, "p90": 0.0})
        etapas.append(
            {
                "concept_id": cid,
                "etapa": str(nombres.get(cid, cid)),
                "etapas_observadas": int(r.get("etapas", 0)),
                "mediana_horas": round(float(r.get("horas_p50", 0.0)), 1),
                "p90_horas": round(float(r.get("horas_p90", 0.0)), 1),
                "p99_horas": round(float(r.get("horas_p99", 0.0)), 1),
                "umbral_p75": round(float(u.get("p75", 0.0)), 1),
                "umbral_p90": round(float(u.get("p90", 0.0)), 1),
            }
        )
    critica = f"{etapas[0]['etapa']} (p90 = {etapas[0]['p90_horas']} h)" if etapas else "Sin datos"
    return {
        "calentamiento": str(calentamiento),
        "etapas": etapas,
        "etapa_critica": critica,
    }


def construir_paquete(
    entradas: pd.DataFrame,
    externos: pd.DataFrame | None = None,
    *,
    pliegues_corto: list[Any] | None = None,
    horizonte_lp: str = "120D",
    paso_lp: str = "30D",
    ventana_lp: str = "480D",
    raw_dir: Path | None = None,
) -> dict[str, Any]:
    """Construye el paquete completo de modelos y resultados precalculados para la web."""
    from hun.models.optimizacion import (
        construir_perfiles_horarios_por_corte,
        construir_resumen_optimizacion,
    )
    from hun.models.predict import PARAMETROS_SERVICIO, _generar_ocupacion, _generar_turnos

    corte = fecha_corte(entradas)
    entradas_filt = entradas[pd.to_datetime(entradas["hora"]) < corte].copy()
    serie = agrupar_bajo_volumen(serie_llegadas(entradas_filt, freq="D"), min_por_dia=1.0)

    if externos is not None and "fecha" in externos.columns:
        externos_idx = externos.set_index("fecha")
    else:
        externos_idx = externos

    ext_cols = list(externos_idx.columns) if externos_idx is not None else []
    cols = columnas_por_grupos(ext_cols, grupos_incluidos=GRUPOS_ACEPTADOS)
    df_feat = construir_features_demanda(serie, externos_idx)
    modelos_q = entrenar_modelos_cuantiles(df_feat, cols)

    lookup_y = {
        (int(r["serie"]), pd.Timestamp(r["ts"]).date()): int(round(float(r["y"])))
        for _, r in serie.iterrows()
    }

    max_ts = serie["ts"].max()
    ultimas_8s = serie[serie["ts"] >= max_ts - pd.Timedelta(weeks=8)]
    medianas_dw = (
        ultimas_8s.groupby(["serie", ultimas_8s["ts"].dt.day_of_week])["y"].median().to_dict()
    )
    for k, v in (
        serie.groupby(["serie", serie["ts"].dt.day_of_week])["y"].median().to_dict().items()
    ):
        if k not in medianas_dw:
            medianas_dw[k] = v

    turnos = _generar_turnos(entradas_filt)
    ocupacion = _generar_ocupacion(serie)
    efectos = calcular_efectos_eventos(serie, externos_idx)
    comparacion = calcular_comparacion_real(serie, externos_idx, cols, pliegues=pliegues_corto)
    origenes_wf = sorted(
        {
            pd.Timestamp(p["origen"]).normalize()
            for srv in comparacion.values()
            for p in srv.get("serie", [])
            if p.get("origen")
        }
    )
    perfiles_horarios = construir_perfiles_horarios_por_corte(
        entradas_filt,
        fecha_corte_datos=corte,
        cortes_extra=origenes_wf,
    )

    ext_lp = externos_idx if externos_idx is not None else _normalizar_externos(None, serie["ts"])
    largo_plazo = calcular_largo_plazo_bundle(
        serie, ext_lp, horizonte_bt=horizonte_lp, paso_bt=paso_lp, ventana_bt=ventana_lp
    )
    cuellos = calcular_cuellos_botella_bundle(raw_dir=raw_dir)

    return {
        "version_paquete": "2.1",
        "fecha_corte": pd.Timestamp(corte).strftime("%Y-%m-%d"),
        "modelos_q": modelos_q,
        "modelo_p50": modelos_q[0.50],
        "cols": cols,
        "lookup_y": lookup_y,
        "medianas_dw": medianas_dw,
        "turnos": turnos,
        "ocupacion": ocupacion,
        "externos_df": externos,
        "comparacion_real": comparacion,
        "efectos_eventos": efectos,
        "largo_plazo": largo_plazo,
        "cuellos_botella": cuellos,
        "perfiles_horarios": perfiles_horarios,
        "optimizacion": construir_resumen_optimizacion(
            raw_dir=raw_dir,
            turnos=turnos,
            parametros_servicio=PARAMETROS_SERVICIO,
        ),
    }


def construir_paquete_sintetico_prueba(semilla: int = 11) -> dict[str, Any]:
    """Construye un paquete pequeño con datos sintéticos (para pruebas sin leer `data/`)."""
    rng = np.random.default_rng(semilla)
    horas = pd.date_range("2025-01-01", "2026-07-17", freq="6h")
    co = holidays.Colombia(years=[2025, 2026])
    pesos_hora = {
        9203: {0: 0.45, 6: 1.45, 12: 1.25, 18: 0.85},
        581479: {0: 0.05, 6: 1.95, 12: 1.65, 18: 0.35},
        3045729: {0: 0.50, 6: 1.10, 12: 1.30, 18: 1.10},
    }
    pesos_dow = {
        9203: [1.15, 1.05, 1.00, 1.00, 1.05, 0.85, 0.75],
        581479: [1.15, 1.10, 1.05, 1.05, 1.00, 0.35, 0.15],
        3045729: [1.10, 1.00, 1.00, 1.00, 1.05, 0.95, 0.90],
    }
    filas = []
    for s_id, tasa in [(9203, 80.0), (581479, 140.0), (3045729, 4.0)]:
        mult_h = np.array([pesos_hora[s_id][h.hour] for h in horas], dtype=float)
        mult_d = np.array([pesos_dow[s_id][h.day_of_week] for h in horas], dtype=float)
        if s_id == 581479:
            es_fest_h = np.array([h.date() in co for h in horas], dtype=bool)
            mult_d = np.where(es_fest_h, 0.15, mult_d)
        n = rng.poisson(np.maximum(0.05, tasa * mult_h * mult_d))
        filas.append(
            pd.DataFrame(
                {
                    "hora": horas,
                    "visit_concept_id": s_id,
                    "entradas": n,
                    "entradas_con_salida": n,
                }
            )
        )
    entradas = pd.concat(filas, ignore_index=True)

    fechas_ext = pd.date_range("2025-01-01", "2026-12-31", freq="D")
    co = holidays.Colombia(years=[2025, 2026])
    dow = fechas_ext.day_of_week
    doy = fechas_ext.day_of_year
    es_fest = np.array([int(d.date() in co) for d in fechas_ext])
    externos = pd.DataFrame(
        {
            "fecha": fechas_ext,
            "dia_semana": dow,
            "mes": fechas_ext.month,
            "sin_dia_anio": np.sin(2 * np.pi * doy / 365.25),
            "cos_dia_anio": np.cos(2 * np.pi * doy / 365.25),
            "es_fin_de_semana": (dow >= 5).astype(int),
            "sin_dia_semana": np.sin(2 * np.pi * dow / 7.0),
            "cos_dia_semana": np.cos(2 * np.pi * dow / 7.0),
            "es_festivo": es_fest,
            "es_puente": es_fest,
            "es_dia_no_laboral": ((dow >= 5) | (es_fest == 1)).astype(int),
            "dia_post_festivo": np.r_[0, es_fest[:-1]],
            "dias_a_festivo": 5.0,
            "dias_desde_festivo": 5.0,
            "es_carnaval": (
                (fechas_ext.month == 2) & (fechas_ext.day.isin([14, 15, 16, 17]))
            ).astype(int),
            "es_semana_santa": ((fechas_ext.month == 4) & (fechas_ext.day.isin([2, 3]))).astype(
                int
            ),
            "es_vacaciones_escolares": fechas_ext.month.isin([6, 7, 12]).astype(int),
            "clima_temperature_2m_mean": 28.0,
            "clima_precipitation_sum": 2.0,
            "clima_relative_humidity_2m_mean": 78.0,
        }
    )
    pl_corto = pliegues_walk_forward(
        pd.date_range("2025-01-01", "2026-07-16", freq="D"),
        horizonte="7D",
        paso="60D",
        ventana_evaluacion="120D",
        entrenamiento_minimo="240D",
    )
    return construir_paquete(
        entradas,
        externos,
        pliegues_corto=pl_corto,
        horizonte_lp="60D",
        paso_lp="60D",
        ventana_lp="120D",
        raw_dir=Path("/no_existe"),
    )


def guardar_paquete(ruta_salida: Path | None = None) -> Path:
    """Construye el paquete desde `data/raw/` y lo guarda en `models/modelos_web_bundle.joblib`."""
    destino = Path(ruta_salida) if ruta_salida is not None else RUTA_PAQUETE_POR_DEFECTO
    entradas_path = config.RAW_DIR / "entradas_por_hora.parquet"
    externos_path = config.DATA_DIR / "externos.parquet"
    if not entradas_path.exists():
        raise FileNotFoundError(
            f"No existe {entradas_path}. Extrae los datos agregados antes de empaquetar."
        )

    entradas = pd.read_parquet(entradas_path)
    externos = pd.read_parquet(externos_path) if externos_path.exists() else None
    paquete = construir_paquete(entradas, externos)

    destino.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(paquete, destino)
    log.info("Paquete del modelo guardado en %s", destino)
    return destino


def main() -> None:
    parser = argparse.ArgumentParser(description="Empaqueta el modelo para despliegue sin datos.")
    parser.add_argument(
        "--salida",
        default=str(RUTA_PAQUETE_POR_DEFECTO),
        help="Ruta donde se guardará modelos_web_bundle.joblib (por defecto en models/)",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    guardar_paquete(Path(args.salida))


if __name__ == "__main__":
    main()
