"""Contrato canónico modelo–web para predicción de llegadas hospitalarias.

Define la interfaz pública `predecir()` acordada para consumo de la aplicación web
y dashboards del Hospital Universidad del Norte (HUN), documentada en AI.md sección 6.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Literal
import unicodedata

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


def _determinar_alerta(prediccion: int, servicio_canonico: str) -> Literal["verde", "amarillo", "rojo"]:
    """Determina el nivel de alerta según umbrales percentiles del servicio."""
    params = PARAMETROS_SERVICIO.get(servicio_canonico, PARAMETROS_SERVICIO["otros"])
    if prediccion > params["umbral_p90"]:
        return "rojo"
    if prediccion >= params["umbral_p75"]:
        return "amarillo"
    return "verde"


def predecir(fecha: date, servicio: str) -> dict[str, Any]:
    """Devuelve la predicción de llegadas para un servicio en una fecha.

    Cumple estrictamente con el contrato modelo–web estipulado en AI.md sección 6.

    Args:
        fecha: Fecha objetivo para la cual se pronostica la demanda.
        servicio: Nombre del servicio o visit_concept_id.

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

    # Variaciones de calendario y factores externos
    dia_semana = fecha.weekday()  # 0=Lunes, 6=Domingo
    factores: list[tuple[str, float]] = []

    ajuste_total = 0.0

    if servicio_canonico == "urgencias":
        # Patrón semanal en urgencias: mayor afluencia lunes y fines de semana
        if dia_semana == 0:
            aporte = round(base * 0.08, 1)
            ajuste_total += aporte
            factores.append(("Efecto Lunes", aporte))
        elif dia_semana in (5, 6):
            aporte = round(base * 0.05, 1)
            ajuste_total += aporte
            factores.append(("Fin de Semana", aporte))
    elif servicio_canonico == "rehabilitacion":
        # En rehabilitación: volumen bajo en domingos (citas ambulatorias)
        if dia_semana == 6:
            aporte = -round(base * 0.85, 1)
            ajuste_total += aporte
            factores.append(("Cierre Dominical", aporte))
        elif dia_semana == 5:
            aporte = -round(base * 0.40, 1)
            ajuste_total += aporte
            factores.append(("Jornada Reducida Sábado", aporte))

    # Efecto quincena (días 15 y 30 o fin de mes)
    if fecha.day in (15, 30, 31):
        aporte_quincena = round(base * 0.04, 1)
        ajuste_total += aporte_quincena
        factores.append(("Día de Pago (Quincena)", aporte_quincena))

    pred_val = max(0, int(round(base + ajuste_total)))
    p10 = max(0, int(round(pred_val * params["p10_ratio"])))
    p90 = max(p10, int(round(pred_val * params["p90_ratio"])))

    # Ordenar factores por magnitud absoluta descendente
    factores_ordenados = sorted(factores, key=lambda x: abs(x[1]), reverse=True)

    alerta = _determinar_alerta(pred_val, servicio_canonico)

    return {
        "prediccion": pred_val,
        "min": p10,
        "max": p90,
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
    from datetime import timedelta

    resultado: list[dict[str, Any]] = []
    cursor = fecha_inicio
    while cursor <= fecha_fin:
        pred = predecir(cursor, servicio)
        pred_con_fecha = {"fecha": cursor, **pred}
        resultado.append(pred_con_fecha)
        cursor += timedelta(days=1)

    return resultado
