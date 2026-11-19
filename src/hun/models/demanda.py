"""Modelo de demanda hospitalaria diaria por servicio con horizonte de 1 a 7 días.

Implementa la escalera de modelos predictivos de llegadas diarias:
1. Línea base: mediana histórica del mismo día de la semana en las últimas 8 semanas.
2. Regresión de Poisson con calendario: modelo lineal generalizado con efectos de
   día de la semana, mes, ciclo anual y eventos festivos.
3. LightGBM Poisson con todos los factores externos: gradient boosting con función
   de pérdida Poisson, rezagos semanales y conjunto completo de variables externas.
4. LightGBM Poisson final: modelo optimizado que retiene exclusivamente los grupos de
   factores externos aceptados por el protocolo de evaluación (festivos y vacaciones).

Reglas estrictas anti fuga de información:
- Para un horizonte de 7 días, todos los rezagos de llegadas son de al menos 7 días
  (llegadas_lag_7, llegadas_lag_14, ..., llegadas_lag_56).
- Al calcular features desde un origen temporal, ningún rezago lee valores de y en
  instantes ts >= origen. Todos los valores posteriores al corte se enmascaran antes
  de aplicar los desplazamientos (.shift).
"""

from __future__ import annotations

import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import holidays
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import PoissonRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from hun import config
from hun.data.agregados import OTROS
from hun.models import evaluacion_factores as ef
from hun.models import linea_base
from hun.models.evaluacion_factores import (
    CALENDARIO_BASE,
    GRUPOS_POR_DEFECTO,
    ResultadoGrupo,
)
from hun.models.validacion import Pliegue, metricas, pliegues_walk_forward, resumir

log = logging.getLogger("demanda")

# Grupos de factores externos aceptados por el protocolo empírico
GRUPOS_ACEPTADOS: tuple[str, ...] = ("festivos_y_puentes",)

# Escalones de la escalera de modelos, en orden
ESCALONES: tuple[str, ...] = (
    "linea_base",
    "poisson_calendario",
    "lgbm_todos_externos",
    "lgbm_final",
)

# Vida media (días) del peso de cada observación al entrenar: lo reciente pesa más
VIDA_MEDIA_DIAS: int = 180

# Exactitud mínima pedida por servicio y día del horizonte
META_EXACTITUD: float = 0.80

# Rezagos semanales seguros para horizonte de hasta 7 días
SEMANAS_REZAGOS: tuple[int, ...] = (1, 2, 3, 4, 5, 6, 7, 8)
COLUMNAS_REZAGO: tuple[str, ...] = tuple(f"llegadas_lag_{7 * s}" for s in SEMANAS_REZAGOS)
COLUMNAS_REZAGO_RESUMEN: tuple[str, ...] = ("rezago_prom_4s", "rezago_mediana_8s")
COLUMNAS_CALENDARIO_EXTRA: tuple[str, ...] = (
    "es_festivo",
    "es_dia_no_laboral",
    "dia_post_festivo",
)


def construir_features_demanda(
    serie: pd.DataFrame,
    externos: pd.DataFrame | None = None,
    origen: pd.Timestamp | None = None,
) -> pd.DataFrame:
    """Construye la matriz de features para el modelo de demanda diaria.

    Aplica la regla estricta anti fuga de información: si `origen` está definido,
    todos los valores de `y` con `ts >= origen` se enmascaran como NaN antes de
    calcular los rezagos semanales (7, 14, 21, ..., 56 días). De esta manera,
    cualquier registro en la ventana de pronóstico [origen, origen + 7D) toma sus
    rezagos exclusivamente de instantes estrictamente anteriores a `origen`.

    Args:
        serie: DataFrame con columnas `ts`, `serie` e `y` (frecuencia diaria).
        externos: DataFrame opcional con variables externas (clima, calendario, etc.).
            Puede estar indexado por fecha o contener una columna `fecha`.
        origen: Momento de corte temporal para evaluar o predecir sin fuga.

    Returns:
        DataFrame ordenado por `['serie', 'ts']` con features de calendario, rezagos
        anti-fuga y variables externas unidas.
    """
    df = serie.copy()
    df["ts"] = pd.to_datetime(df["ts"])
    df["fecha"] = df["ts"].dt.normalize()
    df = df.sort_values(["serie", "ts"]).reset_index(drop=True)

    # 1. Unir factores externos por fecha si están disponibles
    if externos is not None:
        ext = externos.copy()
        if "fecha" not in ext.columns and isinstance(ext.index, pd.DatetimeIndex):
            ext = ext.reset_index(names="fecha")
        elif "fecha" in ext.columns:
            ext["fecha"] = pd.to_datetime(ext["fecha"]).dt.normalize()
        else:
            ext.index = pd.to_datetime(ext.index).normalize()
            ext = ext.reset_index(names="fecha")

        cols_a_unir = [c for c in ext.columns if c == "fecha" or c not in ("ts", "serie", "y")]
        ext_dedup = ext[cols_a_unir].drop_duplicates(subset=["fecha"])
        df = df.merge(ext_dedup, on="fecha", how="left")

    # 2. Variables de calendario base (estacionalidad intra-anual e intra-semanal)
    if "dia_semana" not in df.columns:
        df["dia_semana"] = df["ts"].dt.day_of_week
    if "mes" not in df.columns:
        df["mes"] = df["ts"].dt.month
    if "dia_anio" not in df.columns:
        df["dia_anio"] = df["ts"].dt.day_of_year
    if "sin_dia_anio" not in df.columns:
        df["sin_dia_anio"] = np.sin(2 * np.pi * df["dia_anio"] / 365.25)
    if "cos_dia_anio" not in df.columns:
        df["cos_dia_anio"] = np.cos(2 * np.pi * df["dia_anio"] / 365.25)
    if "es_fin_de_semana" not in df.columns:
        df["es_fin_de_semana"] = (df["dia_semana"] >= 5).astype(int)
    if "sin_dia_semana" not in df.columns:
        df["sin_dia_semana"] = np.sin(2 * np.pi * df["dia_semana"] / 7.0)
    if "cos_dia_semana" not in df.columns:
        df["cos_dia_semana"] = np.cos(2 * np.pi * df["dia_semana"] / 7.0)

    # 3. Variables de festivos colombianos (por si externos no las traía)
    if "es_festivo" not in df.columns:
        co_holidays = holidays.Colombia()
        df["es_festivo"] = df["ts"].dt.date.apply(lambda d: int(d in co_holidays))
    else:
        df["es_festivo"] = df["es_festivo"].fillna(0).astype(int)

    if "es_dia_no_laboral" not in df.columns:
        df["es_dia_no_laboral"] = ((df["dia_semana"] >= 5) | (df["es_festivo"] == 1)).astype(int)
    else:
        df["es_dia_no_laboral"] = df["es_dia_no_laboral"].fillna(0).astype(int)

    if "dia_post_festivo" not in df.columns:
        df["dia_post_festivo"] = df.groupby("serie")["es_festivo"].shift(1).fillna(0).astype(int)
    else:
        df["dia_post_festivo"] = df["dia_post_festivo"].fillna(0).astype(int)

    # 4. Codificación categórica del servicio
    if "serie_cod" not in df.columns:
        df["serie_cod"] = df["serie"].astype("category").cat.codes

    # 5. Rezagos de demanda con estricta regla anti fuga
    if origen is not None:
        origen_ts = pd.Timestamp(origen)
        y_seguro = df["y"].where(df["ts"] < origen_ts, np.nan)
    else:
        y_seguro = df["y"]

    df["_y_seguro"] = y_seguro
    for s in SEMANAS_REZAGOS:
        lag = s * 7
        col_lag = f"llegadas_lag_{lag}"
        df[col_lag] = df.groupby("serie")["_y_seguro"].shift(lag)
        # Mantener compatibilidad con evaluacion_factores (rezago_1s .. rezago_8s)
        df[f"rezago_{s}s"] = df[col_lag]

    df = df.drop(columns=["_y_seguro"])

    cols_4s = [f"llegadas_lag_{7 * s}" for s in range(1, 5)]
    cols_8s = [f"llegadas_lag_{7 * s}" for s in SEMANAS_REZAGOS]
    df["rezago_prom_4s"] = df[cols_4s].mean(axis=1)
    df["rezago_mediana_8s"] = df[cols_8s].median(axis=1)

    return df


