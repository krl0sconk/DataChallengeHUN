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
OTROS = -1  # código de la serie que agrupa los tipos de visita de bajo volumen


def fecha_corte(
    entradas: pd.DataFrame, minimo: float = 0.25, ventana: int = 60, hueco: int = 7
) -> pd.Timestamp:
    """Primer instante SIN datos confiables (exclusivo): fin real de la base.

    Tras la fecha de corte quedan visitas sueltas (registros tardíos) que, en una grilla
    regular, se leerían como semanas de ceros. Un día es válido si tiene al menos `minimo`
    veces la mediana diaria de los `ventana` días previos. El corte es el último día válido
    anterior al primer hueco de `hueco` días inválidos seguidos (así los registros tardíos
    no cuentan aunque la mediana previa ya haya caído); si ese día quedó a medias (la última
    hora con datos es anterior a las 23:00) también se descarta.
    """
    e = entradas.assign(hora=pd.to_datetime(entradas["hora"]))
    diario = e.groupby(e["hora"].dt.floor("D"))["entradas"].sum()
    diario = diario.reindex(pd.date_range(diario.index.min(), diario.index.max()), fill_value=0)
    referencia = diario.rolling(ventana, min_periods=ventana).median().shift(1)
    malo = (diario < minimo * referencia).to_numpy()
    corrida = 0
    ultimo = diario.index[-1]
    for i, m in enumerate(malo):
        corrida = corrida + 1 if m else 0
        if corrida == hueco:
            ultimo = diario.index[i - hueco]
            break
    else:
        while malo[diario.index.get_loc(ultimo)]:
            ultimo -= pd.Timedelta("1D")
    horas = e.loc[e["hora"].dt.floor("D") == ultimo, "hora"]
    return ultimo + pd.Timedelta("1D") if horas.max().hour >= 23 else ultimo


def agrupar_bajo_volumen(df: pd.DataFrame, min_por_dia: float = 1.0) -> pd.DataFrame:
    """Suma en la serie `OTROS` los tipos con menos de `min_por_dia` llegadas diarias.

    Con tan pocas llegadas el WAPE de un tipo no significa nada (la mayoría de los días
    el real es 0). Se agrupan para no ensuciar el promedio y se reportan aparte.
    """
    dias = max((df["ts"].max() - df["ts"].min()) / pd.Timedelta("1D"), 1)
    prom = df.groupby("serie")["y"].sum() / dias
    bajos = prom[prom < min_por_dia].index
    if len(bajos) == 0:
        return df
    out = df.assign(serie=df["serie"].where(~df["serie"].isin(bajos), OTROS))
    return out.groupby(["ts", "serie"], as_index=False)["y"].sum()


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

    En la base real (inventario 2026-10-15) `visit_end_datetime` es igual a `visit_start_datetime`
    en todos los tipos de visita (mediana y p90 de duración = 0 h; el p99 no se extrajo): las
    salidas coinciden con las entradas hora a hora y este censo sale 0. Por eso el
    calentamiento por defecto no se cambia (30 días cubren con holgura medianas de hasta
    ~3 días de las etapas de `visit_detail`, pero su p99 sigue sin medirse); hay que revisarlo
    cuando el censo se calcule con `visit_detail`.
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


def serie_censo_etapas(
    entradas: pd.DataFrame, salidas: pd.DataFrame, calentamiento: str = "30D"
) -> pd.DataFrame:
    """Censo horario por tipo de ETAPA desde `etapas_entradas_por_hora` / `etapas_salidas_por_hora`.

    Es el censo que sí sirve en esta base (en `visit_occurrence` el fin es igual al inicio).
    La `serie` es `visit_detail_concept_id`: pacientes adentro de cada área a cada hora.
    Antes de fijar `calentamiento`, revisar el p99 de duración de las etapas en
    `docs/calidad_datos.md`.
    """
    renombrar = {"visit_detail_concept_id": "visit_concept_id"}
    return serie_censo(
        entradas.rename(columns=renombrar), salidas.rename(columns=renombrar), calentamiento
    )
