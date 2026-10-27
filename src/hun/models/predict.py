"""Contrato canónico modelo–web para predicción de llegadas hospitalarias.

Define la interfaz pública `predecir()` acordada para consumo de la aplicación web
y dashboards del Hospital Universidad del Norte (HUN), documentada en AI.md sección 6.
Integra corrección de cuantiles cruzados y factores explicativos legibles.
"""

from __future__ import annotations

import logging
import unicodedata
from datetime import date, timedelta
from typing import Any, Literal

import holidays
import pandas as pd

from hun import config
from hun.models.explicacion import (
    corregir_cuantiles_cruzados,
    explicar_prediccion_shap,
    predecir_intervalos,
)

log = logging.getLogger("predict")

# Concept IDs OMOP y nombres normalizados de servicios principales
SERVICIOS_CANONICOS: dict[str, str] = {
    "urgencias": "urgencias",
    "emergency room visit": "urgencias",
    "9203": "urgencias",
    "rehabilitacion": "rehabilitacion",
    "rehabilitacion ambulatoria": "rehabilitacion",
    "ambulatory rehabilitation visit": "rehabilitacion",
    "581479": "rehabilitacion",
    "tratamiento_urgencia": "tratamiento_urgencia",
    "tratamiento urgencia": "tratamiento_urgencia",
    "urgencia-tratamiento": "tratamiento_urgencia",
    "treatment urgency": "tratamiento_urgencia",
    "3045729": "tratamiento_urgencia",
    "otros": "otros",
    "hospitalizacion": "otros",
    "inpatient visit": "otros",
    "9201": "otros",
}

# Parámetros operativos históricos por servicio (base de estimación y semáforo)
# Referencia: docs/objetivo_prediccion.md
PARAMETROS_SERVICIO: dict[str, dict[str, Any]] = {
    "urgencias": {
        "media_diaria": 443,
        "p10_ratio": 0.85,
        "p90_ratio": 1.15,
        "umbral_p75": 490,
        "umbral_p90": 540,
    },
    "rehabilitacion": {
        "media_diaria": 827,
        "p10_ratio": 0.88,
        "p90_ratio": 1.12,
        "umbral_p75": 880,
        "umbral_p90": 940,
    },
    "tratamiento_urgencia": {
        "media_diaria": 15,
        "p10_ratio": 0.70,
        "p90_ratio": 1.30,
        "umbral_p75": 18,
        "umbral_p90": 22,
    },
    "otros": {
        "media_diaria": 1,
        "p10_ratio": 0.0,
        "p90_ratio": 2.0,
        "umbral_p75": 2,
        "umbral_p90": 4,
    },
}

_EXTERNOS_DF: pd.DataFrame | None = None
_EXTERNOS_CARGADO: bool = False


def _obtener_externos_cache() -> pd.DataFrame | None:
    """Carga perezosamente los factores externos desde `data/externos.parquet`."""
    global _EXTERNOS_DF, _EXTERNOS_CARGADO
    if not _EXTERNOS_CARGADO:
        _EXTERNOS_CARGADO = True
        ruta_externos = config.DATA_DIR / "externos.parquet"
        if ruta_externos.exists():
            try:
                df = pd.read_parquet(ruta_externos)
                if "fecha" in df.columns:
                    df["_fecha_dt"] = pd.to_datetime(df["fecha"]).dt.date
                    _EXTERNOS_DF = df.drop_duplicates(subset=["_fecha_dt"]).set_index("_fecha_dt")
                elif isinstance(df.index, pd.DatetimeIndex):
                    df["_fecha_dt"] = df.index.date
                    _EXTERNOS_DF = df.drop_duplicates(subset=["_fecha_dt"]).set_index("_fecha_dt")
            except Exception as e:
                log.warning("No se pudo cargar externos.parquet en predict: %s", e)
                _EXTERNOS_DF = None
    return _EXTERNOS_DF


def _limpiar_texto(texto: str) -> str:
    """Elimina tildes y caracteres especiales para comparación insensible."""
    texto_norm = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in texto_norm if not unicodedata.combining(c)).strip().lower()


def normalizar_servicio(servicio: str) -> str:
    """Convierte cualquier variante de nombre o concept_id al servicio canónico.

    Args:
        servicio: Nombre o código de servicio (ej: 'Urgencias', '9203').

    Returns:
        Identificador canónico ('urgencias', 'rehabilitacion', 'tratamiento_urgencia', 'otros').
    """
    limpio = _limpiar_texto(servicio)
    if limpio in SERVICIOS_CANONICOS:
        return SERVICIOS_CANONICOS[limpio]

    for clave, valor in SERVICIOS_CANONICOS.items():
        if clave in limpio:
            return valor

    return "otros"