def columnas_por_grupos(
    externos_cols: list[str] | None = None,
    grupos_incluidos: tuple[str, ...] | list[str] | None = None,
    incluir_todos_externos: bool = False,
) -> list[str]:
    """Selecciona las columnas de features según los grupos de factores externos.

    Incluye siempre las variables de calendario base y los rezagos semanales anti-fuga.

    Args:
        externos_cols: Lista de nombres de columnas disponibles en los datos externos.
        grupos_incluidos: Nombres de los grupos de `GrupoFactor` a incluir.
            Si es None, usa `GRUPOS_ACEPTADOS`.
        incluir_todos_externos: Si es True, incluye las columnas de todos los grupos
            definidos en `GRUPOS_POR_DEFECTO`.

    Returns:
        Lista ordenada sin duplicados con los nombres de las columnas seleccionadas.
    """
    cols: list[str] = list(CALENDARIO_BASE) + list(COLUMNAS_REZAGO) + list(COLUMNAS_REZAGO_RESUMEN)

    if externos_cols:
        grupos_deseados = set(grupos_incluidos or GRUPOS_ACEPTADOS)
        for g in GRUPOS_POR_DEFECTO:
            if incluir_todos_externos or (g.nombre in grupos_deseados):
                cols_g = g.resolver(externos_cols)
                for c in cols_g:
                    if c not in cols:
                        cols.append(c)

    return list(dict.fromkeys(cols))


def ajustar_predecir_poisson(
    train: pd.DataFrame,
    test: pd.DataFrame,
    columnas: list[str] | None = None,
) -> np.ndarray:
    """Ajusta una regresión de Poisson con variables de calendario y predice en test.

    Usa `sklearn.linear_model.PoissonRegressor` con escalado StandardScaler para
    variables continuas y OneHotEncoder para variables categóricas (servicio, día
    de la semana y mes), ajustado estrictamente en los datos de entrenamiento para
    evitar fuga.

    Args:
        train: DataFrame de entrenamiento del pliegue.
        test: DataFrame de prueba del pliegue.
        columnas: Columnas de features a utilizar. Si es None, utiliza las variables
            de calendario base y festivos disponibles.

    Returns:
        Arreglo 1D de numpy con las predicciones para `test`.
    """
    if columnas is None:
        cols_base = [c for c in CALENDARIO_BASE if c in train.columns]
        cols_extra = [c for c in COLUMNAS_CALENDARIO_EXTRA if c in train.columns]
        cols = cols_base + cols_extra
    else:
        cols = [c for c in columnas if c in train.columns]

    col_serie = (
        "serie"
        if "serie" in train.columns and "serie" in test.columns
        else ("serie_cod" if "serie_cod" in train.columns and "serie_cod" in test.columns else None)
    )

    train_valid = train[train["y"].notna() & (train["y"] >= 0)]
    if len(train_valid) == 0:
        return np.zeros(len(test), dtype=float)

    def _fit_predict_bloque(
        sub_tr: pd.DataFrame, sub_te: pd.DataFrame, cols_bloque: list[str]
    ) -> np.ndarray:
        if len(sub_tr) == 0 or len(sub_te) == 0:
            return np.zeros(len(sub_te), dtype=float)
        cat_candidates = {"serie", "serie_cod", "dia_semana", "mes"}
        cat_cols = [c for c in cols_bloque if c in cat_candidates]
        num_cols = [c for c in cols_bloque if c not in cat_candidates]

        transformers = []
        if cat_cols:
            transformers.append(
                (
                    "cat",
                    Pipeline(
                        [
                            ("imputer", SimpleImputer(strategy="most_frequent")),
                            ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                        ]
                    ),
                    cat_cols,
                )
            )
        if num_cols:
            transformers.append(
                (
                    "num",
                    Pipeline(
                        [
                            ("imputer", SimpleImputer(strategy="median")),
                            ("scaler", StandardScaler()),
                        ]
                    ),
                    num_cols,
                )
            )

        preprocessor = ColumnTransformer(transformers=transformers)
        pipe = Pipeline(
            [
                ("prep", preprocessor),
                ("reg", PoissonRegressor(alpha=1e-4, max_iter=500)),
            ]
        )
        pipe.fit(sub_tr[cols_bloque], sub_tr["y"])
        pred_b = pipe.predict(sub_te[cols_bloque])
        return np.maximum(0.0, np.asarray(pred_b, dtype=float))

    # Ajustar por servicio equivale a incluir todas las interacciones `servicio × calendario`
    # (clave porque Rehabilitación cierra en fines de semana/festivos y Urgencias opera 24/7).
    if col_serie is not None and train_valid[col_serie].nunique() > 1:
        cols_sin_serie = [c for c in cols if c != col_serie]
        if cols_sin_serie:
            preds = np.zeros(len(test), dtype=float)
            pos_index = np.arange(len(test))
            series_test = test[col_serie].to_numpy()
            unseen_mask = np.zeros(len(test), dtype=bool)
            for s_val in pd.unique(series_test):
                mask_te = series_test == s_val
                sub_tr = train_valid[train_valid[col_serie] == s_val]
                if len(sub_tr) < 10:
                    unseen_mask |= mask_te
                    continue
                preds[pos_index[mask_te]] = _fit_predict_bloque(
                    sub_tr, test.iloc[pos_index[mask_te]], cols_sin_serie
                )
            if unseen_mask.any():
                cols_global = list(cols)
                if col_serie not in cols_global:
                    cols_global.append(col_serie)
                preds[pos_index[unseen_mask]] = _fit_predict_bloque(
                    train_valid, test.iloc[pos_index[unseen_mask]], cols_global
                )
            return preds

    if col_serie is not None and col_serie not in cols:
        cols.append(col_serie)
    return _fit_predict_bloque(train_valid, test, cols)


