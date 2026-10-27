"""Modelado y monitoreo de saturación hospitalaria por etapa de atención.

Reconstruye la ocupación (censo horario) de cada área/etapa a partir de las entradas
y salidas registradas en `visit_detail`, define umbrales históricos de saturación (p75 y p90)
sin fuga de información, y clasifica el estado operativo en un semáforo (verde, amarillo, rojo).

Uso:
    python -m hun.models.saturacion
"""

from __future__ import annotations

import argparse
import logging
import math
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

import numpy as np
import pandas as pd

from hun import config
from hun.data.agregados import serie_censo_etapas

log = logging.getLogger("saturacion")

ColorSemaforo = Literal["verde", "amarillo", "rojo"]


def calcular_calentamiento(
    duraciones_df: pd.DataFrame | None = None,
    por_defecto: str = "30D",
) -> str:
    """Determina el periodo de calentamiento estrictamente mayor que el p99 de duración de etapas.

    Al reconstruir el censo como entradas acumuladas menos salidas acumuladas desde t0,
    las etapas iniciadas antes de t0 no tienen entrada registrada en la ventana;
    aparecen únicamente como salidas sin entrada previa, produciendo una subestimación del censo
    o incluso valores negativos al inicio de la serie. Tras superar el percentil 99 de duración
    (horas_p99) de las etapas, más del 99 % de los pacientes que estaban activos al inicio
    ya salieron y todas las estancias activas iniciaron dentro de la ventana de observación,
    por lo que el sesgo inicial desaparece y la serie converge a la ocupación real.

    Args:
        duraciones_df: DataFrame con estadísticas de duración que contenga la columna 'horas_p99'.
            Si es None o está vacío, se devuelve `por_defecto`.
        por_defecto: Periodo por defecto en formato compatible con pd.Timedelta (ej. '30D').

    Returns:
        Cadena con el periodo de calentamiento en días (ej. '31D', '15D').
    """
    if duraciones_df is None or duraciones_df.empty or "horas_p99" not in duraciones_df.columns:
        return por_defecto

    p99_max = duraciones_df["horas_p99"].dropna().max()
    if pd.isna(p99_max) or p99_max <= 0:
        return por_defecto

    dias = math.ceil(float(p99_max) / 24.0) + 1
    return f"{max(1, dias)}D"


def calcular_umbrales_censo(
    censo: pd.DataFrame,
    origen: pd.Timestamp | str | None = None,
    como_dict: bool = False,
) -> pd.DataFrame | dict[Any, dict[str, float]]:
    """Calcula los percentiles históricos del censo horario por etapa sin fuga de información.

    Solo se utilizan los registros con `ts < origen` (periodo de entrenamiento).
    Si `origen` es None, se calcula sobre toda la historia disponible en `censo`.

    Args:
        censo: DataFrame de censo en formato largo con columnas 'ts', 'serie' y 'y'.
        origen: Fecha/hora de corte que separa el pasado (entrenamiento) del futuro.
            Los datos a partir de `origen` se ignoran estrictamente.
        como_dict: Si es True, devuelve un diccionario estructurado por serie en vez de DataFrame.

    Returns:
        DataFrame con columnas ['serie', 'p50', 'p75', 'p90', 'max'] (o diccionario
        {serie: {'p50': ..., 'p75': ..., 'p90': ..., 'max': ...}} si como_dict es True).
    """
    df = censo.copy()
    if origen is not None:
        corte = pd.Timestamp(origen)
        df = df[pd.to_datetime(df["ts"]) < corte]

    columnas = ["serie", "p50", "p75", "p90", "max"]
    if df.empty:
        vacio = pd.DataFrame(columns=columnas)
        return {} if como_dict else vacio

    filas = []
    for serie_id, grupo in df.groupby("serie"):
        vals = grupo["y"].dropna()
        if len(vals) == 0:
            p50, p75, p90, m = 0.0, 0.0, 0.0, 0.0
        else:
            p50 = float(vals.quantile(0.50))
            p75 = float(vals.quantile(0.75))
            p90 = float(vals.quantile(0.90))
            m = float(vals.max())
        filas.append(
            {
                "serie": serie_id,
                "p50": p50,
                "p75": p75,
                "p90": p90,
                "max": m,
            }
        )

    resultado = pd.DataFrame(filas, columns=columnas).sort_values("serie", ignore_index=True)
    if como_dict:
        return {
            row["serie"]: {
                "p50": float(row["p50"]),
                "p75": float(row["p75"]),
                "p90": float(row["p90"]),
                "max": float(row["max"]),
            }
            for _, row in resultado.iterrows()
        }
    return resultado


