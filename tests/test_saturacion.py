"""Pruebas para el cálculo de censo, calentamiento, umbrales y saturación hospitalaria."""

from __future__ import annotations

import numpy as np
import pandas as pd

from hun.data.agregados import serie_censo_etapas
from hun.models.saturacion import (
    calcular_calentamiento,
    calcular_umbrales_censo,
    clasificar_censo,
    color_semaforo,
    color_semaforo_vectorizado,
    reporte_markdown,
    resumen_diario_censo,
)


def test_calentamiento_mayor_que_p99():
    """Verifica que el periodo de calentamiento sea estrictamente mayor al p99 máximo."""
    # Caso 1: tabla con varias etapas y distintos p99
    duraciones = pd.DataFrame(
        {
            "visit_detail_concept_id": [101, 102, 103],
            "etapas": [1000, 500, 200],
            "horas_p50": [2.0, 5.0, 10.0],
            "horas_p90": [8.0, 15.0, 30.0],
            "horas_p99": [12.0, 48.0, 75.5],  # max p99 = 75.5 h (~3.15 días)
            "horas_max": [20.0, 60.0, 120.0],
        }
    )
    calentamiento = calcular_calentamiento(duraciones)
    delta_calentamiento = pd.Timedelta(calentamiento)
    p99_max = pd.Timedelta(hours=duraciones["horas_p99"].max())

    assert delta_calentamiento > p99_max
    # ceil(75.5 / 24) = 4, + 1 = 5D
    assert calentamiento == "5D"

    # Caso 2: valores por defecto si no hay datos o es None
    assert calcular_calentamiento(None) == "30D"
    assert calcular_calentamiento(pd.DataFrame()) == "30D"
    assert calcular_calentamiento(None, por_defecto="15D") == "15D"


def test_umbrales_solo_usan_entrenamiento():
    """Verifica que los umbrales se ajusten únicamente con datos de entrenamiento (ts < origen)."""
    horas = pd.date_range("2024-01-01", "2024-01-20", freq="h", inclusive="left")
    np.random.seed(42)
    n = len(horas)
    censo_limpio = pd.concat(
        [
            pd.DataFrame(
                {"ts": horas, "serie": 101, "y": np.random.randint(10, 30, size=n).astype(float)}
            ),
            pd.DataFrame(
                {"ts": horas, "serie": 102, "y": np.random.randint(5, 15, size=n).astype(float)}
            ),
        ],
        ignore_index=True,
    )

    origen = pd.Timestamp("2024-01-10 00:00:00")
    umbrales_limpios = calcular_umbrales_censo(censo_limpio, origen=origen)

    # Contaminar los datos a partir del origen con valores gigantescos
    censo_contaminado = censo_limpio.copy()
    mascara_futuro = censo_contaminado["ts"] >= origen
    censo_contaminado.loc[mascara_futuro, "y"] = 999999.0

    umbrales_contaminados = calcular_umbrales_censo(censo_contaminado, origen=origen)

    # Los umbrales con origen no deben alterarse en absoluto
    pd.testing.assert_frame_equal(umbrales_limpios, umbrales_contaminados)

    # Verificar que como_dict=True también produce resultados idénticos
    u_dict1 = calcular_umbrales_censo(censo_limpio, origen=origen, como_dict=True)
    u_dict2 = calcular_umbrales_censo(censo_contaminado, origen=origen, como_dict=True)
    assert u_dict1 == u_dict2

    # Verificar que sin filtrar por origen los umbrales sí cambian sustancialmente
    umbrales_sin_filtro = calcular_umbrales_censo(censo_contaminado, origen=None)
    assert (umbrales_sin_filtro["max"] > 900000.0).all()


def test_color_semaforo_verde_amarillo_rojo():
    """Verifica que la clasificación por semáforo siga estrictamente las reglas."""
    p75, p90 = 50.0, 80.0

    # Verde: censo < p75
    assert color_semaforo(0.0, p75, p90) == "verde"
    assert color_semaforo(49.9, p75, p90) == "verde"

    # Amarillo: p75 <= censo <= p90
    assert color_semaforo(50.0, p75, p90) == "amarillo"
    assert color_semaforo(65.0, p75, p90) == "amarillo"
    assert color_semaforo(80.0, p75, p90) == "amarillo"

    # Rojo: censo > p90
    assert color_semaforo(80.1, p75, p90) == "rojo"
    assert color_semaforo(150.0, p75, p90) == "rojo"

    # Versión vectorizada
    valores = np.array([30.0, 50.0, 70.0, 80.0, 85.0])
    colores = color_semaforo_vectorizado(valores, p75, p90)
    assert list(colores) == ["verde", "amarillo", "amarillo", "amarillo", "rojo"]


def test_censo_etapas_y_resumen_diario():
    """Prueba el flujo completo: serie_censo_etapas -> umbrales -> resumen diario."""
    # 5 días de datos horarios (120 horas) para una etapa
    horas = pd.date_range("2024-01-01", "2024-01-06", freq="h", inclusive="left")
    entradas = pd.DataFrame(
        {
            "hora": horas,
            "visit_detail_concept_id": 9203,
            "entradas_con_salida": [2] * len(horas),
        }
    )
    salidas = pd.DataFrame(
        {
            "hora": horas,
            "visit_detail_concept_id": 9203,
            "salidas": [1] * len(horas),
        }
    )

    # Con 1D de calentamiento, se descarta el primer día
    censo = serie_censo_etapas(entradas, salidas, calentamiento="1D")
    assert not censo.empty
    assert (censo["ts"] >= pd.Timestamp("2024-01-02")).all()
    assert (censo["serie"] == 9203).all()
    assert (censo["y"] > 0).all()

    # Umbrales
    umbrales = calcular_umbrales_censo(censo)
    assert len(umbrales) == 1
    assert umbrales.iloc[0]["serie"] == 9203
    p75 = umbrales.iloc[0]["p75"]
    p90 = umbrales.iloc[0]["p90"]
    assert p75 <= p90

    # Clasificar censo con dict
    u_dict = calcular_umbrales_censo(censo, como_dict=True)
    clasif = clasificar_censo(censo, u_dict)
    assert "color" in clasif.columns
    assert set(clasif["color"].unique()).issubset({"verde", "amarillo", "rojo"})

    # Resumen diario
    resumen = resumen_diario_censo(censo, umbrales)
    assert not resumen.empty
    columnas_esperadas = {
        "fecha",
        "serie",
        "censo_max",
        "censo_promedio",
        "horas_sobre_p75",
        "horas_sobre_p90",
        "color_max",
    }
    assert set(resumen.columns) == columnas_esperadas
    for _, fila in resumen.iterrows():
        assert fila["censo_max"] >= fila["censo_promedio"]
        assert fila["horas_sobre_p75"] >= fila["horas_sobre_p90"]
        assert 0 <= fila["horas_sobre_p75"] <= 24
        assert 0 <= fila["horas_sobre_p90"] <= 24
        assert fila["color_max"] in {"verde", "amarillo", "rojo"}


def test_reporte_markdown_plantilla_sin_datos():
    """Verifica que el reporte sin datos contenga la estructura y marcadores TODO."""
    md = reporte_markdown(None, None, None)
    assert "# Resultados · Saturación hospitalaria por etapa" in md
    assert "TODO: completar con resultado real" in md
    assert "Justificación del calentamiento del censo" in md
