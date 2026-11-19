"""Pruebas deterministas de optimización operacional, sin dotaciones inventadas."""

import json
import math
from datetime import date

import pandas as pd
import pytest

from hun.models import empaquetar
from hun.models import optimizacion as opt


def datos_hospitalizacion():
    horas = pd.date_range("2025-01-01", periods=24 * 100, freq="h")
    entradas = pd.DataFrame(
        {
            "hora": horas,
            "visit_detail_concept_id": 9201,
            "entradas": 2.0,
            "entradas_con_salida": 2.0,
        }
    )
    salidas = pd.DataFrame(
        {
            "hora": horas,
            "visit_detail_concept_id": 9201,
            "salidas": [8.0 if 14 <= h.hour < 20 else 0.0 for h in horas],
        }
    )
    diaria = pd.DataFrame(
        {
            "visit_detail_concept_id": [9201, 9201],
            "etapas": [1, 3],
            "horas_media": [24.0, 48.0],
        }
    )
    percentiles = pd.DataFrame(
        {
            "visit_detail_concept_id": [9201],
            "horas_p50": [36.0],
            "horas_p99": [48.0],
        }
    )
    return entradas, salidas, diaria, percentiles


def test_erlang_c_exacto_y_monotonia():
    assert opt.probabilidad_espera_erlang_c(2, 3, 1) == pytest.approx(2 / 3)
    assert opt.tiempo_espera_erlang_c_min(2, 3, 1) == pytest.approx(40)
    assert opt.probabilidad_espera_erlang_c(0, 3, 1) == 0
    assert opt.probabilidad_espera_erlang_c(3, 3, 1) == 1
    assert math.isinf(opt.tiempo_espera_erlang_c_min(3, 3, 1))
    assert opt.probabilidad_espera_erlang_c(2, 3, 2) < 2 / 3
    assert opt.probabilidad_espera_erlang_c(1, 3, 1) < 2 / 3
    assert math.isfinite(opt.probabilidad_espera_erlang_c(2000, 3, 800))


@pytest.mark.parametrize("llegadas", [0, 2, 20, 2000])
def test_dimensionamiento_minimo(llegadas):
    r = opt.dimensionar_erlang_c(llegadas, 20)
    c = r["servidores"]
    assert llegadas / (c * 3) < 1
    assert r["espera_esperada_min"] < 15
    assert r["nivel_servicio"] >= 0.8
    if c > 1:
        p = opt.probabilidad_espera_erlang_c(llegadas, 3, c - 1)
        nivel = 1 - p * math.exp(-max(0, (c - 1) * 3 - llegadas) / 4)
        assert nivel < 0.8 or opt.tiempo_espera_erlang_c_min(llegadas, 3, c - 1) >= 15


@pytest.mark.parametrize("args", [(-1, 20), (1, 0), (float("nan"), 20)])
def test_parametros_invalidos(args):
    with pytest.raises(ValueError):
        opt.dimensionar_erlang_c(*args)


def test_little_y_altas_con_umbral_fijo():
    r = opt.calcular_ley_little_y_altas_tempranas(*datos_hospitalizacion())
    assert r["ingresos_dia_promedio"] == 48
    assert r["estancia_media_horas"] == 42
    assert r["censo_teorico_little"] == 48 * 42 / 24
    for e in r["escenarios_estancia"]:
        assert e["camas_liberadas"] == 48 * e["reduccion_horas"] / 24
    for e in r["escenarios_altas_tempranas"]:
        assert e["censo_pico_simulado"] < e["censo_pico_base"]
        assert e["pct_horas_rojo_simulado"] <= e["pct_horas_rojo_base"]


def test_transiciones_ponderadas_y_correlacion():
    trans = pd.DataFrame(
        {
            "mes": pd.to_datetime(["2025-01-01", "2025-02-01", "2025-03-01"]),
            "visit_concept_id": 9203,
            "etapa": 3045729,
            "etapa_siguiente": 9201,
            "pasos": [1, 2, 3],
            "espera_h_p50": [1.0, 2.0, 3.0],
            "espera_h_p90": [2.0, 4.0, 6.0],
        }
    )
    censo = pd.DataFrame({"ts": trans["mes"], "serie": 9201, "y": [10.0, 20.0, 30.0]})
    r = opt.analizar_cuello_urgencias_hospitalizacion(trans, censo)
    assert r["pasos_totales"] == 6
    assert r["espera_p90_horas"] == pytest.approx(28 / 6)
    assert r["correlacion_censo_espera_p90"] == pytest.approx(1)
    assert "start_siguiente - end_anterior" in r["nota_metodologica"]


