"""Pruebas del contrato canónico modelo–web (AI.md sección 6).

Verifica la estructura, tipos de datos, invariantes y robustez de la función
`predecir()` expuesta para la interfaz web y el personal hospitalario, así como
los modelos por cuantiles y explicabilidad SHAP de `explicacion.py`.
"""

from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest

from hun.models.explicacion import (
    agrupar_columna_factor,
    cobertura_intervalo,
    corregir_cuantiles_cruzados,
    entrenar_modelos_cuantiles,
    explicar_prediccion_shap,
    predecir_intervalos,
)
from hun.models.predict import (
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


def test_corregir_cuantiles_cruzados():
    """Garantiza que cuantiles cruzados o negativos queden ordenados y >= 0."""
    p10 = np.array([-15.0, 100.0, 45.0, 20.0])
    p50 = np.array([10.0, 80.0, 50.0, 15.0])
    p90 = np.array([25.0, 60.0, 55.0, 30.0])

    c_p10, c_p50, c_p90 = corregir_cuantiles_cruzados(p10, p50, p90)

    # Invariantes fundamentales
    assert np.all(c_p10 >= 0.0)
    assert np.all(c_p10 <= c_p50)
    assert np.all(c_p50 <= c_p90)

    # Verificaciones posicionales
    assert c_p10[0] == 0.0
    assert c_p50[0] == 10.0
    assert c_p90[0] == 25.0

    assert c_p10[1] == 60.0
    assert c_p50[1] == 80.0
    assert c_p90[1] == 100.0

    assert c_p10[3] == 15.0
    assert c_p50[3] == 20.0
    assert c_p90[3] == 30.0

    # Escalares
    s_p10, s_p50, s_p90 = corregir_cuantiles_cruzados(80.0, 50.0, 20.0)
    assert s_p10[0] == 20.0
    assert s_p50[0] == 50.0
    assert s_p90[0] == 80.0


def test_modelos_cuantiles_y_cobertura():
    """Entrena modelos de cuantiles con datos simulados y verifica no cruce y cobertura."""
    rng = np.random.default_rng(42)
    n = 150
    X_train = pd.DataFrame(
        {
            "serie_cod": rng.choice([0, 1], size=n),
            "dia_semana": rng.integers(0, 7, size=n),
            "es_festivo": rng.choice([0, 1], size=n, p=[0.9, 0.1]),
            "llegadas_lag_7": rng.uniform(40, 120, size=n),
        }
    )
    y_raw = (
        X_train["llegadas_lag_7"]
        + X_train["dia_semana"] * 1.5
        - X_train["es_festivo"] * 15.0
        + rng.normal(0, 8, size=n)
    )
    X_train["y"] = np.maximum(0.0, y_raw)

    columnas = ["serie_cod", "dia_semana", "es_festivo", "llegadas_lag_7"]
    modelos_q = entrenar_modelos_cuantiles(X_train, columnas)

    assert set(modelos_q.keys()) == {0.10, 0.50, 0.90}

    n_test = 40
    X_test = pd.DataFrame(
        {
            "serie_cod": rng.choice([0, 1], size=n_test),
            "dia_semana": rng.integers(0, 7, size=n_test),
            "es_festivo": rng.choice([0, 1], size=n_test, p=[0.9, 0.1]),
            "llegadas_lag_7": rng.uniform(40, 120, size=n_test),
        }
    )
    y_test = np.maximum(
        0.0,
        X_test["llegadas_lag_7"]
        + X_test["dia_semana"] * 1.5
        - X_test["es_festivo"] * 15.0
        + rng.normal(0, 8, size=n_test),
    )

    preds = predecir_intervalos(modelos_q, X_test, columnas)

    assert set(preds.columns) == {"pred_p10", "pred_p50", "pred_p90"}
    assert (preds["pred_p10"] >= 0.0).all()
    assert (preds["pred_p10"] <= preds["pred_p50"]).all()
    assert (preds["pred_p50"] <= preds["pred_p90"]).all()

    cob = cobertura_intervalo(y_test.values, preds["pred_p10"].values, preds["pred_p90"].values)
    assert 0.50 <= cob <= 1.0


def test_explicar_prediccion_shap_agrupa_factores():
    """Verifica que SHAP descompone en factores legibles ordenados por magnitud descendente."""
    rng = np.random.default_rng(42)
    n = 100
    X_sim = pd.DataFrame(
        {
            "serie_cod": rng.choice([0, 1], size=n),
            "dia_semana": rng.integers(0, 7, size=n),
            "es_festivo": rng.choice([0, 1], size=n, p=[0.8, 0.2]),
            "es_vacaciones_escolares": rng.choice([0, 1], size=n, p=[0.8, 0.2]),
            "clima_precipitation_sum": rng.uniform(0, 20, size=n),
            "llegadas_lag_7": rng.uniform(50, 100, size=n),
        }
    )
    y_sim = (
        X_sim["llegadas_lag_7"]
        + X_sim["dia_semana"] * 2.0
        + X_sim["es_festivo"] * 10.0
        - X_sim["clima_precipitation_sum"] * 0.8
        + rng.normal(0, 5, size=n)
    )
    X_sim["y"] = np.maximum(0.0, y_sim)

    cols = [
        "serie_cod",
        "dia_semana",
        "es_festivo",
        "es_vacaciones_escolares",
        "clima_precipitation_sum",
        "llegadas_lag_7",
    ]
    modelos = entrenar_modelos_cuantiles(X_sim, cols)
    modelo_p50 = modelos[0.50]

    explicaciones = explicar_prediccion_shap(
        modelo_p50, X_sim.head(5), cols, top_k=4, excluir_servicio=True
    )

    assert len(explicaciones) == 5
    factores_permitidos = {
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
        "Otros",
    }

    for exp in explicaciones:
        assert isinstance(exp, list)
        assert len(exp) <= 4
        for nombre_factor, aporte in exp:
            assert isinstance(nombre_factor, str)
            assert isinstance(aporte, float)
            assert nombre_factor in factores_permitidos
            assert nombre_factor != "Servicio"

        magnitudes = [abs(val) for _, val in exp]
        assert magnitudes == sorted(magnitudes, reverse=True)


def test_agrupar_columna_factor():
    """Verifica que el mapeo de nombres técnicos a factores legibles sea preciso."""
    casos = {
        "llegadas_lag_7": "Semana anterior",
        "llegadas_lag_28": "Semana anterior",
        "rezago_prom_4s": "Semana anterior",
        "es_festivo": "Festivo",
        "es_puente": "Festivo",
        "dia_post_festivo": "Festivo",
        "es_vacaciones_escolares": "Vacaciones y Navidad",
        "temporada_navidad": "Vacaciones y Navidad",
        "dia_semana": "Día de la semana",
        "es_fin_de_semana": "Día de la semana",
        "mes": "Temporada del año",
        "temporada_lluvias": "Temporada del año",
        "clima_precipitation_sum": "Lluvia",
        "clima_temperature_2m_max": "Temperatura y humedad",
        "es_carnaval": "Carnaval y Semana Santa",
        "es_semana_santa": "Carnaval y Semana Santa",
        "es_dia_pago": "Quincena",
        "semana_de_pago": "Quincena",
        "epi_dengue_casos": "Epidemiología",
        "serie": "Servicio",
        "serie_cod": "Servicio",
        "variable_desconocida_xyz": "Otros",
    }
    for col, esperado in casos.items():
        assert agrupar_columna_factor(col) == esperado