def _determinar_alerta(
    prediccion: int, servicio_canonico: str
) -> Literal["verde", "amarillo", "rojo"]:
    """Determina el nivel de alerta según umbrales percentiles del servicio."""
    params = PARAMETROS_SERVICIO.get(servicio_canonico, PARAMETROS_SERVICIO["otros"])
    if prediccion > params["umbral_p90"]:
        return "rojo"
    if prediccion >= params["umbral_p75"]:
        return "amarillo"
    return "verde"


def predecir(
    fecha: date,
    servicio: str,
    *,
    modelos_cuantiles: dict[float, Any] | None = None,
    modelo_explicador: Any | None = None,
    X_fecha: pd.DataFrame | None = None,
    columnas: list[str] | None = None,
) -> dict[str, Any]:
    """Devuelve la predicción de llegadas para un servicio en una fecha.

    Cumple estrictamente con el contrato modelo–web estipulado en AI.md sección 6.

    Args:
        fecha: Fecha objetivo para la cual se pronostica la demanda.
        servicio: Nombre del servicio o visit_concept_id.
        modelos_cuantiles: Diccionario opcional de modelos entrenados para p10, p50 y p90.
        modelo_explicador: Modelo opcional para descomposición SHAP de la fecha.
        X_fecha: DataFrame opcional con features de la fecha a predecir.
        columnas: Columnas requeridas por los modelos opcionales.

    Returns:
        Diccionario con la siguiente estructura:
            - prediccion (int): Mediana pronosticada (p50).
            - min (int): Límite inferior del intervalo de confianza (p10).
            - max (int): Límite superior del intervalo de confianza (p90).
            - alerta (str): Nivel de saturación ('verde' | 'amarillo' | 'rojo').
            - factores (list[tuple[str, float]]): Aportes de variables ordenados por magnitud.
    """
    servicio_canonico = normalizar_servicio(servicio)
    params = PARAMETROS_SERVICIO[servicio_canonico]
    base = params["media_diaria"]

    # Modo 1: Si se provee modelo cuantílico y fila de features
    if modelos_cuantiles is not None and X_fecha is not None and columnas is not None:
        df_int = predecir_intervalos(modelos_cuantiles, X_fecha, columnas)
        p10_raw = float(df_int["pred_p10"].iloc[0])
        p50_raw = float(df_int["pred_p50"].iloc[0])
        p90_raw = float(df_int["pred_p90"].iloc[0])

        p10_c, p50_c, p90_c = corregir_cuantiles_cruzados(p10_raw, p50_raw, p90_raw)
        p10_val = max(0, int(round(float(p10_c[0] if hasattr(p10_c, "__len__") else p10_c))))
        p50_val = max(0, int(round(float(p50_c[0] if hasattr(p50_c, "__len__") else p50_c))))
        p90_val = max(0, int(round(float(p90_c[0] if hasattr(p90_c, "__len__") else p90_c))))

        p10_val = min(p10_val, p50_val)
        p90_val = max(p90_val, p50_val)

        factores: list[tuple[str, float]] = []
        if modelo_explicador is not None:
            exps = explicar_prediccion_shap(modelo_explicador, X_fecha, columnas)
            if exps:
                factores = exps[0]

        alerta = _determinar_alerta(p50_val, servicio_canonico)
        return {
            "prediccion": p50_val,
            "min": p10_val,
            "max": p90_val,
            "alerta": alerta,
            "factores": factores,
        }

    # Modo 2: Estimación enriquecida con calendario y factores externos
    ext_df = _obtener_externos_cache()
    fila_ext = ext_df.loc[fecha] if (ext_df is not None and fecha in ext_df.index) else None

    dia_semana = fecha.weekday()  # 0=Lunes, 6=Domingo

    if fila_ext is not None:
        es_festivo = int(fila_ext.get("es_festivo", 0))
        es_vacaciones = int(fila_ext.get("es_vacaciones_escolares", 0))
        es_navidad = int(fila_ext.get("temporada_navidad", 0))
        es_carnaval = int(fila_ext.get("es_carnaval", 0))
        es_semana_santa = int(fila_ext.get("es_semana_santa", 0))
        es_dia_pago = int(fila_ext.get("es_dia_pago", 0))
    else:
        co_h = holidays.Colombia(years=[fecha.year])
        es_festivo = int(fecha in co_h)
        es_vacaciones = int(fecha.month in (6, 7, 12))
        es_navidad = int(
            (fecha.month == 12 and fecha.day >= 7) or (fecha.month == 1 and fecha.day <= 6)
        )
        es_carnaval = 0
        es_semana_santa = 0
        es_dia_pago = int(fecha.day in (15, 30, 31))

    factores_dict: dict[str, float] = {}

    if servicio_canonico == "urgencias":
        # Patrón semanal en urgencias
        if dia_semana == 0:
            factores_dict["Día de la semana"] = round(base * 0.08, 1)
        elif dia_semana in (5, 6):
            factores_dict["Día de la semana"] = round(base * 0.05, 1)

        # Festivos
        if es_festivo:
            factores_dict["Festivo"] = round(base * 0.06, 1)

        # Vacaciones y Navidad
        if es_vacaciones or es_navidad:
            factores_dict["Vacaciones y Navidad"] = round(base * 0.04, 1)

        # Carnaval y Semana Santa
        if es_carnaval or es_semana_santa:
            factores_dict["Carnaval y Semana Santa"] = round(base * 0.10, 1)

        # Quincena
        if es_dia_pago:
            factores_dict["Quincena"] = round(base * 0.04, 1)

    elif servicio_canonico == "rehabilitacion":
        # En rehabilitación: cierre o reducción en fines de semana
        if dia_semana == 6:
            factores_dict["Día de la semana"] = -round(base * 0.85, 1)
        elif dia_semana == 5:
            factores_dict["Día de la semana"] = -round(base * 0.40, 1)

        # Cierre en festivos
        if es_festivo:
            factores_dict["Festivo"] = -round(base * 0.85, 1)

        # Vacaciones escolares
        if es_vacaciones or es_navidad:
            factores_dict["Vacaciones y Navidad"] = -round(base * 0.08, 1)

        if es_dia_pago:
            factores_dict["Quincena"] = round(base * 0.02, 1)

    elif servicio_canonico == "tratamiento_urgencia":
        if dia_semana in (5, 6):
            factores_dict["Día de la semana"] = round(base * 0.05, 1)
        if es_festivo:
            factores_dict["Festivo"] = round(base * 0.05, 1)
        if es_dia_pago:
            factores_dict["Quincena"] = round(base * 0.04, 1)

    else:
        if es_dia_pago:
            factores_dict["Quincena"] = round(base * 0.04, 1)

    ajuste_total = sum(factores_dict.values())
    pred_val_raw = max(0.0, float(base + ajuste_total))
    p10_raw = float(pred_val_raw * params["p10_ratio"])
    p90_raw = float(pred_val_raw * params["p90_ratio"])

    p10_c, p50_c, p90_c = corregir_cuantiles_cruzados(p10_raw, pred_val_raw, p90_raw)

    p10_int = max(0, int(round(float(p10_c[0] if hasattr(p10_c, "__len__") else p10_c))))
    p50_int = max(0, int(round(float(p50_c[0] if hasattr(p50_c, "__len__") else p50_c))))
    p90_int = max(0, int(round(float(p90_c[0] if hasattr(p90_c, "__len__") else p90_c))))

    # Garantizar invariantes monotónicos
    p10_int = min(p10_int, p50_int)
    p90_int = max(p90_int, p50_int)

    # Ordenar factores por magnitud absoluta descendente
    factores_tuplas = [(k, v) for k, v in factores_dict.items() if round(v, 1) != 0.0]
    factores_ordenados = sorted(factores_tuplas, key=lambda x: abs(x[1]), reverse=True)

    alerta = _determinar_alerta(p50_int, servicio_canonico)

    return {
        "prediccion": p50_int,
        "min": p10_int,
        "max": p90_int,
        "alerta": alerta,
        "factores": factores_ordenados,
    }


def predecir_rango(fecha_inicio: date, fecha_fin: date, servicio: str) -> list[dict[str, Any]]:
    """Genera predicciones diarias consecutivas dentro de un intervalo de fechas.

    Args:
        fecha_inicio: Fecha inicial del rango.
        fecha_fin: Fecha final del rango (inclusive).
        servicio: Nombre o identificador del servicio.

    Returns:
        Lista de diccionarios, cada uno con los campos del contrato más el campo 'fecha'.
    """
    resultado: list[dict[str, Any]] = []
    cursor = fecha_inicio
    while cursor <= fecha_fin:
        pred = predecir(cursor, servicio)
        pred_con_fecha = {"fecha": cursor, **pred}
        resultado.append(pred_con_fecha)
        cursor += timedelta(days=1)

    return resultado
