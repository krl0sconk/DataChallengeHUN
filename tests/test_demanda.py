"""Pruebas unitarias para el modelo de demanda y evaluación de factores con LightGBM.

Todas las pruebas utilizan datos simulados y no requieren conexión a bases de datos.
Se ejecutan con:
    pytest tests/test_demanda.py -q
"""

from __future__ import annotations

import holidays
import numpy as np
import pandas as pd

from hun.models import demanda, validacion
from hun.models import evaluacion_factores as ef


def _simular_demanda_diaria(
    dias: int = 600, semilla: int = 42
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Genera datos diarios sintéticos con patrones de calendario, festivos y clima."""
    rng = np.random.default_rng(semilla)
    fechas = pd.date_range("2023-01-01", periods=dias, freq="D")

    co_h = holidays.Colombia()
    es_festivo = np.array([int(d.date() in co_h) for d in fechas], dtype=int)
    dia_semana = fechas.day_of_week.to_numpy()
    mes = fechas.month.to_numpy()

    # Variables externas
    lluvia = rng.gamma(0.8, 5.0, len(fechas))
    vacaciones = np.where(np.isin(mes, [6, 7, 12]), 1, 0)
    dia_post_festivo = np.concatenate([[0], es_festivo[:-1]])
    es_dia_no_lab = np.where((dia_semana >= 5) | (es_festivo == 1), 1, 0)

    externos = pd.DataFrame(
        {
            "fecha": fechas,
            "dia_semana": dia_semana,
            "mes": mes,
            "sin_dia_anio": np.sin(2 * np.pi * fechas.day_of_year / 365.25),
            "cos_dia_anio": np.cos(2 * np.pi * fechas.day_of_year / 365.25),
            "es_fin_de_semana": (dia_semana >= 5).astype(int),
            "es_festivo": es_festivo,
            "es_dia_no_laboral": es_dia_no_lab,
            "dia_post_festivo": dia_post_festivo,
            "es_puente": es_festivo,
            "dias_a_festivo": 0.0,
            "dias_desde_festivo": 0.0,
            "es_vacaciones_escolares": vacaciones,
            "temporada_navidad": np.where((mes == 12) & (fechas.day >= 7), 1, 0),
            "clima_precipitation_sum": lluvia,
        }
    ).set_index("fecha")

    # Dos series con dinámicas operacionales distintas:
    # 1. Urgencias: flujo alto continuo, leve incremento en fines de semana y festivos
    tasa_urg = (
        120.0
        * np.where(dia_semana == 0, 1.25, 1.0)
        * np.where(dia_semana >= 5, 1.10, 1.0)
        * np.where(es_festivo == 1, 1.20, 1.0)
        * (1.0 + 0.02 * np.minimum(lluvia, 20.0))
    )

    # 2. Rehabilitación: ambulatorio, cierra o reduce drásticamente en festivos y domingos
    tasa_rehab = (
        90.0
        * np.where(dia_semana < 5, 1.2, 0.05)
        * np.where(es_festivo == 1, 0.02, 1.0)
        * np.where(vacaciones == 1, 0.85, 1.0)
    )

    y_urg = rng.poisson(tasa_urg)
    y_rehab = rng.poisson(tasa_rehab)

    filas = [
        pd.DataFrame({"ts": fechas, "serie": "urgencias", "y": y_urg}),
        pd.DataFrame({"ts": fechas, "serie": "rehabilitacion", "y": y_rehab}),
    ]
    serie = pd.concat(filas, ignore_index=True).sort_values(["serie", "ts"])

    return serie, externos


def test_rezagos_no_tienen_fuga_en_horizonte_7():
    """Verifica que contaminar y en ts >= origen no altera features ni predicciones."""
    serie, externos = _simular_demanda_diaria(dias=250)
    origen = pd.Timestamp("2023-06-01")

    # Contaminación deliberada en la ventana de prueba y futuro
    serie_contaminada = serie.copy()
    serie_contaminada.loc[serie_contaminada["ts"] >= origen, "y"] = 1_000_000

    df_limpio = demanda.construir_features_demanda(serie, externos, origen=origen)
    df_contam = demanda.construir_features_demanda(serie_contaminada, externos, origen=origen)

    # En la ventana [origen, origen + 7D) las features deben ser exactamente iguales
    fin_horizonte = origen + pd.Timedelta("7D")
    mask_h7 = (df_limpio["ts"] >= origen) & (df_limpio["ts"] < fin_horizonte)

    test_limpio = df_limpio[mask_h7].copy()
    test_contam = df_contam[mask_h7].copy()

    cols_verificar = [
        c for c in df_limpio.columns if c not in ("y", "ts", "fecha") and not c.startswith("_")
    ]
    pd.testing.assert_frame_equal(test_limpio[cols_verificar], test_contam[cols_verificar])

    # Rezagos deben tener valores razonables y no el millón
    for s in (1, 2, 3, 4, 8):
        assert test_contam[f"llegadas_lag_{7 * s}"].max() < 1000.0

    # Predicción Poisson
    train_limpio = df_limpio[df_limpio["ts"] < origen]
    train_contam = df_contam[df_contam["ts"] < origen]
    pred_p_limpio = demanda.ajustar_predecir_poisson(train_limpio, test_limpio)
    pred_p_contam = demanda.ajustar_predecir_poisson(train_contam, test_contam)
    np.testing.assert_allclose(pred_p_limpio, pred_p_contam, rtol=1e-5)
    assert np.all(pred_p_contam < 1000.0)

    # Predicción LightGBM
    cols_lgbm = demanda.columnas_por_grupos(list(externos.columns))
    pred_l_limpio = demanda.ajustar_predecir_lgbm(train_limpio, test_limpio, cols_lgbm)
    pred_l_contam = demanda.ajustar_predecir_lgbm(train_contam, test_contam, cols_lgbm)
    np.testing.assert_allclose(pred_l_limpio, pred_l_contam, rtol=1e-5)
    assert np.all(pred_l_contam < 1000.0)


def test_escalera_poisson_y_lgbm_superan_o_corren_en_pliegues():
    """Verifica que evaluar_escalera corre y que LightGBM supera a línea base en festivos."""
    serie, externos = _simular_demanda_diaria(dias=650)
    pliegues = validacion.pliegues_walk_forward(serie["ts"], paso="21D", ventana_evaluacion="120D")
    assert len(pliegues) >= 4

    resultados = demanda.evaluar_escalera(serie, externos, pliegues)

    # Debe contener los 4 escalones solicitados
    escalones_esperados = {
        "linea_base",
        "poisson_calendario",
        "lgbm_todos_externos",
        "lgbm_final",
    }
    assert set(resultados.keys()) == escalones_esperados

    columnas_obligatorias = {
        "ts",
        "serie",
        "y",
        "pred",
        "pliegue",
        "origen",
        "dia_horizonte",
        "es_festivo",
    }

    for nombre, df_res in resultados.items():
        assert columnas_obligatorias.issubset(df_res.columns), f"Faltan columnas en {nombre}"
        assert set(df_res["dia_horizonte"].unique()) == set(range(1, 8))
        assert len(df_res) == len(pliegues) * 7 * 2

    # Verificación de métricas detalladas con resumen_completo
    res_final = demanda.resumen_completo(resultados["lgbm_final"])
    assert "global" in res_final
    assert "por_serie" in res_final
    assert "por_dia_horizonte" in res_final
    assert "por_festivo" in res_final
    assert "por_pliegue" in res_final

    assert set(res_final["por_dia_horizonte"]["dia_horizonte"]) == set(range(1, 8))
    assert set(res_final["por_festivo"]["es_festivo"]) == {0, 1}
    assert len(res_final["por_serie"]) == 2

    # Verificación de que LightGBM reduce el error en días festivos frente a la línea base
    df_lb_fest = resultados["linea_base"][resultados["linea_base"]["es_festivo"] == 1]
    df_lgb_fest = resultados["lgbm_final"][resultados["lgbm_final"]["es_festivo"] == 1]

    wape_lb_fest = validacion.metricas(df_lb_fest["y"], df_lb_fest["pred"])["wape"]
    wape_lgb_fest = validacion.metricas(df_lgb_fest["y"], df_lgb_fest["pred"])["wape"]

    assert wape_lgb_fest < wape_lb_fest

    # Verificación de reporte markdown
    reporte = demanda.reporte_markdown(resultados, pliegues=pliegues)
    assert "# Resultados · Modelo de Demanda" in reporte
    assert "1. Comparación de la Escalera de Modelos" in reporte
    assert "4. Días Festivos vs. Normales" in reporte


def test_lgbm_compatible_con_evaluar_grupos():
    """Verifica que ajustar_predecir_lgbm es compatible con ef.evaluar_grupos."""
    serie, externos = _simular_demanda_diaria(dias=500)
    pliegues = validacion.pliegues_walk_forward(serie["ts"], paso="45D")

    grupos_prueba = (
        ef.GrupoFactor(
            "festivos_y_puentes",
            columnas=("es_festivo", "es_dia_no_laboral", "dia_post_festivo"),
            desplazamiento_placebo="7D",
        ),
        ef.GrupoFactor("clima", prefijos=("clima_",), desplazamiento_placebo="364D"),
    )

    resultados_grupos = ef.evaluar_grupos(
        serie,
        externos,
        pliegues[:3],
        grupos=grupos_prueba,
        ajustar_predecir=demanda.ajustar_predecir_lgbm,
    )

    assert len(resultados_grupos) == 2
    for r in resultados_grupos:
        assert isinstance(r, ef.ResultadoGrupo)
        assert isinstance(r.aceptado, bool)
        assert isinstance(r.mejora_mediana, float)

    tabla = ef.tabla_resultados(resultados_grupos)
    assert len(tabla) == 2
    assert "decision" in tabla.columns
    assert "grupo" in tabla.columns

    # Reporte de factores markdown con advertencia de calidad
    rep_factores = demanda.reporte_factores_markdown(resultados_grupos, calidad_confirmada=False)
    assert "[!WARNING]" in rep_factores
    assert "Calidad de datos pendiente de confirmación definitiva" in rep_factores
    assert "festivos_y_puentes" in rep_factores


def test_evaluar_poisson_y_evaluar_lgbm_funciones_directas():
    """Verifica el funcionamiento directo de evaluar_poisson y evaluar_lgbm."""
    serie, externos = _simular_demanda_diaria(dias=500)
    pliegues = validacion.pliegues_walk_forward(serie["ts"], paso="30D", ventana_evaluacion="90D")[
        :2
    ]

    res_p = demanda.evaluar_poisson(serie, externos, pliegues)
    assert len(res_p) == len(pliegues) * 7 * 2
    assert "pred" in res_p.columns
    assert not res_p["pred"].isna().any()

    res_l = demanda.evaluar_lgbm(serie, externos, pliegues)
    assert len(res_l) == len(pliegues) * 7 * 2
    assert "pred" in res_l.columns
    assert not res_l["pred"].isna().any()
