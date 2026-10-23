"""Extracciones agregadas de la base del hospital → `data/raw/*.parquet`.

Cada extracción es un archivo .sql versionado en `src/hun/data/sql/`. Aquí solo
se ejecutan y se guarda el resultado. Todo lo que se extrae son AGREGADOS
(conteos por hora, por mes, por tipo): ninguna fila individual de paciente.

Uso (con la VPN conectada y avisando en el grupo que te vas a conectar):
    python -m hun.data.extraer --lista
    python -m hun.data.extraer inventario            # 00-03 y 06: tamaños, cobertura, tipos, horas
    python -m hun.data.extraer flujo_horario          # 04-05: entradas y salidas por hora
    python -m hun.data.extraer auditoria              # 07-12: calidad de datos (tarea #12)
    python -m hun.data.extraer agregados              # 13-18: perfil, etapas y esperas (tarea #10)
    python -m hun.data.extraer flujo_horario --desde 2023-01-01 --hasta 2025-01-01

Las extracciones por ventana se hacen mes a mes: consultas cortas, que no saturan la
base y que, si algo falla a mitad, se pueden retomar (los meses ya bajados se saltan
salvo con --refrescar).
"""

from __future__ import annotations

import argparse
import logging
import time
from dataclasses import dataclass
from datetime import date

import pandas as pd

from hun import config
from hun.data.conexion import consultar, leer_sql

log = logging.getLogger("extraer")


@dataclass(frozen=True)
class Extraccion:
    nombre: str
    sql: str
    por_ventana: bool = False


EXTRACCIONES = {
    e.nombre: e
    for e in [
        Extraccion("tablas_tamano", "00_tablas_tamano.sql"),
        Extraccion("cobertura_mensual", "01_cobertura_mensual.sql"),
        Extraccion("tipos_visita", "02_tipos_visita.sql"),
        Extraccion("tipos_etapa", "03_tipos_etapa.sql"),
        Extraccion("precision_horas", "06_precision_horas.sql"),
        Extraccion("entradas_por_hora", "04_entradas_por_hora.sql", por_ventana=True),
        Extraccion("salidas_por_hora", "05_salidas_por_hora.sql", por_ventana=True),
        Extraccion("auditoria_nulos", "07_auditoria_nulos.sql"),
        Extraccion("auditoria_duplicados", "08_auditoria_duplicados.sql"),
        Extraccion("auditoria_etapas", "09_auditoria_etapas.sql"),
        Extraccion("auditoria_personas", "10_auditoria_personas.sql"),
        Extraccion("auditoria_llegadas_diarias", "11_auditoria_llegadas_diarias.sql"),
        Extraccion("auditoria_etapas_diarias", "12_auditoria_etapas_diarias.sql"),
        Extraccion("llegadas_diarias_perfil", "13_llegadas_diarias_perfil.sql", por_ventana=True),
        Extraccion("etapas_entradas_por_hora", "14_etapas_entradas_por_hora.sql", por_ventana=True),
        Extraccion("etapas_salidas_por_hora", "15_etapas_salidas_por_hora.sql", por_ventana=True),
        Extraccion("duracion_etapas_diaria", "16_duracion_etapas_diaria.sql", por_ventana=True),
        Extraccion("duracion_etapas_por_franja", "17_duracion_etapas_por_franja.sql"),
        Extraccion("transiciones_etapas", "18_transiciones_etapas.sql", por_ventana=True),
    ]
}

GRUPOS = {
    "inventario": [
        "tablas_tamano",
        "cobertura_mensual",
        "tipos_visita",
        "tipos_etapa",
        "precision_horas",
    ],
    "flujo_horario": ["entradas_por_hora", "salidas_por_hora"],
    "auditoria": [
        "auditoria_nulos",
        "auditoria_duplicados",
        "auditoria_etapas",
        "auditoria_personas",
        "auditoria_llegadas_diarias",
        "auditoria_etapas_diarias",
    ],
    "agregados": [
        "llegadas_diarias_perfil",
        "etapas_entradas_por_hora",
        "etapas_salidas_por_hora",
        "duracion_etapas_diaria",
        "duracion_etapas_por_franja",
        "transiciones_etapas",
    ],
}


def _meses(desde: date, hasta: date) -> list[tuple[pd.Timestamp, pd.Timestamp]]:
    inicios = pd.date_range(pd.Timestamp(desde).to_period("M").to_timestamp(), hasta, freq="MS")
    return [
        (max(i, pd.Timestamp(desde)), min(i + pd.offsets.MonthBegin(1), pd.Timestamp(hasta)))
        for i in inicios
    ]


def _rango_por_defecto() -> tuple[date, date]:
    """Usa la cobertura ya extraída; si no existe, la consulta (una consulta liviana)."""
    ruta = config.RAW_DIR / "cobertura_mensual.parquet"
    cobertura = pd.read_parquet(ruta) if ruta.exists() else ejecutar("cobertura_mensual")
    meses = pd.to_datetime(cobertura["mes"])
    return meses.min().date(), (meses.max() + pd.offsets.MonthBegin(1)).date()


def ejecutar(
    nombre: str, desde: date | None = None, hasta: date | None = None, refrescar: bool = False
) -> pd.DataFrame:
    ext = EXTRACCIONES[nombre]
    destino = config.RAW_DIR / f"{nombre}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)
    sql = leer_sql(ext.sql)

    if not ext.por_ventana:
        t0 = time.time()
        df = consultar(sql)
        df.to_parquet(destino, index=False)
        log.info("%s: %d filas en %.1fs → %s", nombre, len(df), time.time() - t0, destino.name)
        return df

    if desde is None or hasta is None:
        desde, hasta = _rango_por_defecto()
    partes_dir = config.RAW_DIR / f"{nombre}_partes"
    partes_dir.mkdir(exist_ok=True)
    for ini, fin in _meses(desde, hasta):
        parte = partes_dir / f"{ini:%Y-%m}.parquet"
        if parte.exists() and not refrescar:
            continue
        t0 = time.time()
        df = consultar(sql, {"desde": ini.to_pydatetime(), "hasta": fin.to_pydatetime()})
        df.to_parquet(parte, index=False)
        log.info("%s %s: %d filas en %.1fs", nombre, f"{ini:%Y-%m}", len(df), time.time() - t0)
    partes = sorted(partes_dir.glob("*.parquet"))
    total = pd.concat([pd.read_parquet(p) for p in partes], ignore_index=True)
    total.to_parquet(destino, index=False)
    log.info("%s: %d filas en total → %s", nombre, len(total), destino.name)
    return total


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "objetivos",
        nargs="*",
        help="extracciones o grupos (inventario, flujo_horario, auditoria, agregados)",
    )
    parser.add_argument("--desde", type=date.fromisoformat)
    parser.add_argument("--hasta", type=date.fromisoformat)
    parser.add_argument(
        "--refrescar", action="store_true", help="vuelve a bajar meses ya guardados"
    )
    parser.add_argument("--lista", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")

    if args.lista or not args.objetivos:
        print("Grupos:", ", ".join(f"{g} ({', '.join(v)})" for g, v in GRUPOS.items()))
        print("Extracciones:", ", ".join(EXTRACCIONES))
        return
    nombres = [n for o in args.objetivos for n in GRUPOS.get(o, [o])]
    for n in nombres:
        if n not in EXTRACCIONES:
            raise SystemExit(f"Extracción desconocida: {n}")
        ejecutar(n, args.desde, args.hasta, args.refrescar)


if __name__ == "__main__":
    main()
