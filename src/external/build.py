"""Construye data/externos.parquet: UNA fila por fecha con todos los factores
externos, lista para unir con el dataset del hospital por `fecha`.

Uso (desde la raíz del repo):
    python -m src.external.build                # todo
    python -m src.external.build --solo-calendario
    python -m src.external.build --refresh      # ignora caché de raw/

Si una fuente falla (sin internet, API caída), el build NO se cae: deja esas
columnas en NaN y lo reporta en el log y en externos_fuentes.json.
"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime

import pandas as pd

from . import calendario, clima, config, epidemiologia

log = logging.getLogger("externos")

DESCRIPCIONES = {
    "anio": "Año calendario",
    "mes": "Mes (1-12)",
    "dia_mes": "Día del mes",
    "dia_semana": "Día de la semana (0=lunes … 6=domingo)",
    "semana_iso": "Semana ISO",
    "dia_anio": "Día del año",
    "sin_dia_anio": "Seno del día del año (estacionalidad anual)",
    "cos_dia_anio": "Coseno del día del año",
    "sin_dia_semana": "Seno del día de la semana",
    "cos_dia_semana": "Coseno del día de la semana",
    "temporada_lluvias": "Meses de temporada de lluvias Caribe (abr-jun, sep-nov)",
    "temporada_navidad": "7 dic – 6 ene",
    "es_festivo": "Festivo nacional Colombia (Ley Emiliani aplicada)",
    "nombre_festivo": "Nombre del festivo",
    "es_fin_de_semana": "Sábado o domingo",
    "es_dia_no_laboral": "Festivo o fin de semana",
    "es_puente": "Día dentro de un bloque no laboral de 3+ días",
    "dia_post_festivo": "Primer día laboral después de un bloque no laboral (rebote de demanda)",
    "dias_a_festivo": "Días hasta el próximo festivo",
    "dias_desde_festivo": "Días desde el último festivo",
    "es_carnaval": "Carnaval de Barranquilla (sábado a martes antes de Miércoles de Ceniza)",
    "es_precarnaval": "Temporada de precarnaval (~5 semanas previas; aproximado)",
    "es_semana_santa": "Domingo de Ramos a Domingo de Resurrección",
    "dias_a_carnaval": "Días hasta el próximo Carnaval",
    "dias_desde_carnaval": "Días desde el último Carnaval",
    "es_vacaciones_escolares": "Vacaciones/receso estudiantil colegios oficiales (CSV manual)",
    "vacaciones_es_estimado": "1 si la fecha de vacaciones es estimada por regla, no oficial",
    "es_dia_pago": "Día de pago de quincena (15 y fin de mes, corrido al hábil anterior)",
    "dias_desde_pago": "Días desde el último pago de quincena",
    "semana_de_pago": "0-3 días después del pago",
    "es_mes_prima": "Junio o diciembre (pago de prima)",
    "fase_covid": "0 pre, 1 aislamiento obligatorio, 2 emergencia sanitaria, 3 post",
}
FUENTE_PREFIJO = {
    "clima_": "Open-Meteo Historical Weather API (ERA5)",
    "epi_": "SIVIGILA microdatos (INS)",
}


def diccionario(df: pd.DataFrame) -> pd.DataFrame:
    filas = []
    for c in df.columns:
        fuente = next(
            (v for k, v in FUENTE_PREFIJO.items() if c.startswith(k)),
            "Calendario (holidays + reglas + CSV manual)",
        )
        desc = DESCRIPCIONES.get(c, "")
        if c.startswith("epi_"):
            desc = "Casos notificados en la semana epi de hace N semanas (rezago anti-fuga)"
        elif c.startswith("clima_") and not desc:
            desc = "Variable diaria de clima (ver docs)"
        filas.append(
            {
                "columna": c,
                "tipo": str(df[c].dtype),
                "fuente": fuente,
                "descripcion": desc,
                "pct_nulos": round(100 * df[c].isna().mean(), 2),
            }
        )
    return pd.DataFrame(filas)


def build(solo_calendario: bool = False, refresh: bool = False) -> pd.DataFrame:
    estado = {"generado": datetime.now().isoformat(timespec="seconds"), "fuentes": {}}

    cal = calendario.build_calendario()
    idx = cal.index
    estado["fuentes"]["calendario"] = "ok"
    partes = [cal]

    if not solo_calendario:
        try:
            cl = clima.features_clima(clima.descargar_clima(refresh=refresh))
            partes.append(cl.reindex(idx))
            estado["fuentes"]["clima"] = f"ok ({cl.index.min().date()} a {cl.index.max().date()})"
        except Exception as e:  # noqa: BLE001
            log.warning("Clima no disponible: %s", e)
            estado["fuentes"]["clima"] = f"FALLÓ: {e}"
        try:
            ep = epidemiologia.build_epidemiologia(idx, refresh=refresh)
            partes.append(ep)
            estado["fuentes"]["epidemiologia"] = "ok"
        except Exception as e:  # noqa: BLE001
            log.warning("SIVIGILA no disponible: %s", e)
            estado["fuentes"]["epidemiologia"] = f"FALLÓ: {e}"

    df = pd.concat(partes, axis=1)
    df.index.name = "fecha"
    df = df.reset_index()

    config.OUTPUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(config.OUTPUT_PARQUET, index=False)
    diccionario(df.set_index("fecha")).to_csv(config.OUTPUT_DICT, index=False)
    (config.DATA_DIR / "externos_fuentes.json").write_text(
        json.dumps(estado, indent=2, ensure_ascii=False)
    )
    log.info("Escrito %s: %d filas x %d columnas", config.OUTPUT_PARQUET, *df.shape)
    for k, v in estado["fuentes"].items():
        log.info("  %-14s %s", k, v)
    return df


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--solo-calendario", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    a = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    build(solo_calendario=a.solo_calendario, refresh=a.refresh)


if __name__ == "__main__":
    main()
