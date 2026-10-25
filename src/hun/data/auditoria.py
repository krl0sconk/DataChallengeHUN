"""Auditoría de calidad de los datos del hospital (tarea #12).

Trabaja SOLO sobre las extracciones agregadas de `python -m hun.data.extraer auditoria`
(conteos por tabla, por tipo y por día). No se conecta a la base ni ve filas de pacientes.

Qué responde:
1. Nulos, duplicados y fechas imposibles (`resumen_nulos`, `resumen_duplicados`, `resumen_etapas`).
2. ¿Las fechas están corridas por la anonimización? (`prueba_desplazamiento`).
   Idea: en rehabilitación (citas programadas) los festivos entre semana deben verse como un
   hueco. Se mide el volumen de cada festivo frente al mismo día de la semana en las semanas
   vecinas, corriendo los festivos k días. Si las fechas son reales, el hueco más hondo está en
   k = 0; si la anonimización corrió las fechas d días, aparece en k = d.
3. Perfil alrededor de Carnaval y fin de año (`perfil_evento`), para contrastar con lo esperado.
"""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd

# Umbrales de alerta: por encima de estos porcentajes el chequeo se marca para revisar.
ALERTA_PCT = 1.0  # % de filas con el problema
COLUMNAS_TRAMOS = [
    "duracion_cero",
    "menos_5_min",
    "de_5_min_a_1_h",
    "de_1_a_6_h",
    "de_6_a_24_h",
    "de_1_a_3_d",
    "de_3_a_7_d",
    "de_7_a_30_d",
    "mas_30_d",
]
PROBLEMAS_ETAPAS = ["huerfanas", "sin_fin", "fin_antes_de_inicio", "antes_de_la_visita", "mas_30_d"]


# --------------------------------------------------------------------------- tablas resumen
def resumen_nulos(nulos: pd.DataFrame) -> pd.DataFrame:
    """Agrega `pct_nulos` y `alerta` a la salida de `auditoria_nulos`."""
    out = nulos.copy()
    out["pct_nulos"] = 100 * out["nulos"] / out["filas"].where(out["filas"] > 0)
    out["alerta"] = out["pct_nulos"] > ALERTA_PCT
    return out.sort_values(["tabla", "pct_nulos"], ascending=[True, False], ignore_index=True)


def resumen_duplicados(duplicados: pd.DataFrame, filas_por_tabla: dict[str, int]) -> pd.DataFrame:
    """Agrega el % de copias sobrantes sobre el total de filas de cada tabla."""
    out = duplicados.copy()
    total = out["tabla"].map(filas_por_tabla)
    out["pct_sobrante"] = 100 * out["copias_sobrantes"] / total.where(total > 0)
    out["alerta"] = out["copias_sobrantes"] > 0
    return out


def resumen_etapas(etapas: pd.DataFrame) -> pd.DataFrame:
    """Porcentaje de cada problema por tipo de etapa y visita padre (de `auditoria_etapas`)."""
    out = etapas.copy()
    base = out["etapas"].where(out["etapas"] > 0)
    for c in PROBLEMAS_ETAPAS + [c for c in COLUMNAS_TRAMOS if c not in PROBLEMAS_ETAPAS]:
        out[f"pct_{c}"] = 100 * out[c] / base
    pct_problemas = out[[f"pct_{c}" for c in PROBLEMAS_ETAPAS]]
    out["alertas"] = pct_problemas.gt(ALERTA_PCT).apply(
        lambda fila: ", ".join(c.removeprefix("pct_") for c, v in fila.items() if v), axis=1
    )
    return out


def tramos_largos(etapas: pd.DataFrame) -> pd.DataFrame:
    """Distribución de duraciones (en %) en formato largo, lista para graficar."""
    largo = etapas.melt(
        id_vars=["visit_detail_concept_id", "visit_concept_id"],
        value_vars=COLUMNAS_TRAMOS,
        var_name="tramo",
        value_name="n",
    )
    total = largo.groupby(["visit_detail_concept_id", "visit_concept_id"])["n"].transform("sum")
    largo["pct"] = 100 * largo["n"] / total.where(total > 0)
    largo["tramo"] = pd.Categorical(largo["tramo"], COLUMNAS_TRAMOS, ordered=True)
    return largo


# --------------------------------------------------------------------------- series diarias
def serie_diaria(df: pd.DataFrame, tipo: int, col_tipo: str, col_valor: str) -> pd.Series:
    """Serie diaria de un tipo, con los días sin registros rellenados en 0."""
    s = df.loc[df[col_tipo] == tipo].set_index(
        pd.to_datetime(df.loc[df[col_tipo] == tipo, "fecha"])
    )
    s = s[col_valor].astype(float).sort_index()
    if s.empty:
        return s
    return s.reindex(pd.date_range(s.index.min(), s.index.max(), freq="D"), fill_value=0.0)


def relativo_semanas_vecinas(
    diario: pd.Series, semanas: int = 3, minimo_referencia: float = 0.1
) -> pd.Series:
    """Volumen de cada día / mediana del mismo día de la semana en las ±`semanas` semanas vecinas.

    1 = día normal; 0,2 = cayó al 20 %. NaN si el día no tiene vecinos suficientes o si la
    referencia es menor que `minimo_referencia` × la mediana diaria de toda la serie (por
    ejemplo, domingos en un servicio que no abre: ahí un cociente no significa nada).
    """
    vecinos = pd.concat(
        [diario.shift(7 * j) for j in range(-semanas, semanas + 1) if j != 0], axis=1
    )
    referencia = vecinos.median(axis=1, skipna=True)
    valida = (vecinos.notna().sum(axis=1) >= semanas) & (
        referencia >= max(minimo_referencia * diario.median(), 1e-9)
    )
    return (diario / referencia.where(valida)).rename("relativo")