def color_semaforo(censo: float, p75: float, p90: float) -> ColorSemaforo:
    """Determina la clasificación por semáforo para un valor de censo dado p75 y p90.

    Args:
        censo: Valor de censo u ocupación.
        p75: Umbral de advertencia (percentil 75).
        p90: Umbral de saturación crítica (percentil 90).

    Returns:
        'verde' si censo < p75,
        'amarillo' si p75 <= censo <= p90,
        'rojo' si censo > p90.
    """
    if censo > p90:
        return "rojo"
    if censo >= p75:
        return "amarillo"
    return "verde"


def color_semaforo_vectorizado(
    censo: pd.Series | np.ndarray,
    p75: float | pd.Series | np.ndarray,
    p90: float | pd.Series | np.ndarray,
) -> np.ndarray:
    """Versión vectorizada de color_semaforo para arrays o Series.

    Args:
        censo: Array o Serie con valores de censo.
        p75: Umbral(es) percentil 75.
        p90: Umbral(es) percentil 90.

    Returns:
        Array de cadenas ('verde', 'amarillo', 'rojo').
    """
    c = np.asarray(censo)
    u75 = np.asarray(p75)
    u90 = np.asarray(p90)
    condiciones = [c > u90, c >= u75]
    elecciones = ["rojo", "amarillo"]
    return np.select(condiciones, elecciones, default="verde")


def clasificar_censo(
    censo: pd.DataFrame,
    umbrales: pd.DataFrame | dict[Any, dict[str, float]],
) -> pd.DataFrame:
    """Clasifica cada registro de censo con su color de semáforo ('verde', 'amarillo', 'rojo').

    Args:
        censo: DataFrame con columnas 'ts', 'serie', 'y'.
        umbrales: DataFrame con columnas 'serie', 'p75', 'p90'
            o dict {serie: {'p75': ..., 'p90': ...}}.

    Returns:
        Copia de `censo` con columnas agregadas 'p75', 'p90' y 'color'.
    """
    if isinstance(umbrales, dict):
        filas = [{"serie": k, "p75": v["p75"], "p90": v["p90"]} for k, v in umbrales.items()]
        u_df = pd.DataFrame(filas)
    else:
        u_df = umbrales[["serie", "p75", "p90"]].copy()

    df = censo.merge(u_df, on="serie", how="left")
    df["color"] = color_semaforo_vectorizado(df["y"], df["p75"], df["p90"])
    return df


