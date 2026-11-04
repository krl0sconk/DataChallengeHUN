"""Pruebas unitarias para el modelo de largo plazo a 4 meses (`hun.models.largo_plazo`).

Todas las pruebas usan datos sintéticos y no requieren conexión a base de datos.
"""

from __future__ import annotations

import holidays
import numpy as np
import pandas as pd

from hun.models import largo_plazo as lp


def _simular_historia(dias: int = 800, semilla: int = 7) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(semilla)
    fechas = pd.date_range("2023-01-01", periods=dias + 200, freq="D", name="fecha")
    co = holidays.Colombia()
    es_fest = np.array([int(d.date() in co) for d in fechas])
    dow = fechas.day_of_week.to_numpy()
    doy = fechas.day_of_year.to_numpy()

    externos = pd.DataFrame(
        {
            "dia_semana": dow,
            "mes": fechas.month,
            "sin_dia_anio": np.sin(2 * np.pi * doy / 365.25),
            "cos_dia_anio": np.cos(2 * np.pi * doy / 365.25),
            "es_fin_de_semana": (dow >= 5).astype(int),
            "sin_dia_semana": np.sin(2 * np.pi * dow / 7.0),
            "cos_dia_semana": np.cos(2 * np.pi * dow / 7.0),
            "es_festivo": es_fest,
            "es_puente": es_fest,
            "es_dia_no_laboral": ((dow >= 5) | (es_fest == 1)).astype(int),
            "dia_post_festivo": np.r_[0, es_fest[:-1]],
            "dias_a_festivo": 5.0,
            "dias_desde_festivo": 5.0,
            "clima_temperature_2m_mean": 28.0 + 2.0 * np.sin(2 * np.pi * doy / 365.25),
            "clima_precipitation_sum": rng.gamma(1.0, 4.0, len(fechas)),
            "clima_relative_humidity_2m_mean": 78.0 + rng.normal(0, 3, len(fechas)),
        },
        index=fechas,
    )
    # En fechas futuras el clima real puede faltar: el modelo debe rellenarlo con clima típico
    externos.loc[fechas[dias:], "clima_precipitation_sum"] = np.nan

    fechas_hist = fechas[:dias]
    partes = []
    for s_id, base in [(9203, 300.0), (581479, 600.0)]:
        tasa = base * np.where(dow[:dias] < 5, 1.1, 0.6) * np.where(es_fest[:dias] == 1, 0.3, 1.0)
        partes.append(pd.DataFrame({"ts": fechas_hist, "serie": s_id, "y": rng.poisson(tasa)}))
    serie = pd.concat(partes, ignore_index=True)
    return serie, externos


def test_clima_tipico_no_usa_datos_posteriores_al_corte():
    _, ext = _simular_historia(dias=500)
    corte = pd.Timestamp("2024-03-01")
    ext_contaminado = ext.copy()
    ext_contaminado.loc[ext_contaminado.index >= corte, "clima_temperature_2m_mean"] = 999.0

    limpio = lp.clima_tipico_por_fecha(ext, corte=corte)
    contam = lp.clima_tipico_por_fecha(ext_contaminado, corte=corte)
    pd.testing.assert_frame_equal(limpio, contam)
    assert not limpio.isna().any().any()


def test_features_largo_plazo_no_incluyen_rezagos_cortos():
    serie, ext = _simular_historia(dias=500)
    df, cols = lp.construir_features_largo_plazo(serie, ext)
    for c in cols:
        assert "lag" not in c and "rezago" not in c
    assert "tendencia_anios" in cols
    assert any(c.startswith("tipico_clima_") for c in cols)


def test_intervalos_se_ensanchan_con_el_mes_del_horizonte():
    p10 = np.array([80.0, 80.0, 80.0, 80.0])
    p50 = np.array([100.0, 100.0, 100.0, 100.0])
    p90 = np.array([120.0, 120.0, 120.0, 120.0])
    meses = np.array([1, 2, 3, 4])
    lo, mid, hi = lp.ensanchar_intervalos_por_horizonte(p10, p50, p90, meses)
    anchos = hi - lo
    assert np.all(np.diff(anchos) > 0)
    assert np.all(lo <= mid) and np.all(mid <= hi)


def test_backtest_y_pronostico_4_meses_extremo_a_extremo():
    serie, ext = _simular_historia(dias=750)
    bt = lp.evaluar_backtest_largo_plazo(
        serie, ext, horizonte="60D", paso="60D", ventana_evaluacion="120D"
    )
    assert {"ts", "serie", "y", "pred", "pred_p10", "pred_p90", "mes_horizonte"}.issubset(
        bt.columns
    )
    assert (bt["pred_p10"] <= bt["pred"]).all() and (bt["pred"] <= bt["pred_p90"]).all()

    pron = lp.pronosticar_rango(serie, ext, inicio="2025-02-01", fin="2025-05-31")
    assert len(pron) == 120 * 2
    assert not pron[["pred", "pred_p10", "pred_p90"]].isna().any().any()

    texto = lp.reporte_markdown(bt, pron, {9203: "Urgencias", 581479: "Rehabilitación"})
    assert "# Resultados · Modelo de Largo Plazo" in texto
    assert "Backtest a" in texto and "Pronóstico" in texto