def festivos_entre_semana(inicio, fin) -> pd.DatetimeIndex:
    """Festivos de Colombia que caen de lunes a viernes en [inicio, fin]."""
    from external.calendario import festivos

    idx = pd.date_range(inicio, fin, freq="D")
    f = festivos(idx)
    return idx[(f["es_festivo"] == 1).to_numpy() & (idx.day_of_week < 5)]


def dias_carnaval(inicio, fin) -> pd.DatetimeIndex:
    """Días de Carnaval de Barranquilla (sábado a martes) en [inicio, fin]."""
    from external.calendario import carnaval_semana_santa

    idx = pd.date_range(inicio, fin, freq="D")
    return idx[(carnaval_semana_santa(idx)["es_carnaval"] == 1).to_numpy()]


def prueba_desplazamiento(
    diario: pd.Series, eventos: Iterable, max_desfase: int = 21, semanas: int = 3
) -> pd.DataFrame:
    """Volumen relativo medio en las fechas `eventos + k` para k en [-max_desfase, max_desfase].

    Devuelve columnas `desfase`, `relativo_medio`, `n`. El desfase con el valor más bajo es donde
    "caen" los eventos en los datos: 0 si las fechas son reales.
    """
    relativo = relativo_semanas_vecinas(diario, semanas)
    eventos = pd.DatetimeIndex(pd.to_datetime(list(eventos)))
    filas = []
    for k in range(-max_desfase, max_desfase + 1):
        valores = relativo.reindex(eventos + pd.Timedelta(days=k)).dropna()
        filas.append(
            {
                "desfase": k,
                "relativo_medio": valores.mean() if len(valores) else np.nan,
                "n": len(valores),
            }
        )
    return pd.DataFrame(filas)


def veredicto_desplazamiento(
    prueba: pd.DataFrame, n_minimo: int = 5, caida_minima: float = 0.2, margen_minimo: float = 0.2
) -> dict:
    """Resume `prueba_desplazamiento` en un desfase estimado y una conclusión.

    - `efecto_claro`: hay un hueco que baja al menos `caida_minima` del volumen normal y queda al
      menos `margen_minimo` por debajo del segundo desfase más bajo. Sin efecto claro la prueba
      no decide nada (pasa en servicios sin efecto festivo, como urgencias).
    - `fechas_reales`: True si el efecto es claro y está en 0; False si es claro y está en otro
      desfase; None si no hay efecto claro.
    """
    validos = prueba[prueba["n"] >= n_minimo].dropna(subset=["relativo_medio"])
    if len(validos) < 2:
        return {
            "desfase_estimado": None,
            "efecto_claro": False,
            "fechas_reales": None,
            "conclusion": "pocos eventos para decidir",
        }
    orden = validos.sort_values("relativo_medio", ignore_index=True)
    mejor, segundo = orden.iloc[0], orden.iloc[1]
    margen = float(segundo["relativo_medio"] - mejor["relativo_medio"])
    claro = bool(mejor["relativo_medio"] <= 1 - caida_minima and margen >= margen_minimo)
    desfase = int(mejor["desfase"])
    en_cero = validos.loc[validos["desfase"] == 0, "relativo_medio"]
    if not claro:
        conclusion = "sin efecto festivo claro: la prueba no decide"
    elif desfase == 0:
        conclusion = "fechas reales: el hueco cae en el festivo"
    else:
        conclusion = f"posible corrimiento de {desfase} días"
    return {
        "desfase_estimado": desfase,
        "relativo_en_0": float(en_cero.iloc[0]) if len(en_cero) else None,
        "relativo_minimo": float(mejor["relativo_medio"]),
        "margen_vs_segundo": margen,
        "efecto_claro": claro,
        "fechas_reales": (desfase == 0) if claro else None,
        "eventos": int(mejor["n"]),
        "conclusion": conclusion,
    }


def perfil_evento(
    diario: pd.Series, fechas: Iterable, antes: int = 7, despues: int = 7, semanas: int = 3
) -> pd.DataFrame:
    """Volumen relativo medio por día alrededor de un evento (Carnaval, 24-25 dic, 31 dic-1 ene).

    `fechas` son los días de inicio de cada ocurrencia del evento. Devuelve `dia` (0 = inicio),
    `relativo_medio` y `n`.
    """
    relativo = relativo_semanas_vecinas(diario, semanas)
    fechas = pd.DatetimeIndex(pd.to_datetime(list(fechas)))
    filas = []
    for k in range(-antes, despues + 1):
        valores = relativo.reindex(fechas + pd.Timedelta(days=k)).dropna()
        filas.append({"dia": k, "relativo_medio": valores.mean(), "n": len(valores)})
    return pd.DataFrame(filas)


def reparto_dia_semana(diario: pd.Series) -> pd.Series:
    """% del volumen total por día de la semana (0 = lunes)."""
    total = diario.groupby(diario.index.day_of_week).sum()
    return (100 * total / total.sum()).rename("pct")