def resumen_diario_censo(
    censo: pd.DataFrame,
    umbrales: pd.DataFrame | dict[Any, dict[str, float]] | None = None,
) -> pd.DataFrame:
    """Calcula el resumen operativo diario de censo y horas en saturación por etapa.

    Por cada combinación de día y etapa calcula:
    - censo_max: Censo máximo alcanzado en el día.
    - censo_promedio: Promedio diario del censo.
    - horas_sobre_p75: Horas del día con censo >= p75 (amarillo o rojo).
    - horas_sobre_p90: Horas del día con censo > p90 (rojo / saturación crítica).
    - color_max: Peor nivel alcanzado en el día ('rojo', 'amarillo' o 'verde').

    Args:
        censo: DataFrame de censo (columnas 'ts', 'serie', 'y'). Si no contiene 'p75' y 'p90',
            debe proporcionarse `umbrales`.
        umbrales: DataFrame o dict con los umbrales p75 y p90 por serie.

    Returns:
        DataFrame con columnas: 'fecha', 'serie', 'censo_max', 'censo_promedio',
        'horas_sobre_p75', 'horas_sobre_p90', 'color_max'.
    """
    if "p75" not in censo.columns or "p90" not in censo.columns or "color" not in censo.columns:
        if umbrales is None:
            raise ValueError("Se requieren `umbrales` para clasificar el censo.")
        df = clasificar_censo(censo, umbrales)
    else:
        df = censo.copy()

    df["fecha"] = pd.to_datetime(df["ts"]).dt.floor("D")
    df["es_sobre_p75"] = (df["y"] >= df["p75"]).astype(int)
    df["es_sobre_p90"] = (df["y"] > df["p90"]).astype(int)

    resumen = df.groupby(["fecha", "serie"], as_index=False).agg(
        censo_max=("y", "max"),
        censo_promedio=("y", "mean"),
        horas_sobre_p75=("es_sobre_p75", "sum"),
        horas_sobre_p90=("es_sobre_p90", "sum"),
    )
    condiciones = [
        resumen["horas_sobre_p90"] > 0,
        resumen["horas_sobre_p75"] > 0,
    ]
    resumen["color_max"] = np.select(condiciones, ["rojo", "amarillo"], default="verde")
    return resumen.sort_values(["fecha", "serie"], ignore_index=True)