def _preparar_lgbm(
    train: pd.DataFrame, columnas: list[str]
) -> tuple[list[str], list[str], pd.DataFrame]:
    """Columnas, categóricas y filas de entrenamiento válidas para los modelos LightGBM."""
    cols = list(columnas)
    if "serie_cod" in train.columns and "serie_cod" not in cols:
        cols.append("serie_cod")
    elif "serie" in train.columns and "serie" not in cols and "serie_cod" not in train.columns:
        cols.append("serie")

    train_valid = train[train["y"].notna() & (train["y"] >= 0)].copy()

    # Descartar filas iniciales que no tienen rezagos calculados
    filtro_rezagos = [c for c in ("rezago_prom_4s", "llegadas_lag_7") if c in cols]
    if filtro_rezagos:
        filtrado = train_valid.dropna(subset=[filtro_rezagos[0]])
        if len(filtrado) > 0:
            train_valid = filtrado

    cats = [c for c in ("serie_cod", "serie") if c in cols]
    return cols, cats, train_valid


def ajustar_predecir_lgbm(
    train: pd.DataFrame,
    test: pd.DataFrame,
    columnas: list[str],
) -> np.ndarray:
    """Ajusta un modelo LightGBM con objetivo Poisson y predice en test.

    Cumple con la firma `AjustarPredecir` de `evaluacion_factores.py`. Si `'serie_cod'`
    está presente en `train.columns` y no en `columnas`, se incluye automáticamente
    como variable categórica.

    Args:
        train: DataFrame de entrenamiento del pliegue.
        test: DataFrame de prueba del pliegue.
        columnas: Lista de nombres de columnas de features a usar.

    Returns:
        Arreglo 1D de numpy con las predicciones para `test`.
    """
    cols, cats, train_valid = _preparar_lgbm(train, columnas)
    if len(train_valid) == 0:
        return np.zeros(len(test), dtype=float)

    modelo = lgb.LGBMRegressor(
        objective="poisson",
        random_state=config.RANDOM_SEED,
        n_estimators=200,
        learning_rate=0.05,
        num_leaves=15,
        min_child_samples=15,
        verbose=-1,
    )

    modelo.fit(
        train_valid[cols],
        train_valid["y"],
        categorical_feature=cats if cats else "auto",
    )

    pred = modelo.predict(test[cols])
    return np.maximum(0.0, np.asarray(pred, dtype=float))


def _nivel_local(df: pd.DataFrame) -> np.ndarray:
    """Nivel reciente de cada fila: mediana de 8 semanas (o promedio de 4 si falta), mínimo 0,5."""
    for col in ("rezago_mediana_8s", "rezago_prom_4s"):
        if col in df.columns:
            base = df[col].astype(float)
            if col == "rezago_mediana_8s" and "rezago_prom_4s" in df.columns:
                base = base.fillna(df["rezago_prom_4s"])
            return np.maximum(base.fillna(0.0).to_numpy(), 0.5)
    raise ValueError("Se necesita 'rezago_mediana_8s' o 'rezago_prom_4s' para el nivel local.")


def ajustar_predecir_lgbm_nivel(
    train: pd.DataFrame,
    test: pd.DataFrame,
    columnas: list[str],
    vida_media_dias: float = VIDA_MEDIA_DIAS,
) -> np.ndarray:
    """LightGBM Poisson que aprende el CAMBIO respecto del nivel reciente, no el nivel absoluto.

    Dos ideas, ambas pensadas para series cuyo volumen cambia con el tiempo (rehabilitación
    ronda 900/día y a veces baja a 30; un árbol no puede predecir fuera de lo que vio):

    1. Nivel local: el modelo parte de `log(mediana de 8 semanas)` (`init_score`) y solo aprende
       la razón real/nivel (festivo, día de la semana...). Así la predicción escala con el nivel.
    2. Recencia: cada fila pesa `0.5 ** (edad / vida_media_dias)`, así que lo de hace un año
       cuenta menos que lo de la semana pasada.

    Misma firma que `ajustar_predecir_lgbm` (sirve en el protocolo de factores).
    """
    cols, cats, train_valid = _preparar_lgbm(train, columnas)
    if len(train_valid) == 0:
        return np.zeros(len(test), dtype=float)

    edad = (train_valid["ts"].max() - train_valid["ts"]).dt.days.to_numpy()
    pesos = 0.5 ** (edad / vida_media_dias)

    modelo = lgb.LGBMRegressor(
        objective="poisson",
        random_state=config.RANDOM_SEED,
        n_estimators=200,
        learning_rate=0.05,
        num_leaves=15,
        min_child_samples=15,
        verbose=-1,
    )
    modelo.fit(
        train_valid[cols],
        train_valid["y"],
        sample_weight=pesos,
        init_score=np.log(_nivel_local(train_valid)),
        categorical_feature=cats if cats else "auto",
    )
    bruto = modelo.predict(test[cols], raw_score=True)
    return np.exp(np.asarray(bruto, dtype=float) + np.log(_nivel_local(test)))