def test_contrato_simulador_y_recomendaciones(monkeypatch):
    from hun.models import predict

    erlang = opt.calcular_erlang_c_servicios(parametros_servicio=predict.PARAMETROS_SERVICIO)
    little = opt.calcular_ley_little_y_altas_tempranas(*datos_hospitalizacion())
    base = {
        "erlang_c": erlang,
        "ley_little_camas": little,
        "cuello_urgencias_hospitalizacion": {},
    }
    base["recomendaciones"] = opt.generar_recomendaciones_cuantificadas(base)
    assert 4 <= len(base["recomendaciones"]) <= 5
    assert all(
        set(r)
        == {
            "id",
            "area",
            "palanca",
            "titulo",
            "accion",
            "impacto_cuantificado",
            "horizonte",
        }
        for r in base["recomendaciones"]
    )
    monkeypatch.setattr(predict, "_bundle_o_sintetico", lambda: {"optimizacion": base})
    assert predict.obtener_optimizacion() is base
    r = predict.simular_optimizacion("urgencias")
    assert set(r) == {
        "servicio",
        "erlang_c_franjas",
        "camas_liberadas_estancia",
        "escenario_altas_tempranas",
    }
    assert r["camas_liberadas_estancia"] == 8
    assert len(r["erlang_c_franjas"]) == 4
    json.dumps(r, allow_nan=False)
    assert (
        predict.simular_optimizacion("urgencias", pct_altas_tempranas=0)[
            "escenario_altas_tempranas"
        ]["camas_pico_liberadas"]
        == 0
    )


def test_fallback_sin_datos_no_inventa_hospitalizacion(tmp_path):
    from hun.models.predict import PARAMETROS_SERVICIO

    r = opt.construir_resumen_optimizacion(
        raw_dir=tmp_path,
        parametros_servicio=PARAMETROS_SERVICIO,
    )
    assert r["ley_little_camas"]["censo_teorico_little"] is None
    assert r["cuello_urgencias_hospitalizacion"]["espera_p90_horas"] is None
    json.dumps(r, allow_nan=False)


def test_predict_bundle_anterior_y_servicio_invalido(monkeypatch):
    from hun.models import predict

    monkeypatch.setattr(predict, "_bundle_o_sintetico", lambda: {"turnos": {}})
    monkeypatch.setattr(predict, "es_modo_produccion", lambda: True)
    r = predict.obtener_optimizacion()
    assert "erlang_c" in r
    with pytest.raises(ValueError):
        predict.simular_optimizacion("inexistente")


def test_tasas_reales_completan_horas_sin_llegadas():
    horas = pd.date_range("2025-01-01", periods=24 * 4, freq="h")
    entradas = pd.DataFrame(
        {
            "hora": horas,
            "visit_concept_id": 9203,
            "entradas": [6 if h.hour == 6 else 0 for h in horas],
        }
    )
    r = opt.calcular_erlang_c_servicios(entradas)
    franjas = r["servicios"]["urgencias"]["franjas"]
    assert franjas[0]["lambda_normal_h"] == 1
    assert franjas[1]["lambda_normal_h"] == 0
    assert franjas[0]["lambda_p90_h"] == 1
    assert len(r["servicios"]["urgencias"]["sensibilidad"]) == 3


def test_simulador_limites_y_no_muta_base():
    from hun.models.predict import PARAMETROS_SERVICIO

    base = {
        "erlang_c": opt.calcular_erlang_c_servicios(parametros_servicio=PARAMETROS_SERVICIO),
        "ley_little_camas": opt.calcular_ley_little_y_altas_tempranas(*datos_hospitalizacion()),
    }
    antes = json.dumps(base, sort_keys=True)
    exacto = opt.simular_escenario_optimizacion(base, "urgencias", pct_altas_tempranas=35)
    ancla = base["ley_little_camas"]["escenarios_altas_tempranas"][1]
    assert (
        exacto["escenario_altas_tempranas"]["censo_pico_simulado"] == ancla["censo_pico_simulado"]
    )
    interpolado = opt.simular_escenario_optimizacion(base, "urgencias", pct_altas_tempranas=30)
    assert "interpolación" in interpolado["escenario_altas_tempranas"]["metodo"]
    saturado = opt.simular_escenario_optimizacion(
        base,
        "urgencias",
        reduccion_estancia_horas=100,
        pct_altas_tempranas=100,
    )
    assert saturado["camas_liberadas_estancia"] == base["ley_little_camas"]["censo_teorico_little"]
    for kwargs in (
        {"tiempo_servicio_min": 0},
        {"meta_espera_min": 0},
        {"reduccion_estancia_horas": -1},
        {"pct_altas_tempranas": 101},
    ):
        with pytest.raises(ValueError):
            opt.simular_escenario_optimizacion(base, "urgencias", **kwargs)
    assert json.dumps(base, sort_keys=True) == antes