def reporte_markdown(
    duraciones_df: pd.DataFrame | None = None,
    umbrales_df: pd.DataFrame | None = None,
    resumen_diario_df: pd.DataFrame | None = None,
    nombres_etapas: dict[Any, str] | None = None,
    calentamiento: str = "30D",
) -> str:
    """Genera el reporte de saturación hospitalaria en formato Markdown.

    Si no se dispone de datos reales (DataFrames en None o vacíos), incluye la estructura
    metodológica completa y tablas con marcadores `TODO: completar con resultado real`
    (conforme a la regla 3 de AI.md).

    Args:
        duraciones_df: DataFrame con estadísticas de duración percentiles.
        umbrales_df: DataFrame con los umbrales de censo (p50, p75, p90, max).
        resumen_diario_df: DataFrame con el resumen diario por etapa.
        nombres_etapas: Diccionario mapeando serie / visit_detail_concept_id a nombre legible.
        calentamiento: Periodo de calentamiento utilizado.

    Returns:
        Texto en Markdown formateado.
    """
    nombres = nombres_etapas or {}
    ahora = f"{datetime.now():%Y-%m-%d %H:%M}"

    lineas = [
        "# Resultados · Saturación hospitalaria por etapa",
        "",
        f"_Generado automáticamente por `python -m hun.models.saturacion` el {ahora}. "
        "Solo métricas agregadas._",
        "",
        "- **Fuentes:** `etapas_entradas_por_hora.parquet`, `etapas_salidas_por_hora.parquet`, "
        "`duracion_etapas_percentiles.parquet`",
        "- **Reconstrucción del censo:** Entradas acumuladas − salidas acumuladas por etapa "
        "(`visit_detail_concept_id`).",
        f"- **Periodo de calentamiento:** `{calentamiento}` "
        "(estrictamente superior al percentil 99 de duración).",
        "",
        "## 1. Justificación del calentamiento del censo",
        "",
        "Al reconstruir el censo horario como entradas acumuladas menos salidas acumuladas a "
        "partir del primer instante observado ($t_0$), las estancias que iniciaron antes de $t_0$ "
        "no cuentan con un registro de entrada dentro de la ventana de análisis. Al momento en que "
        "dichos pacientes egresan, se contabilizan únicamente como salidas, lo que genera una "
        "subestimación del censo o incluso valores negativos durante los primeros días de la "
        "serie.",
        "",
        "Tras superar el percentil 99 de duración ($p_{99}$) de las etapas, más del 99 % de los "
        "pacientes hospitalizados al inicio de la ventana ya han egresado, y la totalidad de los "
        "pacientes activos ingresaron dentro del periodo observado. En consecuencia, el sesgo "
        "inicial desaparece por completo y el censo reconstruido converge a la ocupación real "
        "del hospital.",
        "",
        "## 2. Duración de etapas y calentamiento determinado",
        "",
        "Distribución histórica de duración por tipo de etapa (excluyendo registros sin fecha de "
        "egreso o con fin anterior al inicio):",
        "",
    ]

    # Tabla 1: Duración de etapas
    lineas.extend(
        [
            "| Etapa | Concept ID | Etapas observadas | p50 (h) | p90 (h) | p99 (h) | Máx (h) |",
            "|---|---|---|---|---|---|---|",
        ]
    )
    if duraciones_df is None or duraciones_df.empty:
        lineas.append(
            "| TODO: completar con resultado real | TODO | TODO | TODO | TODO | TODO | TODO |"
        )
    else:
        for _, row in duraciones_df.iterrows():
            cid = row["visit_detail_concept_id"]
            nombre = nombres.get(cid, str(cid))
            etapas = (
                f"{int(row['etapas']):,}" if "etapas" in row and pd.notna(row["etapas"]) else "N/A"
            )
            p50 = (
                f"{float(row['horas_p50']):.1f}"
                if "horas_p50" in row and pd.notna(row["horas_p50"])
                else "N/A"
            )
            p90 = (
                f"{float(row['horas_p90']):.1f}"
                if "horas_p90" in row and pd.notna(row["horas_p90"])
                else "N/A"
            )
            p99 = (
                f"{float(row['horas_p99']):.1f}"
                if "horas_p99" in row and pd.notna(row["horas_p99"])
                else "N/A"
            )
            m = (
                f"{float(row['horas_max']):.1f}"
                if "horas_max" in row and pd.notna(row["horas_max"])
                else "N/A"
            )
            lineas.append(f"| {nombre} | {cid} | {etapas} | {p50} | {p90} | {p99} | {m} |")

    lineas.extend(
        [
            "",
            "## 3. Umbrales históricos de saturación (entrenamiento)",
            "",
            "Percentiles calculados exclusivamente con datos de entrenamiento "
            "($t < \\text{origen}$) para evitar fuga de información:",
            "",
            "- **Verde (Normal):** $\\text{censo} < p_{75}$",
            "- **Amarillo (Alerta preventiva):** $p_{75} \\le \\text{censo} \\le p_{90}$",
            "- **Rojo (Saturación crítica):** $\\text{censo} > p_{90}$",
            "",
            "| Etapa | Concept ID | Mediana (p50) | Preventivo (p75) | Crítico (p90) | "
            "Máx histórico |",
            "|---|---|---|---|---|---|",
        ]
    )

    # Tabla 2: Umbrales
    if umbrales_df is None or umbrales_df.empty:
        lineas.append("| TODO: completar con resultado real | TODO | TODO | TODO | TODO | TODO |")
    else:
        for _, row in umbrales_df.iterrows():
            cid = row["serie"]
            nombre = nombres.get(cid, str(cid))
            p50 = f"{float(row['p50']):.1f}"
            p75 = f"{float(row['p75']):.1f}"
            p90 = f"{float(row['p90']):.1f}"
            m = f"{float(row['max']):.1f}"
            lineas.append(f"| {nombre} | {cid} | {p50} | {p75} | {p90} | {m} |")

    lineas.extend(
        [
            "",
            "## 4. Resumen operativo diario de saturación",
            "",
            "Comportamiento de la ocupación diaria agregada por etapa:",
            "",
            "| Etapa | Concept ID | Días observados | Censo máx promedio | Horas/día amarillo | "
            "Horas/día rojo | % Días alerta roja |",
            "|---|---|---|---|---|---|---|",
        ]
    )

    # Tabla 3: Resumen diario
    if resumen_diario_df is None or resumen_diario_df.empty:
        lineas.append(
            "| TODO: completar con resultado real | TODO | TODO | TODO | TODO | TODO | TODO |"
        )
    else:
        for cid, g in resumen_diario_df.groupby("serie"):
            nombre = nombres.get(cid, str(cid))
            dias = len(g)
            censo_max_prom = f"{g['censo_max'].mean():.1f}"
            horas_amarillo_prom = f"{(g['horas_sobre_p75'] - g['horas_sobre_p90']).mean():.1f}"
            horas_rojo_prom = f"{g['horas_sobre_p90'].mean():.1f}"
            pct_rojo = f"{(g['color_max'] == 'rojo').mean():.1%}"
            lineas.append(
                f"| {nombre} | {cid} | {dias} | {censo_max_prom} | "
                f"{horas_amarillo_prom} | {horas_rojo_prom} | {pct_rojo} |"
            )

    lineas.append("")
    return "\n".join(lineas)


