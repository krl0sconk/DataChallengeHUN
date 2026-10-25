"""Línea base: promedio del mismo día de la semana y la misma hora en semanas anteriores.

Es el modelo "de sentido común" que cualquier persona del hospital haría a mano
("los lunes a las 8 pm llegan unos 30"). Todo modelo posterior (Poisson, LightGBM,
con o sin factores externos) tiene que superarla en la misma validación walk-forward;
si no la supera, no aporta.

Sin fuga de información: para predecir un instante `t` desde el origen `o`, solo se usan
semanas completas anteriores al origen (t − 7·j días, con t − 7·j < o).

Uso (con la extracción `entradas_por_hora` ya en data/raw/):
    python -m hun.models.linea_base                  # escribe docs/resultados/linea_base.md
    python -m hun.models.linea_base --semanas 1 4 8  # compara cuántas semanas promediar
"""

from __future__ import annotations

import argparse
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from hun.models.validacion import Pliegue, pliegues_walk_forward, resumir

log = logging.getLogger("linea_base")
SEMANA = pd.Timedelta("7D")


def predecir(
    historia: pd.DataFrame,
    ts_objetivo: pd.Series | pd.DatetimeIndex,
    origen: pd.Timestamp,
    semanas: int = 4,
    estadistico: str = "media",
) -> pd.DataFrame:
    """Predice para cada serie de `historia` los instantes `ts_objetivo` (todos ≥ origen).

    `historia`: formato largo (`ts`, `serie`, `y`) en grilla regular, con datos < origen.
    Devuelve (`ts`, `serie`, `pred`). Si una serie no tiene ninguna semana previa
    disponible, la predicción queda en NaN (se reporta, no se inventa).
    """
    historia = historia[historia["ts"] < origen]
    ancho = historia.pivot(index="ts", columns="serie", values="y")
    ts_objetivo = pd.DatetimeIndex(pd.to_datetime(ts_objetivo)).unique().sort_values()

    # Primera semana utilizable para cada t: la menor j con t − 7j < origen.
    j0 = np.ceil(((ts_objetivo - origen) / SEMANA) + 1e-9).astype(int)
    j0 = np.maximum(j0, 1)
    rezagos = []
    for k in range(semanas):
        ts_pasado = ts_objetivo - (j0 + k) * SEMANA
        rezagos.append(ancho.reindex(ts_pasado).to_numpy())
    pila = np.stack(rezagos)  # semanas × tiempos × series
    with np.errstate(all="ignore"):
        if estadistico == "mediana":
            pred = np.nanmedian(pila, axis=0)
        else:
            pred = np.nanmean(pila, axis=0)
    salida = pd.DataFrame(pred, index=ts_objetivo, columns=ancho.columns)
    salida.index.name = "ts"
    return salida.reset_index().melt(id_vars="ts", var_name="serie", value_name="pred")