def test_altas_conservan_censo_fin_del_dia_sin_mutar_entradas():
    from hun.data.agregados import serie_censo_etapas
    from hun.models.saturacion import calcular_calentamiento

    datos = datos_hospitalizacion()
    copias = [d.copy(deep=True) for d in datos]
    resultado = opt.calcular_ley_little_y_altas_tempranas(*datos)
    assert resultado["escenarios_altas_tempranas"][0]["pct_altas_adelantadas"] == 20
    for original, copia in zip(datos, copias, strict=True):
        pd.testing.assert_frame_equal(original, copia)
    # El escenario 0% conserva todas las métricas de la reconstrucción pública.
    censo = serie_censo_etapas(datos[0], datos[1], calcular_calentamiento(datos[3]))
    cero = resultado["anclas_altas_tempranas"][0]
    assert cero["censo_pico_simulado"] == censo["y"].max()
    assert cero["camas_pico_liberadas"] == 0


def test_cuello_excluye_otras_transiciones_y_correlacion_indefinida():
    t = pd.DataFrame(
        {
            "mes": pd.to_datetime(["2025-01-01", "2025-02-01"]),
            "visit_concept_id": [9203, 9203],
            "etapa": [3045729, 3045729],
            "etapa_siguiente": [9201, -1],
            "pasos": [3, 1000],
            "espera_h_p50": [-1.0, 900.0],
            "espera_h_p90": [2.0, 999.0],
        }
    )
    r = opt.analizar_cuello_urgencias_hospitalizacion(t, None)
    assert r["pasos_totales"] == 3
    assert r["espera_p50_horas"] == -1
    assert r["espera_p90_horas"] == 2
    assert r["correlacion_censo_espera_p90"] is None
    json.dumps(r, allow_nan=False)


@pytest.fixture(scope="module")
def paquete_sintetico_v21():
    return empaquetar.construir_paquete_sintetico_prueba()


def test_perfiles_horarios_excluyen_futuro_e_incluyen_ceros():
    # Lunes entre ene-mar 2025: la mitad con 12 llegadas en Mañana (08h), la otra mitad en 0.
    lunes_antes = pd.date_range("2025-01-06", "2025-03-31", freq="W-MON")
    filas = [
        {
            "hora": d + pd.Timedelta(hours=8),
            "visit_concept_id": 9203,
            "entradas": 12,
        }
        for i, d in enumerate(lunes_antes)
        if i % 2 == 0
    ]
    # Lunes posteriores al corte 2025-04-01: todas las llegadas pasan a Noche (20h).
    lunes_despues = pd.date_range("2025-04-07", "2025-04-28", freq="W-MON")
    filas.extend(
        {
            "hora": d + pd.Timedelta(hours=20),
            "visit_concept_id": 9203,
            "entradas": 24,
        }
        for d in lunes_despues
    )
    entradas = pd.DataFrame(filas)
    perfiles = opt.construir_perfiles_horarios_por_corte(
        entradas,
        cortes=["2025-04-01", "2025-05-01"],
    )

    perfil_corte, motivo = opt.seleccionar_perfil_horario(
        perfiles,
        "urgencias",
        date(2025, 4, 7),
        corte_maximo=date(2025, 4, 1),
    )
    assert motivo is None
    assert perfil_corte is not None
    assert perfil_corte["corte_perfil"] == "2025-04-01"
    # Incluye los 13 lunes completos previos a 2025-04-01 (con ceros).
    assert perfil_corte["dias_observados"] == len(lunes_antes)
    assert sum(perfil_corte["proporciones"]) == pytest.approx(1.0)
    assert perfil_corte["proporciones"] == pytest.approx([1.0, 0.0, 0.0, 0.0])

    perfil_post, _ = opt.seleccionar_perfil_horario(
        perfiles,
        "urgencias",
        date(2025, 5, 5),
        corte_maximo=date(2025, 5, 1),
    )
    assert perfil_post is not None
    assert perfil_post["proporciones"][2] > 0.0