def main() -> None:
    """Punto de entrada de línea de comandos para saturación hospitalaria."""
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--origen",
        help="Fecha/hora de corte para umbrales de entrenamiento (AAAA-MM-DD o ISO).",
    )
    parser.add_argument(
        "--salida",
        default=str(config.ROOT_DIR / "docs/resultados/saturacion.md"),
        help="Ruta donde se escribirá el reporte markdown.",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    ruta_entradas = config.RAW_DIR / "etapas_entradas_por_hora.parquet"
    ruta_salidas = config.RAW_DIR / "etapas_salidas_por_hora.parquet"
    ruta_duraciones = config.RAW_DIR / "duracion_etapas_percentiles.parquet"

    archivos_presentes = (
        ruta_entradas.exists() and ruta_salidas.exists() and ruta_duraciones.exists()
    )

    if archivos_presentes:
        log.info("Cargando extracciones agregadas de etapas...")
        entradas = pd.read_parquet(ruta_entradas)
        salidas = pd.read_parquet(ruta_salidas)
        duraciones = pd.read_parquet(ruta_duraciones)

        calentamiento = calcular_calentamiento(duraciones)
        log.info("Periodo de calentamiento determinado: %s", calentamiento)

        censo = serie_censo_etapas(entradas, salidas, calentamiento=calentamiento)
        umbrales_df = calcular_umbrales_censo(censo, origen=args.origen)
        if isinstance(umbrales_df, dict):
            u_df = pd.DataFrame([{"serie": k, **v} for k, v in umbrales_df.items()])
        else:
            u_df = umbrales_df
        resumen = resumen_diario_censo(censo, u_df)

        # Cargar nombres de etapas si existen
        nombres = {}
        for p in [
            config.RAW_DIR / "tipos_etapa.parquet",
            config.RAW_DIR / "tipos_visita.parquet",
        ]:
            if p.exists():
                tdf = pd.read_parquet(p)
                col_id = (
                    "visit_detail_concept_id"
                    if "visit_detail_concept_id" in tdf.columns
                    else "visit_concept_id"
                )
                col_name = (
                    "etapa"
                    if "etapa" in tdf.columns
                    else ("concept_name" if "concept_name" in tdf.columns else None)
                )
                if col_name and col_id in tdf.columns:
                    nombres.update(
                        dict(
                            zip(
                                tdf[col_id],
                                tdf[col_name].fillna("(sin nombre)"),
                                strict=False,
                            )
                        )
                    )

        md = reporte_markdown(duraciones, u_df, resumen, nombres, calentamiento)
        log.info("Cálculo completo realizado.")
    else:
        log.info(
            "Archivos de etapas no encontrados en data/raw/; "
            "generando plantilla con marcadores TODO."
        )
        md = reporte_markdown(None, None, None, None, calentamiento="30D")

    salida_path = Path(args.salida)
    salida_path.parent.mkdir(parents=True, exist_ok=True)
    salida_path.write_text(md, encoding="utf-8")
    log.info("Reporte escrito en %s", salida_path)


if __name__ == "__main__":
    main()
