"""Pruebas del contrato canónico modelo–web (AI.md sección 6).

Verifica la estructura, tipos de datos, invariantes y robustez de la función
`predecir()` expuesta para la interfaz web y el personal hospitalario.
"""

from datetime import date, timedelta
from typing import get_args

import pytest

from hun.models.predict import (
    SERVICIOS_CANONICOS,
    normalizar_servicio,
    predecir,
    predecir_rango,
)


@pytest.fixture
def fecha_prueba() -> date:
    return date(2026, 10, 26)


def test_contrato_claves_y_tipos(fecha_prueba: date):
    """Verifica que el diccionario devuelto tenga las claves y tipos exactos del contrato."""
    resultado = predecir(fecha_prueba, "urgencias")

    assert isinstance(resultado, dict)
    claves_esperadas = {"prediccion", "min", "max", "alerta", "factores"}
    assert set(resultado.keys()) == claves_esperadas

    assert isinstance(resultado["prediccion"], int)
    assert isinstance(resultado["min"], int)
    assert isinstance(resultado["max"], int)
    assert isinstance(resultado["alerta"], str)
    assert isinstance(resultado["factores"], list)

    for item in resultado["factores"]:
        assert isinstance(item, tuple)
        assert len(item) == 2
        assert isinstance(item[0], str)
        assert isinstance(item[1], (int, float))


def test_invariantes_intervalo(fecha_prueba: date):
    """El límite inferior no debe superar la mediana, ni la mediana superar el máximo."""
    for servicio in ["urgencias", "rehabilitacion", "tratamiento_urgencia", "otros"]:
        resultado = predecir(fecha_prueba, servicio)
        assert resultado["min"] >= 0
        assert resultado["min"] <= resultado["prediccion"]
        assert resultado["prediccion"] <= resultado["max"]


def test_valores_alerta_validos(fecha_prueba: date):
    """La alerta debe ser exclusivamente verde, amarillo o rojo."""
    alertas_validas = {"verde", "amarillo", "rojo"}
    for servicio in ["urgencias", "rehabilitacion", "tratamiento_urgencia"]:
        resultado = predecir(fecha_prueba, servicio)
        assert resultado["alerta"] in alertas_validas


def test_normalizacion_servicios():
    """Comprueba resolución insensible a mayúsculas, tildes y concept IDs OMOP."""
    assert normalizar_servicio("Urgencias") == "urgencias"
    assert normalizar_servicio("EMERGENCY ROOM VISIT") == "urgencias"
    assert normalizar_servicio("9203") == "urgencias"

    assert normalizar_servicio("Rehabilitación") == "rehabilitacion"
    assert normalizar_servicio("rehabilitacion ambulatoria") == "rehabilitacion"
    assert normalizar_servicio("581479") == "rehabilitacion"

    assert normalizar_servicio("Tratamiento Urgencia") == "tratamiento_urgencia"
    assert normalizar_servicio("3045729") == "tratamiento_urgencia"

    assert normalizar_servicio("Hospitalización") == "otros"
    assert normalizar_servicio("servicio_desconocido_xyz") == "otros"


def test_orden_factores_shap(fecha_prueba: date):
    """Los factores explicativos deben venir ordenados por magnitud descendente."""
    resultado = predecir(fecha_prueba, "urgencias")
    magnitudes = [abs(factor[1]) for factor in resultado["factores"]]
    assert magnitudes == sorted(magnitudes, reverse=True)


def test_predecir_rango():
    """Prueba la generación de horizonte consecutivo para la web."""
    inicio = date(2026, 11, 1)
    fin = date(2026, 11, 7)
    horizonte = predecir_rango(inicio, fin, "urgencias")

    assert len(horizonte) == 7
    for i, dia in enumerate(horizonte):
        assert dia["fecha"] == inicio + timedelta(days=i)
        assert "prediccion" in dia
        assert "alerta" in dia
        assert dia["min"] <= dia["prediccion"] <= dia["max"]
