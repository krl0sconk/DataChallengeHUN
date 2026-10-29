"""Modelos por cuantiles y explicabilidad SHAP para la demanda hospitalaria.

Implementa el cuarto escalón de la escalera predictiva (LightGBM por cuantiles p10,
p50, p90) con corrección de cuantiles cruzados y descomposición explicativa SHAP
agregada a nivel de factores legibles para personal clínico y administrativo,
según lo estipulado en AI.md secciones 5.1 y 6.
"""

from __future__ import annotations

import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np
import pandas as pd
import shap

from hun import config
from hun.models.demanda import (
    GRUPOS_ACEPTADOS,
    columnas_por_grupos,
    construir_features_demanda,
)
from hun.models.validacion import Pliegue, pliegues_walk_forward

log = logging.getLogger("explicacion")

FACTORES_LEGIBLES: tuple[str, ...] = (
    "Semana anterior",
    "Festivo",
    "Vacaciones y Navidad",
    "Día de la semana",
    "Temporada del año",
    "Lluvia",
    "Temperatura y humedad",
    "Carnaval y Semana Santa",
    "Quincena",
    "Epidemiología",
    "Servicio",
    "Otros",
)


def corregir_cuantiles_cruzados(
    p10: np.ndarray | pd.Series | list[float] | float,
    p50: np.ndarray | pd.Series | list[float] | float,
    p90: np.ndarray | pd.Series | list[float] | float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Garantiza la monotonicidad y no negatividad de los cuantiles (0 <= p10 <= p50 <= p90).

    Ordena por columnas la matriz apilada de cuantiles para eliminar cruces
    (quantile crossing) generados por regresores independientes y trunca valores
    estrictamente en cero.

    Args:
        p10: Estimaciones del cuantil 0.10.
        p50: Estimaciones del cuantil 0.50 (mediana).
        p90: Estimaciones del cuantil 0.90.

    Returns:
        Tupla con (p10_corregido, p50_corregido, p90_corregido) como arreglos 1D de numpy.
    """
    arr_p10 = np.asarray(p10, dtype=float)
    arr_p50 = np.asarray(p50, dtype=float)
    arr_p90 = np.asarray(p90, dtype=float)

    matriz = np.vstack([np.atleast_1d(arr_p10), np.atleast_1d(arr_p50), np.atleast_1d(arr_p90)])
    matriz_ordenada = np.sort(matriz, axis=0)
    matriz_truncada = np.maximum(0.0, matriz_ordenada)

    return matriz_truncada[0], matriz_truncada[1], matriz_truncada[2]


def entrenar_modelos_cuantiles(
    train: pd.DataFrame,
    columnas: list[str],
    cuantiles: tuple[float, ...] = (0.10, 0.50, 0.90),
) -> dict[float, lgb.LGBMRegressor]:
    """Entrena modelos LightGBM independientes para cada cuantil especificado.

    Aplica la misma selección de columnas y filtrado anti-fuga que el modelo final
    de demanda, ajustando un `LGBMRegressor` con objetivo quantile para cada nivel alpha.

    Args:
        train: DataFrame de entrenamiento con features y variable objetivo `y`.
        columnas: Lista de nombres de columnas predictoras.
        cuantiles: Niveles de cuantil a estimar (por defecto: 0.10, 0.50, 0.90).

    Returns:
        Diccionario que mapea cada cuantil al modelo ajustado.
    """
    cols = list(columnas)
    if "serie_cod" in train.columns and "serie_cod" not in cols:
        cols.append("serie_cod")
    elif "serie" in train.columns and "serie" not in cols and "serie_cod" not in train.columns:
        cols.append("serie")

    train_valid = train[train["y"].notna() & (train["y"] >= 0)].copy()

    filtro_rezagos = [c for c in ("rezago_prom_4s", "llegadas_lag_7") if c in cols]
    if filtro_rezagos:
        filtrado = train_valid.dropna(subset=[filtro_rezagos[0]])
        if len(filtrado) > 0:
            train_valid = filtrado

    cats = [c for c in ("serie_cod", "serie") if c in cols]

    modelos: dict[float, lgb.LGBMRegressor] = {}
    for q in cuantiles:
        reg = lgb.LGBMRegressor(
            objective="quantile",
            alpha=q,
            random_state=config.RANDOM_SEED,
            n_estimators=200,
            learning_rate=0.05,
            num_leaves=15,
            min_child_samples=15,
            verbose=-1,
        )
        if len(train_valid) > 0:
            reg.fit(
                train_valid[cols],
                train_valid["y"],
                categorical_feature=cats if cats else "auto",
            )
        modelos[q] = reg

    return modelos


def predecir_intervalos(
    modelos_q: dict[float, lgb.LGBMRegressor],
    test: pd.DataFrame,
    columnas: list[str],
) -> pd.DataFrame:
    """Genera predicciones por cuantiles p10, p50 y p90 sin cruces de cuantiles.

    Args:
        modelos_q: Diccionario de modelos LightGBM ajustados para cuantiles.
        test: DataFrame de observaciones a predecir.
        columnas: Columnas de features requeridas por los modelos.

    Returns:
        DataFrame con columnas `pred_p10`, `pred_p50` y `pred_p90` con el mismo índice que `test`.
    """
    if len(test) == 0:
        return pd.DataFrame(columns=["pred_p10", "pred_p50", "pred_p90"])

    cols = list(columnas)
    if "serie_cod" in test.columns and "serie_cod" not in cols:
        cols.append("serie_cod")
    elif "serie" in test.columns and "serie" not in cols and "serie_cod" not in test.columns:
        cols.append("serie")

    def _obtener_modelo(q_obj: float) -> lgb.LGBMRegressor | None:
        if not modelos_q:
            return None
        cercana = min(modelos_q.keys(), key=lambda k: abs(k - q_obj))
        return modelos_q[cercana]

    mod_10 = _obtener_modelo(0.10)
    mod_50 = _obtener_modelo(0.50)
    mod_90 = _obtener_modelo(0.90)

    raw_p10 = (
        np.asarray(mod_10.predict(test[cols]), dtype=float)
        if mod_10 is not None
        else np.zeros(len(test))
    )
    raw_p50 = (
        np.asarray(mod_50.predict(test[cols]), dtype=float)
        if mod_50 is not None
        else np.zeros(len(test))
    )
    raw_p90 = (
        np.asarray(mod_90.predict(test[cols]), dtype=float)
        if mod_90 is not None
        else np.zeros(len(test))
    )

    p10_c, p50_c, p90_c = corregir_cuantiles_cruzados(raw_p10, raw_p50, raw_p90)

    return pd.DataFrame(
        {
            "pred_p10": p10_c,
            "pred_p50": p50_c,
            "pred_p90": p90_c,
        },
        index=test.index,
    )


def cobertura_intervalo(y: np.ndarray, p10: np.ndarray, p90: np.ndarray) -> float:
    """Calcula la proporción real de observaciones que caen dentro del intervalo [p10, p90].

    Args:
        y: Arreglo de valores reales observados.
        p10: Arreglo de límites inferiores del intervalo.
        p90: Arreglo de límites superiores del intervalo.

    Returns:
        Proporción empírica entre 0.0 y 1.0 (objetivo nominal: ~0.80).
    """
    arr_y = np.asarray(y, dtype=float)
    arr_p10 = np.asarray(p10, dtype=float)
    arr_p90 = np.asarray(p90, dtype=float)

    mascara_valida = ~np.isnan(arr_y) & ~np.isnan(arr_p10) & ~np.isnan(arr_p90)
    if not np.any(mascara_valida):
        return 0.0

    y_val = arr_y[mascara_valida]
    p10_val = arr_p10[mascara_valida]
    p90_val = arr_p90[mascara_valida]

    dentro = (y_val >= p10_val) & (y_val <= p90_val)
    return float(np.mean(dentro))


def evaluar_cuantiles_walk_forward(
    serie: pd.DataFrame,
    externos: pd.DataFrame | None,
    pliegues: list[Pliegue],
    columnas: list[str] | None = None,
) -> pd.DataFrame:
    """Evalúa los modelos cuantílicos en todos los pliegues walk-forward.

    Args:
        serie: DataFrame con columnas `ts`, `serie` e `y`.
        externos: DataFrame opcional con variables de calendario y clima.
        pliegues: Pliegues temporales para validación sin fuga.
        columnas: Columnas de features a incluir. Si es None, utiliza los grupos aceptados.

    Returns:
        DataFrame con columnas `ts`, `serie`, `y`, `pred_p10`, `pred_p50`, `pred_p90`,
        `en_intervalo`, `pliegue`, `origen`, `dia_horizonte`, `es_festivo`.
    """
    ext_cols = list(externos.columns) if externos is not None else []
    cols = columnas or columnas_por_grupos(ext_cols, grupos_incluidos=GRUPOS_ACEPTADOS)

    partes: list[pd.DataFrame] = []
    for p in pliegues:
        df_feat = construir_features_demanda(serie, externos, origen=p.origen)
        train = p.entrenamiento(df_feat)
        test = p.prueba(df_feat)

        modelos_q = entrenar_modelos_cuantiles(train, cols)
        df_int = predecir_intervalos(modelos_q, test, cols)

        dia_h = ((test["ts"] - p.origen) // pd.Timedelta("1D")).astype(int) + 1
        es_fest = test["es_festivo"].astype(int) if "es_festivo" in test.columns else 0

        y_vals = test["y"].to_numpy()
        p10_vals = df_int["pred_p10"].to_numpy()
        p90_vals = df_int["pred_p90"].to_numpy()
        en_intervalo = (y_vals >= p10_vals) & (y_vals <= p90_vals)

        parte = pd.DataFrame(
            {
                "ts": test["ts"].values,
                "serie": test["serie"].values,
                "y": y_vals,
                "pred_p10": p10_vals,
                "pred_p50": df_int["pred_p50"].to_numpy(),
                "pred_p90": p90_vals,
                "en_intervalo": en_intervalo,
                "pliegue": p.numero,
                "origen": p.origen,
                "dia_horizonte": dia_h.values if hasattr(dia_h, "values") else dia_h,
                "es_festivo": es_fest.values if hasattr(es_fest, "values") else es_fest,
            }
        )
        partes.append(parte)

    if not partes:
        return pd.DataFrame(
            columns=[
                "ts",
                "serie",
                "y",
                "pred_p10",
                "pred_p50",
                "pred_p90",
                "en_intervalo",
                "pliegue",
                "origen",
                "dia_horizonte",
                "es_festivo",
            ]
        )
    return pd.concat(partes, ignore_index=True)


def agrupar_columna_factor(col: str) -> str:
    """Asigna una variable técnica del modelo a un factor contextual comprensible.

    Args:
        col: Nombre técnico de la columna de feature.

    Returns:
        Nombre legible del factor (ej: 'Semana anterior', 'Festivo', 'Lluvia').
    """
    c = col.lower()
    if c.startswith("llegadas_lag_") or c.startswith("rezago_"):
        return "Semana anterior"
    if (
        c
        in {
            "es_festivo",
            "es_puente",
            "es_dia_no_laboral",
            "dia_post_festivo",
            "dias_a_festivo",
            "dias_desde_festivo",
            "nombre_festivo",
        }
        or "festivo" in c
        or c == "es_puente"
    ):
        return "Festivo"
    if (
        c in {"es_vacaciones_escolares", "vacaciones_es_estimado", "temporada_navidad"}
        or "vacaciones" in c
        or "navidad" in c
    ):
        return "Vacaciones y Navidad"
    if (
        c in {"dia_semana", "es_fin_de_semana", "sin_dia_semana", "cos_dia_semana"}
        or "dia_semana" in c
        or c == "es_fin_de_semana"
    ):
        return "Día de la semana"
    if (
        c
        in {
            "mes",
            "dia_anio",
            "sin_dia_anio",
            "cos_dia_anio",
            "temporada_lluvias",
            "anio",
            "dia_mes",
            "semana_iso",
        }
        or "dia_anio" in c
        or "temporada_lluvias" in c
    ):
        return "Temporada del año"
    if (
        c.startswith("clima_precipitation")
        or c.startswith("clima_lluvia")
        or c.startswith("clima_dia_lluvioso")
        or "lluvia" in c
        or "precip" in c
    ):
        return "Lluvia"
    if c.startswith("clima_") or "temperatura" in c or "humedad" in c or "viento" in c:
        return "Temperatura y humedad"
    if (
        c
        in {
            "es_carnaval",
            "es_precarnaval",
            "es_semana_santa",
            "dias_a_carnaval",
            "dias_desde_carnaval",
        }
        or "carnaval" in c
        or "semana_santa" in c
    ):
        return "Carnaval y Semana Santa"
    if (
        c in {"es_dia_pago", "dias_desde_pago", "semana_de_pago", "es_mes_prima"}
        or "pago" in c
        or "quincena" in c
        or "prima" in c
    ):
        return "Quincena"
    if c.startswith("epi_") or "sivigila" in c:
        return "Epidemiología"
    if c in {"serie", "serie_cod"}:
        return "Servicio"
    return "Otros"


def explicar_prediccion_shap(
    modelo: Any,
    X: pd.DataFrame,
    columnas: list[str],
    top_k: int = 5,
    excluir_servicio: bool = True,
) -> list[list[tuple[str, float]]]:
    """Calcula las explicaciones SHAP agregadas por factores conceptuales legibles.

    Utiliza `shap.TreeExplainer` sobre el modelo y suma los aportes de las
    variables individuales pertenecientes a cada categoría legible.

    Args:
        modelo: Modelo de árbol entrenado (por ejemplo `LGBMRegressor`).
        X: DataFrame con las observaciones a explicar.
        columnas: Lista de columnas predictoras utilizadas en el ajuste.
        top_k: Número máximo de factores principales a incluir por observación.
        excluir_servicio: Si es True, excluye el factor 'Servicio' para concentrarse
            en los factores contextuales (calendario, clima, rezagos).

    Returns:
        Lista donde cada elemento corresponde a una fila de `X` y contiene una lista de
        tuplas `(nombre_factor, aporte)` ordenadas por `abs(aporte)` descendente.
    """
    if len(X) == 0:
        return []

    cols = list(columnas)
    if hasattr(modelo, "feature_name_") and modelo.feature_name_:
        cols = list(modelo.feature_name_)
    elif hasattr(modelo, "booster_") and hasattr(modelo.booster_, "feature_name"):
        cols = list(modelo.booster_.feature_name())
    elif "serie_cod" in X.columns and "serie_cod" not in cols:
        cols.append("serie_cod")
    elif "serie" in X.columns and "serie" not in cols and "serie_cod" not in X.columns:
        cols.append("serie")

    X_sub = X[cols]
    explainer = shap.TreeExplainer(modelo)
    shap_vals = explainer.shap_values(X_sub)

    if hasattr(shap_vals, "values"):
        shap_mat = np.asarray(shap_vals.values)
    else:
        shap_mat = np.asarray(shap_vals)

    if shap_mat.ndim == 1:
        shap_mat = shap_mat.reshape(1, -1)

    factores_cols = [agrupar_columna_factor(c) for c in cols]

    explicaciones: list[list[tuple[str, float]]] = []
    for i in range(len(X)):
        fila_shap = shap_mat[i]
        sumas: dict[str, float] = {}
        for factor, val in zip(factores_cols, fila_shap, strict=False):
            if excluir_servicio and factor == "Servicio":
                continue
            sumas[factor] = sumas.get(factor, 0.0) + float(val)

        lista_tuplas = [(fac, round(v, 1)) for fac, v in sumas.items() if round(v, 1) != 0.0]
        if not lista_tuplas and sumas:
            lista_tuplas = [(fac, round(v, 2)) for fac, v in sumas.items()]

        lista_ordenada = sorted(lista_tuplas, key=lambda item: abs(item[1]), reverse=True)
        explicaciones.append(lista_ordenada[:top_k])

    return explicaciones


def reporte_markdown(
    df_cuantiles: pd.DataFrame,
    ejemplos_shap: list[dict[str, Any]] | None = None,
    nombres_series: dict[Any, str] | None = None,
    ruta_entrada: str = "entradas_por_hora.parquet",
) -> str:
    """Genera el contenido markdown con los resultados de intervalos y SHAP.

    Args:
        df_cuantiles: DataFrame resultante de `evaluar_cuantiles_walk_forward`.
        ejemplos_shap: Lista opcional de ejemplos explicativos con sus factores.
        nombres_series: Mapeo opcional de identificadores de servicio a nombres legibles.
        ruta_entrada: Nombre del archivo de datos de entrada.

    Returns:
        Cadena de texto con formato Markdown.
    """
    nombres_series = nombres_series or {}
    fecha_hoy = datetime.now().strftime("%Y-%m-%d %H:%M")

    cob_global = cobertura_intervalo(
        df_cuantiles["y"].to_numpy(),
        df_cuantiles["pred_p10"].to_numpy(),
        df_cuantiles["pred_p90"].to_numpy(),
    )
    amplitud_global = float(np.mean(df_cuantiles["pred_p90"] - df_cuantiles["pred_p10"]))

    lineas = [
        "# Resultados · Intervalos Cuantílicos (p10, p50, p90) y Explicabilidad SHAP",
        "",
        f"_Generado automáticamente por `python -m hun.models.explicacion` el {fecha_hoy}._",
        "",
        f"- **Datos:** `{ruta_entrada}` · frecuencia diaria (`D`)",
        "- **Modelo:** LightGBM por cuantiles (p10, p50, p90) con corrección de cruces.",
        "- **Intervalo objetivo:** p10–p90 (cobertura nominal esperada: 80.0 %).",
        f"- **Cobertura real global:** **{cob_global:.1%}** "
        f"(amplitud media: {amplitud_global:.1f} pacientes).",
        "",
        "## 1. Cobertura Empírica por Servicio",
        "",
        "| Servicio | Cobertura p10–p90 | Lím. Inf. (p10) | Mediana (p50) | "
        "Lím. Sup. (p90) | Amplitud |",
        "|---|---|---|---|---|---|",
    ]

    for s, grp in df_cuantiles.groupby("serie"):
        nom = nombres_series.get(s, str(s))
        cob_s = cobertura_intervalo(
            grp["y"].to_numpy(), grp["pred_p10"].to_numpy(), grp["pred_p90"].to_numpy()
        )
        p10_m = grp["pred_p10"].mean()
        p50_m = grp["pred_p50"].mean()
        p90_m = grp["pred_p90"].mean()
        amp_m = (grp["pred_p90"] - grp["pred_p10"]).mean()
        lineas.append(
            f"| {nom} | {cob_s:.1%} | {p10_m:.1f} | {p50_m:.1f} | {p90_m:.1f} | {amp_m:.1f} |"
        )

    lineas.extend(
        [
            "",
            "## 2. Cobertura por Día del Horizonte (1 a 7)",
            "",
            "| Día Horizonte | Cobertura p10–p90 | Amplitud Media |",
            "|---|---|---|",
        ]
    )

    for h, grp in df_cuantiles.groupby("dia_horizonte"):
        cob_h = cobertura_intervalo(
            grp["y"].to_numpy(), grp["pred_p10"].to_numpy(), grp["pred_p90"].to_numpy()
        )
        amp_h = (grp["pred_p90"] - grp["pred_p10"]).mean()
        lineas.append(f"| Día {h} | {cob_h:.1%} | {amp_h:.1f} |")

    lineas.extend(
        [
            "",
            "## 3. Corrección de Cuantiles Cruzados",
            "",
            "Se aplica ordenamiento monotónico `0 <= p10 <= p50 <= p90` y truncamiento en cero.",
            "Esta transformación previene inconsistencias lógicas en el consumo web sin "
            "distorsionar la calibración global del modelo.",
            "",
            "## 4. Ejemplos de Explicación SHAP por Factores Legibles",
            "",
        ]
    )

    if ejemplos_shap:
        for idx, ej in enumerate(ejemplos_shap, start=1):
            lineas.append(f"### Ejemplo {idx}: {ej.get('descripcion', 'Escenario de Predicción')}")
            lineas.append(
                f"- **Servicio:** {ej.get('servicio', 'N/D')} · **Fecha:** {ej.get('fecha', 'N/D')}"
            )
            lineas.append(
                f"- **Predicción (p50):** {ej.get('prediccion', 'N/D')} "
                f"[Intervalo p10–p90: {ej.get('min', 'N/D')} – {ej.get('max', 'N/D')}]"
            )
            lineas.append("- **Aportes por factor:**")
            for factor, val in ej.get("factores", []):
                signo = "+" if val > 0 else ""
                lineas.append(f"  - **{factor}:** {signo}{val:.1f} pacientes")
            lineas.append("")
    else:
        lineas.append("_No se especificaron ejemplos individuales._")
        lineas.append("")

    return "\n".join(lineas)


def _generar_plantilla_todo(salida: Path) -> None:
    """Genera la estructura de resultados con marcadores TODO conforme a la regla 3 de AI.md."""
    fecha_hoy = datetime.now().strftime("%Y-%m-%d %H:%M")
    contenido = f"""# Resultados · Intervalos Cuantílicos (p10, p50, p90) y Explicabilidad SHAP

_Estructura generada el {fecha_hoy}. Marcadores pendientes según regla 3 de AI.md._

- **Datos:** `entradas_por_hora.parquet` (pendiente de extracción) · frecuencia diaria (`D`)
- **Modelo:** LightGBM por cuantiles (`p10=0.10`, `p50=0.50`, `p90=0.90`) con corrección de cruces.
- **Intervalo objetivo:** p10–p90 (cobertura nominal: 80.0 %).
- **Cobertura real global:** TODO: completar con resultado real

## 1. Cobertura Empírica por Servicio

| Servicio | Cobertura p10–p90 | Lím. Inf. (p10) | Mediana (p50) | Lím. Sup. (p90) | Amplitud |
|---|---|---|---|---|---|
| Urgencias | TODO: completar con resultado real | TODO | TODO | TODO | TODO |
| Rehabilitación | TODO: completar con resultado real | TODO | TODO | TODO | TODO |
| Tratamiento Urgencia | TODO: completar con resultado real | TODO | TODO | TODO | TODO |

## 2. Cobertura por Día del Horizonte (1 a 7)

| Día Horizonte | Cobertura p10–p90 | Amplitud Media |
|---|---|---|
| Día 1 | TODO: completar con resultado real | TODO |
| Día 2 | TODO: completar con resultado real | TODO |
| Día 3 | TODO: completar con resultado real | TODO |
| Día 4 | TODO: completar con resultado real | TODO |
| Día 5 | TODO: completar con resultado real | TODO |
| Día 6 | TODO: completar con resultado real | TODO |
| Día 7 | TODO: completar con resultado real | TODO |

## 3. Corrección de Cuantiles Cruzados

Se aplica ordenamiento monotónico `0 <= p10 <= p50 <= p90` y truncamiento en cero.

- **Porcentaje de cruces detectados y corregidos:** TODO: completar con resultado real

## 4. Ejemplos de Explicación SHAP por Factores Legibles

### Ejemplo 1: Lunes Festivo en Urgencias
- **Servicio:** Urgencias · **Fecha:** TODO: completar con resultado real
- **Predicción (p50):** TODO [Intervalo p10–p90: TODO – TODO]
- **Aportes por factor:**
  - **Festivo:** TODO: completar con resultado real
  - **Día de la semana:** TODO: completar con resultado real
  - **Semana anterior:** TODO: completar con resultado real

### Ejemplo 2: Jornada Regular Entre Semana
- **Servicio:** Rehabilitación · **Fecha:** TODO: completar con resultado real
- **Predicción (p50):** TODO [Intervalo p10–p90: TODO – TODO]
- **Aportes por factor:**
  - **Día de la semana:** TODO: completar con resultado real
  - **Semana anterior:** TODO: completar con resultado real
  - **Temporada del año:** TODO: completar con resultado real

### Ejemplo 3: Fin de Semana en Temporada Especial
- **Servicio:** Urgencias · **Fecha:** TODO: completar con resultado real
- **Predicción (p50):** TODO [Intervalo p10–p90: TODO – TODO]
- **Aportes por factor:**
  - **Vacaciones y Navidad:** TODO: completar con resultado real
  - **Día de la semana:** TODO: completar con resultado real
  - **Quincena:** TODO: completar con resultado real
"""
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(contenido, encoding="utf-8")


def main() -> None:
    """Punto de entrada de línea de comandos para intervalos y SHAP."""
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
        "--salida",
        default=str(config.ROOT_DIR / "docs/resultados/intervalos_shap.md"),
        help="Ruta donde se escribirá el reporte de intervalos y SHAP",
    )
    parser.add_argument(
        "--min-por-dia",
        type=float,
        default=1.0,
        help="Llegadas mínimas por día para no agrupar en 'Otros'",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    entrada_path = Path(args.entrada)
    externos_path = Path(args.externos)
    salida_path = Path(args.salida)

    if not entrada_path.exists():
        log.warning(
            "No se encontró el archivo de datos %s. Generando plantilla con "
            "marcadores TODO conforme a la regla 3 de AI.md.",
            entrada_path,
        )
        _generar_plantilla_todo(salida_path)
        log.info("Plantilla guardada en %s", salida_path)
        return

    log.info("Cargando datos de %s...", entrada_path)
    entradas = pd.read_parquet(entrada_path)
    corte = fecha_corte(entradas)
    entradas = entradas[pd.to_datetime(entradas["hora"]) < corte]

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

    log.info("Evaluando modelos cuantílicos walk-forward...")
    df_cuantiles = evaluar_cuantiles_walk_forward(serie, externos, pliegues)

    # Entrenar modelo cuantil p50 final para ejemplos SHAP
    ext_cols = list(externos.columns) if externos is not None else []
    cols = columnas_por_grupos(ext_cols, grupos_incluidos=GRUPOS_ACEPTADOS)
    df_feat = construir_features_demanda(serie, externos)
    modelos_finales = entrenar_modelos_cuantiles(df_feat, cols)
    modelo_p50 = modelos_finales[0.50]

    # Seleccionar 3 ejemplos representativos
    ejemplos_df = df_feat.dropna(subset=["llegadas_lag_7"]).tail(3)
    exps = explicar_prediccion_shap(modelo_p50, ejemplos_df, cols)
    preds_ej = predecir_intervalos(modelos_finales, ejemplos_df, cols)

    ejemplos_shap = []
    for idx_row in range(len(ejemplos_df)):
        fila = ejemplos_df.iloc[idx_row]
        p_row = preds_ej.iloc[idx_row]
        serv_nom = nombres.get(fila["serie"], str(fila["serie"])) if nombres else str(fila["serie"])
        ejemplos_shap.append(
            {
                "descripcion": f"Registro {idx_row + 1}",
                "servicio": serv_nom,
                "fecha": str(fila["ts"])[:10],
                "prediccion": int(round(p_row["pred_p50"])),
                "min": int(round(p_row["pred_p10"])),
                "max": int(round(p_row["pred_p90"])),
                "factores": exps[idx_row],
            }
        )

    texto_reporte = reporte_markdown(
        df_cuantiles, ejemplos_shap, nombres, ruta_entrada=entrada_path.name
    )
    salida_path.parent.mkdir(parents=True, exist_ok=True)
    salida_path.write_text(texto_reporte, encoding="utf-8")
    log.info("Reporte de intervalos y SHAP guardado en %s", salida_path)


if __name__ == "__main__":
    main()
