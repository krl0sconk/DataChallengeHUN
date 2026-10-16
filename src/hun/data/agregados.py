"""Series de tiempo a partir de las extracciones agregadas (sin conexión a la base).

- `serie_llegadas`: llegadas por hora (o día) y tipo de visita, en una grilla REGULAR.
  Las horas sin llegadas no vienen en la extracción (un GROUP BY no devuelve ceros),
  así que se rellenan con 0. Sin este paso cualquier promedio queda sesgado hacia arriba.
- `serie_censo`: pacientes adentro por hora y tipo de visita, reconstruido como
  entradas acumuladas − salidas acumuladas. Es la medida directa de ocupación/saturación.

Formato largo en todo el proyecto: columnas `ts`, `serie`, `y`.
"""

from __future__ import annotations

import pandas as pd

COLUMNAS = ["ts", "serie", "y"]


def grilla_regular(df: pd.DataFrame, freq: str, inicio=None, fin=None) -> pd.DataFrame:
    """Completa con 0 todas las combinaciones (ts, serie) faltantes en [inicio, fin]."""
    df = df[COLUMNAS].copy()
    df["ts"] = pd.to_datetime(df["ts"]).dt.floor(freq)
    df = df.groupby(["ts", "serie"], as_index=False)["y"].sum()
    inicio = pd.Timestamp(inicio) if inicio is not None else df["ts"].min()
    fin = pd.Timestamp(fin) if fin is not None else df["ts"].max()
    indice = pd.MultiIndex.from_product(
        [pd.date_range(inicio, fin, freq=freq), sorted(df["serie"].unique())], names=["ts", "serie"]
    )
    return (
        df.set_index(["ts", "serie"])["y"]
        .reindex(indice, fill_value=0)
        .reset_index()
        .sort_values(["serie", "ts"], ignore_index=True)
    )


def serie_llegadas(entradas: pd.DataFrame, freq: str = "h", inicio=None, fin=None) -> pd.DataFrame:
    """Llegadas en grilla regular desde la extracción `entradas_por_hora`."""
    df = entradas.rename(columns={"hora": "ts", "visit_concept_id": "serie", "entradas": "y"})
    return grilla_regular(df, freq, inicio, fin)


def serie_censo(
    entradas: pd.DataFrame, salidas: pd.DataFrame, calentamiento: str = "30D"
) -> pd.DataFrame:
    """Censo horario por tipo de visita.

    Solo cuenta visitas con salida válida (`entradas_con_salida`) para que el censo no crezca
    sin límite por registros abiertos. Las visitas que empezaron antes del inicio de los datos
    y salen después aparecen como salidas sin entrada: el censo sale subestimado (incluso
    negativo) al comienzo. Por eso se descarta un periodo de `calentamiento`; debe ser mayor
    que casi todas las estancias (revisar el p99 de duración por tipo antes de fijarlo).
    """
    e = entradas.rename(
        columns={"hora": "ts", "visit_concept_id": "serie", "entradas_con_salida": "y"}
    )
    s = salidas.rename(columns={"hora": "ts", "visit_concept_id": "serie", "salidas": "y"})
    inicio = min(pd.to_datetime(e["ts"]).min(), pd.to_datetime(s["ts"]).min())
    fin = max(pd.to_datetime(e["ts"]).max(), pd.to_datetime(s["ts"]).max())
    ge = grilla_regular(e, "h", inicio, fin)
    gs = grilla_regular(s, "h", inicio, fin)
    df = ge.merge(gs, on=["ts", "serie"], how="outer", suffixes=("_in", "_out")).fillna(0)
    df = df.sort_values(["serie", "ts"], ignore_index=True)
    # Censo al final de cada hora: entradas acumuladas − salidas acumuladas.
    df["y"] = df.groupby("serie")["y_in"].cumsum() - df.groupby("serie")["y_out"].cumsum()
    df = df[df["ts"] >= inicio + pd.Timedelta(calentamiento)]
    return df[COLUMNAS].reset_index(drop=True)