def evaluar(
    serie: pd.DataFrame, pliegues: list[Pliegue], semanas: int = 4, estadistico: str = "media"
) -> pd.DataFrame:
    """Predicciones de la línea base en todos los pliegues (una fila por ts × serie × pliegue)."""
    partes = []
    for p in pliegues:
        prueba = p.prueba(serie)
        pred = predecir(p.entrenamiento(serie), prueba["ts"], p.origen, semanas, estadistico)
        r = prueba.merge(pred, on=["ts", "serie"], how="left")
        r["pliegue"] = p.numero
        r["origen"] = p.origen
        r["dia_horizonte"] = ((r["ts"] - p.origen) // pd.Timedelta("1D")).astype(int) + 1
        partes.append(r)
    return pd.concat(partes, ignore_index=True)


def reporte_markdown(
    resultados: dict[str, pd.DataFrame],
    nombres_series: dict | None,
    frecuencia: str,
    pliegues: list[Pliegue],
    ruta_entrada: str,
) -> str:
    """Reporte SOLO con métricas agregadas (se puede versionar)."""
    nombres_series = nombres_series or {}
    lineas = [
        "# Resultados · Línea base",
        "",
        f"_Generado automáticamente por `python -m hun.models.linea_base` el "
        f"{datetime.now():%Y-%m-%d %H:%M}. Solo métricas agregadas._",
        "",
        f"- **Datos:** `{ruta_entrada}` · frecuencia `{frecuencia}`",
        f"- **Validación:** walk-forward, {len(pliegues)} pliegues, origen "
        f"{pliegues[0].origen:%Y-%m-%d} → {pliegues[-1].origen:%Y-%m-%d}, horizonte 7 días.",
        "- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.",
        "",
        "## Cuántas semanas promediar",
        "",
        "| Variante | WAPE | MAE | RMSE | Sesgo |",
        "|---|---|---|---|---|",
    ]
    for nombre, r in resultados.items():
        m = resumir(r.dropna(subset=["pred"])).iloc[0]
        lineas.append(f"| {nombre} | {m.wape:.1%} | {m.mae:.2f} | {m.rmse:.2f} | {m.sesgo:+.2f} |")

    mejor = min(resultados, key=lambda n: resumir(resultados[n].dropna(subset=["pred"])).wape[0])
    r = resultados[mejor].dropna(subset=["pred"])
    lineas += [
        "",
        f"**Línea base elegida:** {mejor}. Es la referencia que el modelo debe superar.",
        "",
    ]

    lineas += [
        "## Por tipo de visita",
        "",
        "| Serie | WAPE | MAE | Promedio real |",
        "|---|---|---|---|",
    ]
    por_serie = resumir(r, ["serie"]).merge(
        r.groupby("serie")["y"].mean().rename("prom").reset_index(), on="serie"
    )
    for _, f in por_serie.sort_values("prom", ascending=False).iterrows():
        nombre = nombres_series.get(f.serie, f.serie)
        lineas.append(f"| {nombre} | {f.wape:.1%} | {f.mae:.2f} | {f.prom:.2f} |")

    lineas += ["", "## Por día del horizonte", "", "| Día | WAPE | MAE |", "|---|---|---|"]
    for _, f in resumir(r, ["dia_horizonte"]).iterrows():
        lineas.append(f"| {int(f.dia_horizonte)} | {f.wape:.1%} | {f.mae:.2f} |")

    lineas += [
        "",
        "## Estabilidad entre pliegues",
        "",
        "| Pliegue | Origen | WAPE |",
        "|---|---|---|",
    ]
    for _, f in resumir(r, ["pliegue", "origen"]).iterrows():
        lineas.append(f"| {int(f.pliegue)} | {pd.Timestamp(f.origen):%Y-%m-%d} | {f.wape:.1%} |")
    return "\n".join(lineas) + "\n"


def main() -> None:
    from hun import config
    from hun.data.agregados import OTROS, agrupar_bajo_volumen, fecha_corte, serie_llegadas

    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--entrada", default=str(config.RAW_DIR / "entradas_por_hora.parquet"))
    parser.add_argument(
        "--frecuencia",
        default="h",
        choices=["h", "D"],
        help="h: llegadas por hora · D: llegadas por día",
    )
    parser.add_argument(
        "--hasta", help="fin exclusivo de los datos (AAAA-MM-DD); por defecto se detecta el corte"
    )
    parser.add_argument(
        "--min-por-dia",
        type=float,
        default=1.0,
        help="tipos con menos llegadas diarias que esto se agrupan en 'Otros'",
    )
    parser.add_argument("--semanas", type=int, nargs="+", default=[1, 4, 8])
    parser.add_argument("--salida", default=str(config.ROOT_DIR / "docs/resultados/linea_base.md"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    entradas = pd.read_parquet(args.entrada)
    corte = pd.Timestamp(args.hasta) if args.hasta else fecha_corte(entradas)
    entradas = entradas[pd.to_datetime(entradas["hora"]) < corte]
    log.info("Datos hasta %s (exclusivo)", f"{corte:%Y-%m-%d %H:%M}")
    serie = agrupar_bajo_volumen(serie_llegadas(entradas, freq=args.frecuencia), args.min_por_dia)
    pliegues = pliegues_walk_forward(serie["ts"])
    nombres = None
    tipos = config.RAW_DIR / "tipos_visita.parquet"
    if tipos.exists():
        t = pd.read_parquet(tipos)
        nombres = dict(
            zip(t["visit_concept_id"], t["concept_name"].fillna("(sin nombre)"), strict=False)
        )

    if nombres is not None:
        nombres[OTROS] = f"Otros (< {args.min_por_dia:g} llegadas/día, agrupados)"
    resultados = {}
    for k in args.semanas:
        resultados[f"media de {k} semana{'s' if k > 1 else ''}"] = evaluar(serie, pliegues, k)
    resultados[f"mediana de {max(args.semanas)} semanas"] = evaluar(
        serie, pliegues, max(args.semanas), "mediana"
    )

    texto = reporte_markdown(
        resultados, nombres, args.frecuencia, pliegues, Path(args.entrada).name
    )
    Path(args.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(args.salida).write_text(texto, encoding="utf-8")
    log.info(texto)
    log.info("Reporte guardado en %s", args.salida)


if __name__ == "__main__":
    main()