def evaluar_poisson(
    serie: pd.DataFrame,
    externos: pd.DataFrame | None,
    pliegues: list[Pliegue],
    columnas: list[str] | None = None,
) -> pd.DataFrame:
    """Evalúa la regresión de Poisson en todos los pliegues walk-forward.

    Args:
        serie: DataFrame de llegadas diarias.
        externos: DataFrame de datos externos opcionales.
        pliegues: Pliegues temporales de validación.
        columnas: Lista de columnas de features a utilizar.

    Returns:
        DataFrame con columnas `ts`, `serie`, `y`, `pred`, `pliegue`, `origen`,
        `dia_horizonte` y `es_festivo`.
    """
    partes = []
    cols = columnas or (list(CALENDARIO_BASE) + list(COLUMNAS_CALENDARIO_EXTRA))
    for p in pliegues:
        df_feat = construir_features_demanda(serie, externos, origen=p.origen)
        train = p.entrenamiento(df_feat)
        test = p.prueba(df_feat)
        pred = ajustar_predecir_poisson(train, test, cols)
        dia_h = ((test["ts"] - p.origen) // pd.Timedelta("1D")).astype(int) + 1
        partes.append(
            pd.DataFrame(
                {
                    "ts": test["ts"],
                    "serie": test["serie"],
                    "y": test["y"],
                    "pred": pred,
                    "pliegue": p.numero,
                    "origen": p.origen,
                    "dia_horizonte": dia_h,
                    "es_festivo": test["es_festivo"].astype(int),
                }
            )
        )
    return pd.concat(partes, ignore_index=True)


def evaluar_lgbm(
    serie: pd.DataFrame,
    externos: pd.DataFrame | None,
    pliegues: list[Pliegue],
    columnas: list[str] | None = None,
) -> pd.DataFrame:
    """Evalúa el modelo LightGBM Poisson en todos los pliegues walk-forward.

    Args:
        serie: DataFrame de llegadas diarias.
        externos: DataFrame de datos externos opcionales.
        pliegues: Pliegues temporales de validación.
        columnas: Lista de columnas de features a utilizar.

    Returns:
        DataFrame con columnas `ts`, `serie`, `y`, `pred`, `pliegue`, `origen`,
        `dia_horizonte` y `es_festivo`.
    """
    partes = []
    ext_cols = list(externos.columns) if externos is not None else []
    cols = columnas or columnas_por_grupos(ext_cols, grupos_incluidos=GRUPOS_ACEPTADOS)
    for p in pliegues:
        df_feat = construir_features_demanda(serie, externos, origen=p.origen)
        train = p.entrenamiento(df_feat)
        test = p.prueba(df_feat)
        pred = ajustar_predecir_lgbm(train, test, cols)
        dia_h = ((test["ts"] - p.origen) // pd.Timedelta("1D")).astype(int) + 1
        partes.append(
            pd.DataFrame(
                {
                    "ts": test["ts"],
                    "serie": test["serie"],
                    "y": test["y"],
                    "pred": pred,
                    "pliegue": p.numero,
                    "origen": p.origen,
                    "dia_horizonte": dia_h,
                    "es_festivo": test["es_festivo"].astype(int),
                }
            )
        )
    return pd.concat(partes, ignore_index=True)


def evaluar_escalera(
    serie: pd.DataFrame,
    externos: pd.DataFrame | None = None,
    pliegues: list[Pliegue] | None = None,
    grupos_aceptados: tuple[str, ...] = GRUPOS_ACEPTADOS,
) -> dict[str, pd.DataFrame]:
    """Evalúa la escalera completa de modelos sobre los mismos pliegues walk-forward.

    Escalones evaluados:
    1. "linea_base": mediana histórica de 8 semanas.
    2. "poisson_calendario": regresión de Poisson con variables de calendario.
    3. "lgbm_todos_externos": LightGBM Poisson con nivel local, rezagos y todos los externos.
    4. "lgbm_final": LightGBM Poisson con nivel local, rezagos y solo los grupos aceptados.

    Args:
        serie: DataFrame de llegadas diarias con columnas `ts`, `serie`, `y`.
        externos: DataFrame de factores externos (opcional).
        pliegues: Lista de pliegues walk-forward. Si es None, se calculan automáticamente.
        grupos_aceptados: Grupos de factores externos para el modelo final.

    Returns:
        Diccionario con los 4 DataFrames de resultados evaluados en los mismos pliegues,
        cada uno con columnas: `ts`, `serie`, `y`, `pred`, `pliegue`, `origen`,
        `dia_horizonte`, `es_festivo`.
    """
    serie_ordenada = serie.sort_values(["serie", "ts"]).copy()
    if pliegues is None:
        pliegues = pliegues_walk_forward(serie_ordenada["ts"])

    # 1. Línea base elegida (mediana de 8 semanas)
    df_lb = linea_base.evaluar(serie_ordenada, pliegues, semanas=8, estadistico="mediana")

    # Mapeo de días festivos para la línea base
    if externos is not None and "es_festivo" in externos.columns:
        ext_fechas = externos.copy()
        if "fecha" not in ext_fechas.columns and isinstance(ext_fechas.index, pd.DatetimeIndex):
            ext_fechas = ext_fechas.reset_index(names="fecha")
        elif "fecha" not in ext_fechas.columns:
            ext_fechas.index = pd.to_datetime(ext_fechas.index).normalize()
            ext_fechas = ext_fechas.reset_index(names="fecha")
        mapa_festivo = dict(
            zip(
                pd.to_datetime(ext_fechas["fecha"]).dt.normalize(),
                ext_fechas["es_festivo"].fillna(0).astype(int),
                strict=False,
            )
        )
        df_lb["es_festivo"] = (
            pd.to_datetime(df_lb["ts"]).dt.normalize().map(mapa_festivo).fillna(0).astype(int)
        )
    else:
        co_h = holidays.Colombia()
        df_lb["es_festivo"] = pd.to_datetime(df_lb["ts"]).dt.date.apply(lambda d: int(d in co_h))

    # 2. Definición de columnas para cada escalón
    ext_cols = list(externos.columns) if externos is not None else []
    cols_poisson = list(CALENDARIO_BASE) + [
        c for c in COLUMNAS_CALENDARIO_EXTRA if c in ext_cols or externos is None
    ]
    cols_lgbm_todos = columnas_por_grupos(ext_cols, incluir_todos_externos=True)
    cols_lgbm_final = columnas_por_grupos(ext_cols, grupos_incluidos=grupos_aceptados)

    res_poisson: list[pd.DataFrame] = []
    res_todos: list[pd.DataFrame] = []
    res_final: list[pd.DataFrame] = []

    for p in pliegues:
        df_feat = construir_features_demanda(serie_ordenada, externos, origen=p.origen)
        train = p.entrenamiento(df_feat)
        test = p.prueba(df_feat)

        dia_h = ((test["ts"] - p.origen) // pd.Timedelta("1D")).astype(int) + 1
        es_fest = test["es_festivo"].astype(int)

        pred_p = ajustar_predecir_poisson(train, test, cols_poisson)
        pred_todos = ajustar_predecir_lgbm_nivel(train, test, cols_lgbm_todos)
        pred_final = ajustar_predecir_lgbm_nivel(train, test, cols_lgbm_final)

        res_poisson.append(
            pd.DataFrame(
                {
                    "ts": test["ts"],
                    "serie": test["serie"],
                    "y": test["y"],
                    "pred": pred_p,
                    "pliegue": p.numero,
                    "origen": p.origen,
                    "dia_horizonte": dia_h,
                    "es_festivo": es_fest,
                }
            )
        )
        res_todos.append(
            pd.DataFrame(
                {
                    "ts": test["ts"],
                    "serie": test["serie"],
                    "y": test["y"],
                    "pred": pred_todos,
                    "pliegue": p.numero,
                    "origen": p.origen,
                    "dia_horizonte": dia_h,
                    "es_festivo": es_fest,
                }
            )
        )
        res_final.append(
            pd.DataFrame(
                {
                    "ts": test["ts"],
                    "serie": test["serie"],
                    "y": test["y"],
                    "pred": pred_final,
                    "pliegue": p.numero,
                    "origen": p.origen,
                    "dia_horizonte": dia_h,
                    "es_festivo": es_fest,
                }
            )
        )

    return {
        "linea_base": df_lb,
        "poisson_calendario": pd.concat(res_poisson, ignore_index=True),
        "lgbm_todos_externos": pd.concat(res_todos, ignore_index=True),
        "lgbm_final": pd.concat(res_final, ignore_index=True),
    }


def resumen_completo(
    df_res: pd.DataFrame,
    nombres_series: dict[Any, str] | None = None,
) -> dict[str, pd.DataFrame]:
    """Calcula el resumen completo de métricas de desempeño para un modelo.

    Args:
        df_res: DataFrame con columnas `y`, `pred`, `serie`, `dia_horizonte`,
            `es_festivo`, `pliegue`.
        nombres_series: Mapeo opcional de identificador de serie a nombre legible.

    Returns:
        Diccionario con tablas de métricas: 'global', 'por_serie', 'por_dia_horizonte',
        'por_festivo', 'por_pliegue'.
    """
    df_valid = df_res.dropna(subset=["pred", "y"]).copy()

    # Métricas globales
    m_global = pd.DataFrame([metricas(df_valid["y"], df_valid["pred"])])

    # Métricas por servicio
    m_serie = resumir(df_valid, por=["serie"])
    if nombres_series:
        m_serie["nombre_serie"] = m_serie["serie"].map(lambda s: nombres_series.get(s, str(s)))
    prom_y = df_valid.groupby("serie")["y"].mean().rename("prom_real").reset_index()
    m_serie = m_serie.merge(prom_y, on="serie", how="left")

    # Métricas por día del horizonte (1 a 7)
    m_horizonte = resumir(df_valid, por=["dia_horizonte"]).sort_values("dia_horizonte")

    # Métricas en festivos vs. normales
    m_festivo = resumir(df_valid, por=["es_festivo"]).sort_values("es_festivo")
    m_festivo["tipo_dia"] = m_festivo["es_festivo"].map({0: "Normal", 1: "Festivo"}).fillna("Otro")

    # Estabilidad entre pliegues
    m_pliegue = resumir(df_valid, por=["pliegue", "origen"]).sort_values("pliegue")

    return {
        "global": m_global,
        "por_serie": m_serie,
        "por_dia_horizonte": m_horizonte,
        "por_festivo": m_festivo,
        "por_pliegue": m_pliegue,
    }


def techo_exactitud_poisson(media: float, dias: int = 1) -> float:
    """Exactitud máxima esperable por puro azar de conteo: 1 − E|X − μ| / μ con X ~ Poisson(μ).

    μ = `media` × `dias`. Es el techo de un modelo que conociera la tasa exacta de cada día:
    aun así fallaría porque el número de llegadas de un día es aleatorio. Con ~12 llegadas/día
    el techo diario ronda 77 %; sumando 7 días sube porque el azar se promedia.
    """
    from scipy.stats import poisson

    mu = float(media) * dias
    if mu <= 0:
        return 0.0
    k = np.arange(0, int(mu + 12 * np.sqrt(mu) + 20))
    error_esperado = float(np.sum(poisson.pmf(k, mu) * np.abs(k - mu)))
    return 1.0 - error_esperado / mu


def sin_otros(df: pd.DataFrame) -> pd.DataFrame:
    """Quita la serie "Otros" (tipos de visita de bajo volumen agrupados) de las métricas."""
    return df[df["serie"] != OTROS]


def exactitud_por_servicio_horizonte(
    df_res: pd.DataFrame, nombres_series: dict[Any, str] | None = None
) -> pd.DataFrame:
    """Exactitud (1 − WAPE) por servicio y día del horizonte, más el total por servicio.

    Devuelve una fila por servicio (sin "Otros"), columnas 1..7 y "Total".
    """
    nombres_series = nombres_series or {}
    df = sin_otros(df_res).dropna(subset=["y", "pred"])
    filas = {}
    for serie, g in df.groupby("serie"):
        fila = {
            int(d): 1.0 - metricas(sub["y"], sub["pred"])["wape"]
            for d, sub in g.groupby("dia_horizonte")
        }
        fila["Total"] = 1.0 - metricas(g["y"], g["pred"])["wape"]
        filas[nombres_series.get(serie, str(serie))] = fila
    tabla = pd.DataFrame.from_dict(filas, orient="index")
    return tabla[sorted(c for c in tabla.columns if c != "Total") + ["Total"]]


def exactitud_semanal(df_res: pd.DataFrame, serie: Any) -> dict[str, float]:
    """Exactitud de la semana completa (suma de los 7 días de cada pliegue) para un servicio.

    Sirve para servicios de pocas llegadas por día, donde el azar de conteo impide acertar cada
    día pero la suma semanal sí es útil. Incluye el techo de Poisson diario y semanal.
    """
    df = df_res[df_res["serie"] == serie].dropna(subset=["y", "pred"])
    semanas = df.groupby("pliegue")[["y", "pred"]].sum()
    media_diaria = float(df["y"].mean())
    return {
        "pliegues": int(len(semanas)),
        "media_diaria": media_diaria,
        "exactitud": 1.0 - metricas(semanas["y"], semanas["pred"])["wape"],
        "exactitud_diaria": 1.0 - metricas(df["y"], df["pred"])["wape"],
        "techo_diario": techo_exactitud_poisson(media_diaria),
        "techo": techo_exactitud_poisson(media_diaria, dias=7),
    }


_DIAS_ES = ("lun", "mar", "mié", "jue", "vie", "sáb", "dom")


def _dia_semana_del_horizonte(df_res: pd.DataFrame) -> dict[int, str]:
    """Día de la semana más frecuente de cada día del horizonte (los orígenes se repiten)."""
    dias = pd.to_datetime(df_res["ts"]).dt.day_of_week
    moda = dias.groupby(df_res["dia_horizonte"]).agg(lambda x: int(x.mode().iloc[0]))
    return {int(d): _DIAS_ES[w] for d, w in moda.items()}


def _seccion_exactitud(
    res_df: pd.DataFrame, nombres: dict[Any, str], servicio_semanal: Any = None
) -> list[str]:
    """Secciones 3.1 y 3.2 del reporte: exactitud por servicio × día y servicio de bajo volumen."""
    ex = exactitud_por_servicio_horizonte(res_df, nombres)
    dias = _dia_semana_del_horizonte(sin_otros(res_df))
    sin = sin_otros(res_df)
    prom = (
        sin.groupby(["serie", "dia_horizonte"])["y"].mean().unstack().rename(index=nombres)
        if len(sin)
        else pd.DataFrame()
    )
    cab = [f"{d} ({dias.get(d, '?')})" for d in range(1, 8)]
    lineas = [
        "",
        "### 3.1 Exactitud por servicio y día del horizonte",
        "",
        f"Exactitud = 1 − WAPE. Meta: ≥ {META_EXACTITUD:.0%} (⚠️ marca lo que no la alcanza). "
        "El horizonte siempre arranca el mismo día de la semana, por eso cada día del horizonte "
        "es siempre el mismo día de la semana.",
        "",
        "| Servicio | " + " | ".join(cab) + " | Total |",
        "|---|" + "---|" * 8,
    ]
    for servicio, fila in ex.iterrows():
        celdas = []
        for d in range(1, 8):
            v = fila.get(d, float("nan"))
            celdas.append(f"{v:.1%}{' ⚠️' if v < META_EXACTITUD else ''}")
        v = fila["Total"]
        celdas.append(f"{v:.1%}{' ⚠️' if v < META_EXACTITUD else ''}")
        lineas.append(f"| {servicio} | " + " | ".join(celdas) + " |")
    lineas.extend(
        [
            "",
            "Llegadas diarias promedio en cada día del horizonte (para leer la tabla anterior: "
            "un día con pocas llegadas casi no se puede acertar en porcentaje):",
            "",
            "| Servicio | " + " | ".join(cab) + " |",
            "|---|" + "---|" * 7,
        ]
    )
    for servicio, fila in prom.iterrows():
        lineas.append(
            f"| {servicio} | "
            + " | ".join(f"{fila.get(d, float('nan')):.1f}" for d in range(1, 8))
            + " |"
        )

    # celdas bajo la meta: se explican por volumen para no dejarlas sin contexto
    bajas = [
        f"{servicio} el {dias.get(d, '?')} (día {d}, {prom.loc[servicio, d]:.0f} llegadas/día)"
        for servicio, fila in ex.iterrows()
        for d in range(1, 8)
        if fila.get(d, 1.0) < META_EXACTITUD
        and servicio in prom.index
        and prom.loc[servicio, d] < 100
    ]
    if bajas:
        lineas.extend(
            [
                "",
                "Días bajo la meta con pocas llegadas (atiende poco o a ratos, y el nivel cambia "
                "mucho de una semana a otra; en porcentaje casi no se pueden acertar): "
                + "; ".join(bajas)
                + ". Para estos días mira el error en visitas (MAE) de la sección 3, "
                "no el porcentaje.",
            ]
        )

    # servicio de bajo volumen, reportado también por semana
    if servicio_semanal is None and len(sin):
        servicio_semanal = sin.groupby("serie")["y"].mean().idxmin()
    if servicio_semanal is not None and len(sin):
        sem = exactitud_semanal(sin, servicio_semanal)
        nombre = nombres.get(servicio_semanal, str(servicio_semanal))
        lineas.extend(
            [
                "",
                f"### 3.2 {nombre}: reporte por semana y techo",
                "",
                f"Promedio real: {sem['media_diaria']:.1f} llegadas por día. Con tan pocas "
                "llegadas el número de un día es en buena parte azar de conteo (Poisson): "
                "aunque el modelo conociera la tasa exacta, fallaría. Ese es el *techo*.",
                "",
                "| Medida | Exactitud |",
                "|---|---|",
                f"| Techo por azar, un día | {sem['techo_diario']:.1%} |",
                f"| Modelo, un día | {sem['exactitud_diaria']:.1%} |",
                f"| Techo por azar, semana completa (suma de 7 días) | {sem['techo']:.1%} |",
                f"| Modelo, semana completa ({sem['pliegues']} semanas) | {sem['exactitud']:.1%} |",
                "",
                "El techo es un tope optimista: supone que la tasa verdadera de cada día es "
                "conocida y que el conteo es Poisson puro. En la práctica la tasa también cambia "
                "de una semana a otra, por eso el modelo queda por debajo.",
            ]
        )
    return lineas


def reporte_markdown(
    resultados: dict[str, pd.DataFrame],
    nombres_series: dict[Any, str] | None = None,
    pliegues: list[Pliegue] | None = None,
    ruta_entrada: str = "entradas_por_hora.parquet",
    servicio_semanal: Any = None,
) -> str:
    """Genera el contenido markdown para `docs/resultados/modelo_demanda.md`.

    Compara la escalera de modelos contra la línea base en métricas globales,
    desglose por tipo de visita, por día del horizonte (1 a 7) y días festivos vs. normales.

    Args:
        resultados: Diccionario con DataFrames de predicciones por modelo.
        nombres_series: Mapeo opcional de IDs de servicio a nombres legibles.
        pliegues: Lista de pliegues utilizados en la validación walk-forward.
        ruta_entrada: Nombre o ruta del archivo de entrada de datos.
        servicio_semanal: Servicio que se reporta también por semana. Si es None, el de menor
            volumen diario (sin "Otros").

    Returns:
        Cadena de texto en formato Markdown con el reporte completo.
    """
    nombres_series = nombres_series or {}
    fecha_hoy = datetime.now().strftime("%Y-%m-%d %H:%M")
    n_pliegues = len(pliegues) if pliegues else len(resultados["linea_base"]["pliegue"].unique())
    origen_ini = (
        f"{pliegues[0].origen:%Y-%m-%d}"
        if pliegues
        else str(resultados["linea_base"]["origen"].min())[:10]
    )
    origen_fin = (
        f"{pliegues[-1].origen:%Y-%m-%d}"
        if pliegues
        else str(resultados["linea_base"]["origen"].max())[:10]
    )

    lineas = [
        "# Resultados · Modelo de Demanda (Llegadas Diarias)",
        "",
        f"_Generado automáticamente por `python -m hun.models.demanda` el {fecha_hoy}. "
        "Solo métricas agregadas._",
        "",
        f"- **Datos:** `{ruta_entrada}` · frecuencia diaria (`D`)",
        f"- **Validación:** walk-forward, {n_pliegues} pliegues, "
        f"origen {origen_ini} → {origen_fin}, horizonte 1 a 7 días.",
        "- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.",
        "",
        "## 1. Comparación de la Escalera de Modelos",
        "",
        "Cada escalón incorpora mayor capacidad predictiva sobre los mismos pliegues temporales.",
        "",
        "| Modelo | WAPE | MAE | RMSE | Sesgo | Mejora vs. Base |",
        "|---|---|---|---|---|---|",
    ]

    # "Otros" agrupa tipos de visita de casi cero llegadas: su WAPE no significa nada y
    # no debe mezclarse con las métricas globales.
    resultados = {nombre: sin_otros(df) for nombre, df in resultados.items()}
    resumenes: dict[str, dict[str, pd.DataFrame]] = {
        nombre: resumen_completo(df, nombres_series) for nombre, df in resultados.items()
    }

    base_wape = resumenes["linea_base"]["global"]["wape"].iloc[0]

    nombres_legibles = {
        "linea_base": "1. Línea base (mediana 8 semanas)",
        "poisson_calendario": "2. Poisson con calendario",
        "lgbm_todos_externos": "3. LightGBM con nivel local (todos los externos)",
        "lgbm_final": "4. LightGBM con nivel local (grupos aceptados)",
    }

    for clave, nombre_mostrado in nombres_legibles.items():
        if clave in resumenes:
            m = resumenes[clave]["global"].iloc[0]
            mejora = (base_wape - m.wape) / base_wape if base_wape > 0 else 0.0
            mejora_str = f"{mejora:+.1%}" if clave != "linea_base" else "Referencia"
            lineas.append(
                f"| {nombre_mostrado} | {m.wape:.1%} | {m.mae:.2f} | {m.rmse:.2f} | "
                f"{m.sesgo:+.2f} | {mejora_str} |"
            )

    # Identificar el modelo seleccionado para el desglose detallado
    modelo_clave = "lgbm_final" if "lgbm_final" in resultados else "linea_base"
    res_mod = resumenes[modelo_clave]

    lineas.extend(
        [
            "",
            f"**Modelo principal seleccionado:** `{modelo_clave}`.",
            "",
            "## 2. Desempeño por Servicio",
            "",
            "| Servicio | WAPE | MAE | Sesgo | Promedio Real |",
            "|---|---|---|---|---|",
        ]
    )

    for _, fila in res_mod["por_serie"].sort_values("prom_real", ascending=False).iterrows():
        nombre = fila.get("nombre_serie", fila["serie"])
        lineas.append(
            f"| {nombre} | {fila['wape']:.1%} | {fila['mae']:.2f} | "
            f"{fila['sesgo']:+.2f} | {fila['prom_real']:.2f} |"
        )

    lineas.extend(
        [
            "",
            "## 3. Desempeño por Día del Horizonte (1 a 7)",
            "",
            "| Día | WAPE | MAE | Sesgo |",
            "|---|---|---|---|",
        ]
    )

    for _, fila in res_mod["por_dia_horizonte"].iterrows():
        lineas.append(
            f"| {int(fila['dia_horizonte'])} | {fila['wape']:.1%} | "
            f"{fila['mae']:.2f} | {fila['sesgo']:+.2f} |"
        )

    lineas.extend(
        _seccion_exactitud(
            res_df=resultados[modelo_clave],
            nombres=nombres_series,
            servicio_semanal=servicio_semanal,
        )
    )

    lineas.extend(
        [
            "",
            "## 4. Días Festivos vs. Normales",
            "",
            "Comparación de la capacidad de adaptación ante caídas o picos operacionales.",
            "",
            "| Tipo de Día | Modelo | WAPE | MAE | Sesgo |",
            "|---|---|---|---|---|",
        ]
    )

    for tipo_val, tipo_nom in [(0, "Día Normal"), (1, "Día Festivo")]:
        for mod_k in ("linea_base", modelo_clave):
            tabla_fest = resumenes[mod_k]["por_festivo"]
            sub = tabla_fest[tabla_fest["es_festivo"] == tipo_val]
            if not sub.empty:
                f = sub.iloc[0]
                lineas.append(
                    f"| {tipo_nom} | {nombres_legibles.get(mod_k, mod_k)} | "
                    f"{f['wape']:.1%} | {f['mae']:.2f} | {f['sesgo']:+.2f} |"
                )

    lineas.extend(
        [
            "",
            "## 5. Estabilidad Temporal entre Pliegues",
            "",
            "| Pliegue | Origen | WAPE Línea Base | WAPE LightGBM Final |",
            "|---|---|---|---|",
        ]
    )

    pliegues_lb = resumenes["linea_base"]["por_pliegue"].set_index("pliegue")
    pliegues_final = res_mod["por_pliegue"].set_index("pliegue")

    for p_num in pliegues_lb.index:
        origen_str = pd.Timestamp(pliegues_lb.loc[p_num, "origen"]).strftime("%Y-%m-%d")
        w_lb = pliegues_lb.loc[p_num, "wape"]
        w_fn = pliegues_final.loc[p_num, "wape"] if p_num in pliegues_final.index else float("nan")
        lineas.append(f"| {int(p_num)} | {origen_str} | {w_lb:.1%} | {w_fn:.1%} |")

    return "\n".join(lineas) + "\n"


def reporte_factores_markdown(
    resultados_grupos: list[ResultadoGrupo],
    calidad_confirmada: bool | None = None,
) -> str:
    """Genera el reporte Markdown para `docs/resultados/factores_externos.md`.

    Resume los resultados del protocolo de ablación, control de estacionalidad,
    prueba placebo y estabilidad temporal para cada grupo de factores externos.

    Args:
        resultados_grupos: Lista de `ResultadoGrupo` generada por
            `evaluacion_factores.evaluar_grupos`.
        calidad_confirmada: Indica si la auditoría de calidad descartó desplazamientos
            por anonimización. Si es None, se inspecciona `docs/calidad_datos.md`.

    Returns:
        Texto en formato Markdown para el documento de resultados.
    """
    if calidad_confirmada is None:
        calidad_path = config.ROOT_DIR / "docs/calidad_datos.md"
        if calidad_path.exists():
            texto_calidad = calidad_path.read_text(encoding="utf-8")
            calidad_confirmada = "TODO" not in texto_calidad
        else:
            calidad_confirmada = False

    fecha_hoy = datetime.now().strftime("%Y-%m-%d %H:%M")
    lineas = [
        "# Resultados · Evaluación Empírica de Factores Externos",
        "",
        f"_Generado automáticamente el {fecha_hoy}. Solo métricas agregadas._",
        "",
    ]

    if not calidad_confirmada:
        lineas.extend(
            [
                "> [!WARNING]",
                "> **Calidad de datos pendiente de confirmación definitiva**",
                ">",
                "> La auditoría de calidad en `docs/calidad_datos.md` aún contiene `TODO`",
                "> sobre la verificación del posible desplazamiento de fechas por anonimización.",
                "> Los resultados de factores externos dependientes de calendario (festivos,",
                "> puentes, Carnaval y vacaciones) son preliminares y deben reconfirmarse una vez",
                "> que se complete dicha auditoría.",
                "",
            ]
        )

    lineas.extend(
        [
            "## Protocolo de Evaluación",
            "",
            "Cada grupo de factores se evalúa en bloque siguiendo cuatro filtros estrictos:",
            "1. **Ablación:** comparación del modelo con vs. sin el grupo en los mismos pliegues.",
            "2. **Control de estacionalidad:** el modelo base ya cuenta con día de semana y ciclo.",
            "3. **Prueba placebo:** el mismo grupo desplazado temporalmente; si aporta similar,",
            "   el aporte era espurio y el factor se descarta.",
            "4. **Estabilidad:** la mejora debe sostenerse en la mayoría de pliegues walk-forward.",
            "",
            "## Tabla Resumen de Decisión",
            "",
            "| Grupo | Decisión | Mediana | Placebo | % Pliegues | p-signo | Motivos |",
            "|---|---|---|---|---|---|---|",
        ]
    )

    tabla = ef.tabla_resultados(resultados_grupos)
    for _, f in tabla.iterrows():
        decision_emoji = "✅ Acepta" if f["decision"] == "acepta" else "❌ Descarta"
        motivos_str = f["motivos"] if f["motivos"] else "Cumple todos los criterios"
        lineas.append(
            f"| `{f['grupo']}` | {decision_emoji} | {f['mejora_mediana']:+.2%} | "
            f"{f['mejora_placebo']:+.2%} | {f['pliegues_con_mejora']:.0%} | "
            f"{f['p_signo']:.3f} | {motivos_str} |"
        )

    lineas.extend(
        [
            "",
            "## Grupos Aceptados en el Modelo Final",
            "",
        ]
    )

    aceptados = [r for r in resultados_grupos if r.aceptado]
    if aceptados:
        for r in aceptados:
            n_cols = len(r.columnas)
            cols_str = ", ".join(r.columnas)
            lineas.append(f"- **`{r.grupo}`**: {n_cols} variables ({cols_str})")
    else:
        lineas.append("- Ningún grupo superó todos los umbrales de forma concluyente.")

    lineas.append("")
    return "\n".join(lineas) + "\n"


def _generar_plantilla_reportes_todo(salida_demanda: Path, salida_factores: Path) -> None:
    """Genera plantillas de reportes con marcadores TODO cuando faltan datos crudos."""
    fecha_hoy = datetime.now().strftime("%Y-%m-%d %H:%M")

    plantilla_demanda = f"""# Resultados · Modelo de Demanda (Llegadas Diarias)

_Estructura generada el {fecha_hoy}. Marcadores pendientes según regla 3 de AI.md._

- **Datos:** `entradas_por_hora.parquet` (pendiente de extracción) · frecuencia diaria (`D`)
- **Validación:** walk-forward, horizonte 1 a 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|).

## 1. Comparación de la Escalera de Modelos

| Modelo | WAPE | MAE | RMSE | Sesgo | Mejora vs. Base |
|---|---|---|---|---|---|
| 1. Línea base (mediana 8 semanas) | TODO | TODO | TODO | TODO | Referencia |
| 2. Poisson con calendario | TODO | TODO | TODO | TODO | TODO |
| 3. LightGBM (todos los externos) | TODO | TODO | TODO | TODO | TODO |
| 4. LightGBM (grupos aceptados) | TODO | TODO | TODO | TODO | TODO |

## 2. Desempeño por Servicio

| Servicio | WAPE | MAE | Sesgo | Promedio Real |
|---|---|---|---|---|
| Urgencias | TODO | TODO | TODO | TODO |
| Rehabilitación | TODO | TODO | TODO | TODO |
| Tratamiento Urgencia | TODO | TODO | TODO | TODO |

## 3. Desempeño por Día del Horizonte (1 a 7)

| Día | WAPE | MAE | Sesgo |
|---|---|---|---|
| 1 | TODO | TODO | TODO |
| 2 | TODO | TODO | TODO |
| 3 | TODO | TODO | TODO |
| 4 | TODO | TODO | TODO |
| 5 | TODO | TODO | TODO |
| 6 | TODO | TODO | TODO |
| 7 | TODO | TODO | TODO |

## 4. Días Festivos vs. Normales

| Tipo de Día | Modelo | WAPE | MAE | Sesgo |
|---|---|---|---|---|
| Día Normal | Línea base | TODO | TODO | TODO |
| Día Normal | LightGBM Final | TODO | TODO | TODO |
| Día Festivo | Línea base | TODO | TODO | TODO |
| Día Festivo | LightGBM Final | TODO | TODO | TODO |
"""

    plantilla_factores = f"""# Resultados · Evaluación Empírica de Factores Externos

_Estructura generada el {fecha_hoy}. Marcadores pendientes según regla 3 de AI.md._

> [!WARNING]
> **Calidad de datos pendiente de confirmación definitiva**
>
> La auditoría de calidad en `docs/calidad_datos.md` aún contiene marcadores `TODO`
> sobre la verificación del posible desplazamiento de fechas por anonimización.

## Tabla Resumen de Decisión

| Grupo | Decisión | Mejora Mediana | Mejora Placebo | % Pliegues Mejora | p-valor Signo | Motivos |
|---|---|---|---|---|---|---|
| `festivos_y_puentes` | TODO | TODO | TODO | TODO | TODO | TODO |
| `carnaval_y_semana_santa` | TODO | TODO | TODO | TODO | TODO | TODO |
| `vacaciones_escolares` | TODO | TODO | TODO | TODO | TODO | TODO |
| `quincena_y_primas` | TODO | TODO | TODO | TODO | TODO | TODO |
| `clima` | TODO | TODO | TODO | TODO | TODO | TODO |
| `epidemiologia` | TODO | TODO | TODO | TODO | TODO | TODO |
"""
    salida_demanda.parent.mkdir(parents=True, exist_ok=True)
    salida_demanda.write_text(plantilla_demanda, encoding="utf-8")
    salida_factores.parent.mkdir(parents=True, exist_ok=True)
    salida_factores.write_text(plantilla_factores, encoding="utf-8")


def main() -> None:
    """Punto de entrada de línea de comandos para entrenar y evaluar la demanda."""
    from hun.data.agregados import OTROS, agrupar_bajo_volumen, fecha_corte, serie_llegadas

    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--entrada",
        default=str(config.RAW_DIR / "entradas_por_hora.parquet"),
        help="Ruta a entradas_por_hora.parquet",
    )
    parser.add_argument(
        "--externos",
        default=str(config.DATA_DIR / "externos.parquet"),
        help="Ruta a externos.parquet",
    )
    parser.add_argument(
        "--salida-demanda",
        default=str(config.ROOT_DIR / "docs/resultados/modelo_demanda.md"),
        help="Ruta donde se escribirá el reporte del modelo de demanda",
    )
    parser.add_argument(
        "--salida-factores",
        default=str(config.ROOT_DIR / "docs/resultados/factores_externos.md"),
        help="Ruta donde se escribirá el reporte de factores externos",
    )
    parser.add_argument(
        "--min-por-dia",
        type=float,
        default=1.0,
        help="Llegadas mínimas por día para no agrupar en 'Otros'",
    )
    parser.add_argument(
        "--omitir-factores",
        action="store_true",
        help="Si se activa, omite la evaluación previa de grupos de factores externos",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    entrada_path = Path(args.entrada)
    externos_path = Path(args.externos)
    salida_demanda_path = Path(args.salida_demanda)
    salida_factores_path = Path(args.salida_factores)

    if not entrada_path.exists():
        log.warning(
            "No se encontró el archivo de datos %s. Generando plantillas con "
            "marcadores TODO conforme a la regla 3 de AI.md.",
            entrada_path,
        )
        _generar_plantilla_reportes_todo(salida_demanda_path, salida_factores_path)
        log.info("Plantillas guardadas en %s y %s", salida_demanda_path, salida_factores_path)
        return

    log.info("Cargando datos de %s...", entrada_path)
    entradas = pd.read_parquet(entrada_path)
    corte = fecha_corte(entradas)
    entradas = entradas[pd.to_datetime(entradas["hora"]) < corte]
    log.info("Datos filtrados hasta fecha de corte: %s", corte)

    serie = agrupar_bajo_volumen(serie_llegadas(entradas, freq="D"), min_por_dia=args.min_por_dia)

    externos = None
    if externos_path.exists():
        log.info("Cargando factores externos de %s...", externos_path)
        externos = pd.read_parquet(externos_path)
        if "fecha" in externos.columns:
            externos = externos.set_index("fecha")

    pliegues = pliegues_walk_forward(serie["ts"])
    log.info("Generados %d pliegues walk-forward.", len(pliegues))

    nombres = None
    tipos_path = config.RAW_DIR / "tipos_visita.parquet"
    if tipos_path.exists():
        t = pd.read_parquet(tipos_path)
        nombres = dict(
            zip(t["visit_concept_id"], t["concept_name"].fillna("(sin nombre)"), strict=False)
        )
    if nombres is not None:
        nombres[OTROS] = f"Otros (< {args.min_por_dia:g} llegadas/día, agrupados)"

    grupos_seleccionados = GRUPOS_ACEPTADOS
    if not args.omitir_factores and externos is not None:
        log.info("Ejecutando evaluación de factores externos con LightGBM...")
        res_factores = ef.evaluar_grupos(
            serie, externos, pliegues, ajustar_predecir=ajustar_predecir_lgbm
        )
        aceptados = tuple(r.grupo for r in res_factores if r.aceptado)
        if aceptados:
            grupos_seleccionados = aceptados
        texto_factores = reporte_factores_markdown(res_factores)
        salida_factores_path.parent.mkdir(parents=True, exist_ok=True)
        salida_factores_path.write_text(texto_factores, encoding="utf-8")
        log.info("Reporte de factores externos guardado en %s", salida_factores_path)

    log.info("Evaluando escalera de modelos con grupos aceptados: %s...", grupos_seleccionados)
    resultados = evaluar_escalera(serie, externos, pliegues, grupos_aceptados=grupos_seleccionados)

    texto_reporte = reporte_markdown(resultados, nombres, pliegues, ruta_entrada=entrada_path.name)
    salida_demanda_path.parent.mkdir(parents=True, exist_ok=True)
    salida_demanda_path.write_text(texto_reporte, encoding="utf-8")
    log.info("Reporte del modelo de demanda guardado en %s", salida_demanda_path)


if __name__ == "__main__":
    main()
