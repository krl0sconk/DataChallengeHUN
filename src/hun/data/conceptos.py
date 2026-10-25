"""Traducción de `concept_id` (OMOP) a nombres legibles (tarea #11).

Fuente: la tabla `concept` de la propia base, bajada con
`python -m hun.data.extraer conceptos` (consultas 19-22: solo vocabulario y frecuencias).
`python -m hun.data.conceptos` une esas extracciones en `data/processed/conceptos.parquet`
(no se versiona). Si todavía no existe, se usan los nombres conocidos de `NOMBRES_ES`.

Uso:
    from hun.data.conceptos import traducir
    df = traducir(df, ["visit_concept_id", "visit_detail_concept_id"])
    # agrega visit_concept_nombre y visit_detail_concept_nombre
"""

from __future__ import annotations

import logging

import pandas as pd

from hun import config

log = logging.getLogger("conceptos")

EXTRACCIONES = [
    "conceptos_visitas",
    "conceptos_diagnosticos",
    "conceptos_procedimientos",
    "conceptos_mediciones",
]
DESTINO = config.PROCESSED_DIR / "conceptos.parquet"

# Nombres en español para lo que ve el usuario final (dashboard y web). Los ids de visita salen
# del inventario (docs/objetivo_prediccion.md); los de sexo son los estándar de OMOP.
NOMBRES_ES: dict[int, str] = {
    581479: "Rehabilitación ambulatoria",
    9203: "Urgencias",
    3045729: "Urgencias - tratamiento",
    9201: "Hospitalización",
    0: "Sin concepto",
    -1: "Otros",  # agregados.OTROS (tipos de bajo volumen) y fin de visita en transiciones
    8507: "Masculino",
    8532: "Femenino",
}


def construir() -> pd.DataFrame:
    """Une las extracciones de conceptos en una tabla de mapeo y la guarda en `DESTINO`."""
    partes = []
    for nombre in EXTRACCIONES:
        ruta = config.RAW_DIR / f"{nombre}.parquet"
        if ruta.exists():
            partes.append(pd.read_parquet(ruta))
        else:
            log.warning("Falta %s: corre `python -m hun.data.extraer conceptos`", ruta.name)
    if not partes:
        raise FileNotFoundError("No hay extracciones de conceptos en data/raw/.")
    df = pd.concat(partes, ignore_index=True)
    df["nombre_es"] = df["concept_id"].map(NOMBRES_ES)
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(DESTINO, index=False)
    return df


def cargar(tabla: pd.DataFrame | None = None) -> pd.Series:
    """Serie `concept_id → nombre`. Prioriza el nombre en español y luego el de OMOP."""
    if tabla is None:
        tabla = pd.read_parquet(DESTINO) if DESTINO.exists() else pd.DataFrame()
    mapa = pd.Series(NOMBRES_ES, dtype="object")
    if not tabla.empty:
        omop = tabla.dropna(subset=["concept_name"]).drop_duplicates("concept_id")
        omop = omop.set_index("concept_id")["concept_name"]
        mapa = pd.concat([mapa, omop[~omop.index.isin(mapa.index)]])
    return mapa


def traducir(
    df: pd.DataFrame, columnas: list[str] | str, mapa: pd.Series | None = None
) -> pd.DataFrame:
    """Agrega `<columna sin _id>_nombre` por cada columna de ids. Los ids sin nombre quedan
    como "Concepto <id>" para que nunca se vea un vacío en una gráfica."""
    mapa = cargar() if mapa is None else mapa
    out = df.copy()
    for col in [columnas] if isinstance(columnas, str) else columnas:
        nombre = col.removesuffix("_id") + "_nombre"
        out[nombre] = out[col].map(mapa)
        faltan = out[nombre].isna() & out[col].notna()
        out.loc[faltan, nombre] = "Concepto " + out.loc[faltan, col].astype("Int64").astype(str)
    return out


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    tabla = construir()
    print(f"{len(tabla)} conceptos → {DESTINO}")
    print(tabla.groupby("columna").size().to_string())