def test_erlang_pronostico_reconcilia_totales_y_convierte_a_hora():
    sin_ref = opt.simular_erlang_c_pronostico(
        400,
        560,
        [0.4, 0.3, 0.2, 0.1],
        tiempo_servicio_min=20.0,
        meta_espera_min=15.0,
    )
    filas = sin_ref["erlang_c_franjas"]
    assert len(filas) == 4
    assert sum(f["volumen_central"] for f in filas) == pytest.approx(400.0)
    assert sum(f["volumen_alto"] for f in filas) == pytest.approx(560.0)
    assert sin_ref["reconciliacion"]["suma_franjas_central"] == pytest.approx(400.0)
    assert sin_ref["reconciliacion"]["suma_franjas_alto"] == pytest.approx(560.0)
    for f in filas:
        assert f["lambda_central_h"] == pytest.approx(f["volumen_central"] / 6.0)
        assert f["lambda_alto_h"] == pytest.approx(f["volumen_alto"] / 6.0)
        assert "dotacion_referencia" not in f

    con_ref = opt.simular_erlang_c_pronostico(
        400,
        560,
        [0.4, 0.3, 0.2, 0.1],
        dotacion_referencia=10,
    )
    for f in con_ref["erlang_c_franjas"]:
        assert f["dotacion_referencia"] == 10
        assert f["brecha_central_vs_referencia"] == f["servidores_central"] - 10
        assert f["brecha_alto_vs_referencia"] == f["servidores_alto"] - 10


def test_simular_pronostico_cambia_con_fecha_y_evaluacion(monkeypatch, paquete_sintetico_v21):
    from hun.models import predict

    monkeypatch.setattr(predict, "_bundle_o_sintetico", lambda: paquete_sintetico_v21)
    serie_reh = paquete_sintetico_v21["comparacion_real"]["rehabilitacion"]["serie"]
    fecha_lun = next(
        p["fecha"]
        for p in serie_reh
        if p.get("origen") and date.fromisoformat(p["fecha"]).weekday() == 0
    )
    fecha_dom = next(
        p["fecha"]
        for p in serie_reh
        if p.get("origen") and date.fromisoformat(p["fecha"]).weekday() == 6
    )

    res_lun = predict.simular_optimizacion(
        "rehabilitacion",
        modo_demanda="pronostico",
        fecha=fecha_lun,
    )
    res_dom = predict.simular_optimizacion(
        "rehabilitacion",
        modo_demanda="pronostico",
        fecha=fecha_dom,
    )
    assert res_lun["disponible"] is True
    assert res_dom["disponible"] is True
    assert res_lun["tipo_evaluacion"] == "fuera_de_muestra"
    assert res_dom["tipo_evaluacion"] == "fuera_de_muestra"
    assert res_lun["perfil_horario"]["corte_perfil"] <= res_lun["origen_pronostico"]
    assert res_dom["perfil_horario"]["corte_perfil"] <= res_dom["origen_pronostico"]
    assert (
        res_lun["demanda_diaria_pronosticada"]["p50"]
        != res_dom["demanda_diaria_pronosticada"]["p50"]
    )
    assert (
        res_lun["erlang_c_franjas"][0]["lambda_central_h"]
        != res_dom["erlang_c_franjas"][0]["lambda_central_h"]
    )

    # Fecha previa al backtest walk-forward -> modo retrospectivo explícito.
    res_retro = predict.simular_optimizacion(
        "urgencias",
        modo_demanda="pronostico",
        fecha="2025-07-01",
    )
    assert res_retro["disponible"] is True
    assert res_retro["tipo_evaluacion"] == "retrospectivo"
    assert res_retro["origen_pronostico"] is None
    assert res_retro["perfil_horario"]["corte_perfil"] <= "2025-07-01"
    json.dumps(res_lun, allow_nan=False)
    json.dumps(res_retro, allow_nan=False)


def test_simular_pronostico_bundle_anterior_y_fecha_sin_perfil(monkeypatch, paquete_sintetico_v21):
    from hun.models import predict

    bundle_anterior = {k: v for k, v in paquete_sintetico_v21.items() if k != "perfiles_horarios"}
    monkeypatch.setattr(predict, "_bundle_o_sintetico", lambda: bundle_anterior)

    res_ant = predict.simular_optimizacion(
        "urgencias",
        modo_demanda="pronostico",
        fecha="2026-07-10",
    )
    assert res_ant["disponible"] is False
    assert "Pronóstico por franja no disponible" in res_ant["motivo_no_disponible"]
    assert res_ant["erlang_c_franjas"] == []
    # El modo histórico sigue funcionando con el mismo bundle anterior.
    hist = predict.simular_optimizacion("urgencias")
    assert len(hist["erlang_c_franjas"]) == 4

    # Con paquete v2.1 pero fecha demasiado temprana (< 4 observaciones del mismo día).
    monkeypatch.setattr(predict, "_bundle_o_sintetico", lambda: paquete_sintetico_v21)
    res_sin_hist = predict.simular_optimizacion(
        "urgencias",
        modo_demanda="pronostico",
        fecha="2025-01-06",
    )
    assert res_sin_hist["disponible"] is False
    assert "Pronóstico por franja no disponible" in res_sin_hist["motivo_no_disponible"]
    assert res_sin_hist["erlang_c_franjas"] == []
