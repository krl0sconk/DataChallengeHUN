"""Validación temporal walk-forward y métricas de error.

Regla de oro: un modelo se evalúa SIEMPRE con datos posteriores a los que vio.
Cada pliegue tiene un "origen" (el momento en que se haría la predicción):
- entrenamiento: todo lo anterior al origen;
- prueba: el horizonte que sigue al origen (por defecto 7 días).
Nunca hay partición aleatoria: mezclaría futuro y pasado y el error saldría optimista.

Este módulo es la base común: la línea base, el protocolo de factores externos y el
modelo principal se evalúan con los mismos pliegues para que los números sean comparables.
(Daniel define el plan de validación final; si cambia algo, se cambia aquí y todo lo usa.)
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class Pliegue:
    numero: int
    origen: pd.Timestamp
    fin_prueba: pd.Timestamp  # exclusivo

    def entrenamiento(self, df: pd.DataFrame) -> pd.DataFrame:
        return df[df["ts"] < self.origen]

    def prueba(self, df: pd.DataFrame) -> pd.DataFrame:
        return df[(df["ts"] >= self.origen) & (df["ts"] < self.fin_prueba)]


def pliegues_walk_forward(
    ts: pd.Series | pd.DatetimeIndex,
    horizonte: str = "7D",
    paso: str = "14D",
    ventana_evaluacion: str = "365D",
    entrenamiento_minimo: str = "365D",
) -> list[Pliegue]:
    """Orígenes cada `paso` dentro de la última `ventana_evaluacion` de los datos.

    Una ventana de un año reparte los pliegues en todas las temporadas (lluvias, Carnaval,
    diciembre), que es justo lo que se necesita para medir estabilidad.
    Si hay pocos datos, la ventana se recorta para respetar `entrenamiento_minimo`.
    """
    ts = pd.DatetimeIndex(pd.to_datetime(ts)).sort_values()
    inicio, fin = ts.min(), ts.max()
    h = pd.Timedelta(horizonte)
    paso_datos = pd.Series(ts.unique()).diff().min() if len(ts.unique()) > 1 else pd.Timedelta("1D")
    # La prueba [origen, origen + h) debe caber completa en los datos.
    ultimo_origen = (fin + paso_datos - h).floor("D")
    primer_origen = max(
        ultimo_origen - pd.Timedelta(ventana_evaluacion) + h,
        (inicio + pd.Timedelta(entrenamiento_minimo)).ceil("D"),
    )
    if primer_origen > ultimo_origen:
        raise ValueError("No hay suficientes datos para el entrenamiento mínimo y un pliegue.")
    # Se ancla en el último origen posible (el más reciente) y se retrocede de a `paso`.
    n = int((ultimo_origen - primer_origen) / pd.Timedelta(paso)) + 1
    origenes = [ultimo_origen - i * pd.Timedelta(paso) for i in range(n)][::-1]
    return [Pliegue(i, o, o + h) for i, o in enumerate(origenes)]


# --------------------------------------------------------------------------- métricas
def metricas(y: np.ndarray, pred: np.ndarray) -> dict[str, float]:
    """MAE, RMSE, WAPE y sesgo.

    WAPE (= Σ|error| / Σ|real|) es la métrica principal: se lee como "% de error" y, a
    diferencia del MAPE, no explota en horas con 0 llegadas.
    Sesgo > 0 significa que el modelo sobreestima.
    """
    y = np.asarray(y, dtype=float)
    pred = np.asarray(pred, dtype=float)
    err = pred - y
    total = np.abs(y).sum()
    return {
        "mae": float(np.mean(np.abs(err))),
        "rmse": float(np.sqrt(np.mean(err**2))),
        "wape": float(np.abs(err).sum() / total) if total > 0 else float("nan"),
        "sesgo": float(np.mean(err)),
        "n": int(len(y)),
    }


def resumir(resultados: pd.DataFrame, por: list[str] | None = None) -> pd.DataFrame:
    """Métricas agregadas desde una tabla con columnas `y`, `pred` (+ las de `por`)."""
    if not por:
        return pd.DataFrame([metricas(resultados["y"], resultados["pred"])])
    return (
        resultados.groupby(por)[["y", "pred"]]
        .apply(lambda g: pd.Series(metricas(g["y"], g["pred"])))
        .reset_index()
    )
