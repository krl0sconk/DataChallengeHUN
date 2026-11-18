"""Pruebas adicionales de validación independiente del modelo de demanda.

Auditor: Daniel Rincón (Líder Web y Validación)
Objetivos:
1. Validar ausencia de fuga de datos en rezagos (DEC-003).
2. Validar monotonicidad de intervalos cuantílicos (p10 <= p50 <= p90).
3. Validar consistencia y rango del pronóstico de largo plazo (120 días).
"""

import numpy as np
import pytest

from hun.models import demanda
from hun.models.explicacion import corregir_cuantiles_cruzados


def test_monotonicidad_cuantiles_cruzados():
    """Verifica que p10 <= p50 <= p90 incluso ante salidas invertidas de modelos independientes."""
    p10_invalido = np.array([120.0, 300.0, 50.0])
    p50_invalido = np.array([100.0, 250.0, 60.0])
    p90_invalido = np.array([80.0, 200.0, 70.0])

    p10_corr, p50_corr, p90_corr = corregir_cuantiles_cruzados(
        p10_invalido, p50_invalido, p90_invalido
    )

    assert np.all(p10_corr <= p50_corr), "Falla monotonicidad p10 <= p50"
    assert np.all(p50_corr <= p90_corr), "Falla monotonicidad p50 <= p90"
    assert np.all(p10_corr <= p90_corr), "Falla monotonicidad p10 <= p90"


def test_ausencia_fuga_rezagos_horizonte_7d():
    """Verifica que el pipeline de demanda no permita rezagos de demanda menores a 7 días."""
    rezagos = demanda.COLUMNAS_REZAGO
    assert len(rezagos) >= 8
    for col in rezagos:
        # Extraer el número de lag
        partes = col.split("_lag_")
        assert len(partes) == 2, f"Formato inválido: {col}"
        lag_dias = int(partes[1])
        assert lag_dias >= 7, (
            f"Fuga detectada: '{col}' tiene un rezago menor a 7 días (viola DEC-003)."
        )


def test_grupos_externos_validados_protocolo():
    """Verifica que el modelo final solo retenga grupos externos que superaron el protocolo."""
    assert demanda.GRUPOS_ACEPTADOS == ("festivos_y_puentes",), (
        "El modelo final debe admitir únicamente 'festivos_y_puentes' tras superar la prueba placebo."
    )
