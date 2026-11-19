"""Pruebas completas de los endpoints de la API FastAPI (app/api/__init__.py).

Verifica códigos de estado HTTP, esquemas JSON, contrato canónico
(prediccion, min, max, alerta, factores), y robustez ante entradas inválidas.
"""

import importlib
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.api import app

client = TestClient(app)


def test_optimizacion_endpoint(monkeypatch):
    from hun.models import predict

    datos = {"erlang_c": {}, "ley_little_camas": {}, "recomendaciones": []}
    monkeypatch.setattr(predict, "obtener_optimizacion", lambda: datos, raising=False)
    response = client.get("/api/optimizacion")
    assert response.status_code == 200
    assert response.json() == datos


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {
            "servicio": "rehabilitacion",
            "tiempo_servicio_min": 5,
            "meta_espera_min": 1,
            "reduccion_estancia_horas": 0,
            "pct_altas_tempranas": 0,
        },
        {
            "tiempo_servicio_min": 120,
            "meta_espera_min": 120,
            "reduccion_estancia_horas": 48,
            "pct_altas_tempranas": 80,
        },
    ],
)
def test_simular_optimizacion_endpoint(monkeypatch, payload):
    from hun.models import predict

    llamadas = []
    resultado = {
        "servicio": payload.get("servicio", "urgencias"),
        "erlang_c_franjas": [],
        "camas_liberadas_estancia": 12.5,
        "escenario_altas_tempranas": {},
    }

    def simular(**kwargs):
        llamadas.append(kwargs)
        return resultado

    monkeypatch.setattr(predict, "simular_optimizacion", simular, raising=False)
    response = client.post("/api/optimizacion/simular", json=payload)
    assert response.status_code == 200
    assert response.json() == resultado
    assert llamadas == [
        {
            "servicio": "urgencias",
            "tiempo_servicio_min": 20.0,
            "meta_espera_min": 15.0,
            "reduccion_estancia_horas": 4.0,
            "pct_altas_tempranas": 30,
            **payload,
        }
    ]


def test_simular_optimizacion_con_fecha_y_dotacion_parametrica(monkeypatch):
    from hun.models import predict

    llamadas = []
    decision_mock = {
        "fecha": "2026-07-06",
        "servicio": "urgencias",
        "tipo_comparacion": "parametrica",
        "franja_critica": "Mañana (06-12h)",
        "franjas": [],
    }

    def simular_nueva(
        servicio: str,
        tiempo_servicio_min: float = 20.0,
        meta_espera_min: float = 15.0,
        reduccion_estancia_horas: float = 4.0,
        pct_altas_tempranas: float = 30,
        fecha=None,
        dotacion_habitual=None,
        dotacion_alternativa=None,
    ):
        llamadas.append(
            {
                "servicio": servicio,
                "tiempo_servicio_min": tiempo_servicio_min,
                "meta_espera_min": meta_espera_min,
                "reduccion_estancia_horas": reduccion_estancia_horas,
                "pct_altas_tempranas": pct_altas_tempranas,
                "fecha": fecha,
                "dotacion_habitual": dotacion_habitual,
                "dotacion_alternativa": dotacion_alternativa,
            }
        )
        return {
            "servicio": servicio,
            "erlang_c_franjas": [],
            "camas_liberadas_estancia": 10.0,
            "escenario_altas_tempranas": {},
            "decision_jornada": decision_mock,
        }

    monkeypatch.setattr(predict, "simular_optimizacion", simular_nueva, raising=False)
    response = client.post(
        "/api/optimizacion/simular",
        json={
            "servicio": "urgencias",
            "fecha": "2026-07-06",
            "dotacion_habitual": 12,
            "dotacion_alternativa": 14,
        },
    )
    assert response.status_code == 200
    assert response.json()["decision_jornada"] == decision_mock
    assert llamadas == [
        {
            "servicio": "urgencias",
            "tiempo_servicio_min": 20.0,
            "meta_espera_min": 15.0,
            "reduccion_estancia_horas": 4.0,
            "pct_altas_tempranas": 30,
            "fecha": date(2026, 7, 6),
            "dotacion_habitual": 12,
            "dotacion_alternativa": 14,
        }
    ]


def test_simular_optimizacion_resiliente_firma_legada(monkeypatch):
    from hun.models import predict

    llamadas = []

    def simular_legada(
        servicio: str,
        tiempo_servicio_min: float = 20.0,
        meta_espera_min: float = 15.0,
        reduccion_estancia_horas: float = 4.0,
        pct_altas_tempranas: float = 30,
    ):
        llamadas.append(servicio)
        return {
            "servicio": servicio,
            "erlang_c_franjas": [],
            "camas_liberadas_estancia": 10.0,
            "escenario_altas_tempranas": {},
        }

    monkeypatch.setattr(predict, "simular_optimizacion", simular_legada, raising=False)
    resp = client.post(
        "/api/optimizacion/simular",
        json={"servicio": "urgencias", "fecha": "2026-07-06", "dotacion_habitual": 12},
    )
    assert resp.status_code == 200
    assert llamadas == ["urgencias"]


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("tiempo_servicio_min", 4.9),
        ("tiempo_servicio_min", 120.1),
        ("meta_espera_min", 0.9),
        ("meta_espera_min", 120.1),
        ("reduccion_estancia_horas", -0.1),
        ("reduccion_estancia_horas", 48.1),
        ("pct_altas_tempranas", -1),
        ("pct_altas_tempranas", 81),
        ("pct_altas_tempranas", 30.5),
        ("servicio", None),
        ("dotacion_habitual", 0),
        ("dotacion_habitual", 201),
        ("dotacion_alternativa", 0),
        ("dotacion_alternativa", 201),
        ("fecha", "no-es-fecha"),
    ],
)
def test_simular_optimizacion_valida_sin_ejecutar(monkeypatch, campo, valor):
    from hun.models import predict

    llamadas = []
    monkeypatch.setattr(
        predict,
        "simular_optimizacion",
        lambda **kw: llamadas.append(kw),
        raising=False,
    )
    response = client.post("/api/optimizacion/simular", json={campo: valor})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", campo]
    assert llamadas == []


@pytest.mark.parametrize(
    ("nombre", "metodo", "ruta"),
    [
        ("obtener_optimizacion", "get", "/api/optimizacion"),
        ("simular_optimizacion", "post", "/api/optimizacion/simular"),
    ],
)
def test_optimizacion_no_disponible(monkeypatch, nombre, metodo, ruta):
    from hun.models import predict

    monkeypatch.delattr(predict, nombre, raising=False)
    response = client.get(ruta) if metodo == "get" else client.post(ruta, json={})
    assert response.status_code == 503
    assert response.json() == {"detail": "Módulo de optimización no disponible."}


@pytest.mark.parametrize(
    "origenes",
    [
        None,
        "https://app.vercel.app, http://localhost:5173",
    ],
)
def test_cors_configurable(monkeypatch, origenes):
    import app.api as api_mod

    if origenes is None:
        monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        permitidos = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    else:
        monkeypatch.setenv("ALLOWED_ORIGINS", origenes)
        permitidos = [o.strip() for o in origenes.split(",")]
    try:
        cors_client = TestClient(importlib.reload(api_mod).app)
        for origen in [*permitidos, "https://no-permitido.example"]:
            response = cors_client.options(
                "/api/health",
                headers={
                    "Origin": origen,
                    "Access-Control-Request-Method": "GET",
                },
            )
            assert response.status_code == (200 if origen in permitidos else 400)
            assert response.headers.get("access-control-allow-origin") == (
                origen if origen in permitidos else None
            )
    finally:
        monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        importlib.reload(api_mod)


def test_health_endpoint():
    """Verifica /api/health."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {"status": "ok", "hospital": "HUN", "version": "1.0.0"}


def test_servicios_endpoint():
    """Verifica /api/servicios."""
    response = client.get("/api/servicios")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3

    ids = [s["id"] for s in data]
    assert "urgencias" in ids
    assert "rehabilitacion" in ids
    assert "tratamiento_urgencia" in ids

    for s in data:
        assert "id" in s
        assert "nombre" in s
        assert "codigo" in s
        assert "mediaDiaria" in s and isinstance(s["mediaDiaria"], (int, float))
        assert "p75" in s and isinstance(s["p75"], (int, float))
        assert "p90" in s and isinstance(s["p90"], (int, float))
        assert s["mediaDiaria"] > 0
        assert s["p75"] <= s["p90"]


def test_parametros_endpoint():
    """Verifica /api/parametros."""
    response = client.get("/api/parametros")
    assert response.status_code == 200
    data = response.json()
    assert "servicios" in data
    assert "mapeo" in data
    assert "rango_datos" in data
    assert "urgencias" in data["servicios"]
    assert "inicio" in data["rango_datos"]
    assert "fin" in data["rango_datos"]


def test_ocupacion_endpoint():
    """Verifica /api/ocupacion."""
    response = client.get("/api/ocupacion")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3

    for item in data:
        assert "id" in item
        assert "nombreCompleto" in item
        assert "mediaDiaria" in item
        assert "p75" in item
        assert "p90" in item
        assert "ocupacion" in item
        assert "alertaPct" in item
        assert "estado" in item
        assert item["estado"] in ("verde", "amarillo", "rojo")


def test_turnos_endpoint():
    """Verifica /api/turnos/{servicio}."""
    for s in ["urgencias", "rehabilitacion", "tratamiento_urgencia"]:
        response = client.get(f"/api/turnos/{s}")
        assert response.status_code == 200
        data = response.json()
        assert "servicio" in data
        assert "franjas" in data
        assert "dias" in data
        assert "matriz" in data

        assert len(data["franjas"]) == 4
        assert len(data["dias"]) == 7
        assert len(data["matriz"]) == 4

        for fila in data["matriz"]:
            assert len(fila) == 7
            for celda in fila:
                assert "dia" in celda
                assert "franja" in celda
                assert "estimado" in celda
                assert "ratio" in celda
                assert "nivel" in celda
                assert celda["nivel"] in ("verde", "amarillo", "rojo")
                assert celda["estimado"] >= 0


def test_predecir_endpoint():
    """Verifica POST /api/predecir y el contrato canónico."""
    payload = {
        "fecha": "2026-07-10",
        "servicio": "urgencias",
    }
    response = client.post("/api/predecir", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Contrato canónico: prediccion, min, max, alerta, factores
    assert "prediccion" in data and isinstance(data["prediccion"], int)
    assert "min" in data and isinstance(data["min"], int)
    assert "max" in data and isinstance(data["max"], int)
    assert "alerta" in data and data["alerta"] in ("verde", "amarillo", "rojo")
    assert "factores" in data and isinstance(data["factores"], list)

    # Invariantes canónicos
    assert data["min"] >= 0
    assert data["min"] <= data["prediccion"]
    assert data["prediccion"] <= data["max"]

    # Factores son pares [nombre, valor]
    for f in data["factores"]:
        assert len(f) == 2
        assert isinstance(f[0], str)
        assert isinstance(f[1], (int, float))


def test_predecir_varios_servicios():
    """Verifica predicción para diferentes servicios y códigos concept_id."""
    casos = [
        ("2026-07-10", "urgencias"),
        ("2026-07-10", "9203"),
        ("2026-07-10", "rehabilitacion"),
        ("2026-07-10", "581479"),
        ("2026-07-10", "tratamiento_urgencia"),
        ("2026-07-10", "3045729"),
    ]
    for fecha, s in casos:
        resp = client.post("/api/predecir", json={"fecha": fecha, "servicio": s})
        assert resp.status_code == 200
        d = resp.json()
        assert d["min"] <= d["prediccion"] <= d["max"]
        assert d["alerta"] in ("verde", "amarillo", "rojo")


def test_predecir_rango_endpoint():
    """Verifica POST /api/predecir-rango y la serie temporal devuelta."""
    payload = {
        "fecha_inicio": "2026-07-10",
        "dias": 7,
        "servicio": "urgencias",
    }
    response = client.post("/api/predecir-rango", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["fecha"] == "2026-07-10"
    assert data["servicio"] == "urgencias"
    assert "prediccion" in data
    assert "min" in data
    assert "max" in data
    assert "alerta" in data
    assert "factores" in data
    assert "serie" in data

    serie = data["serie"]
    assert len(serie) == 7

    for punto in serie:
        assert "fecha" in punto
        assert "prediccion" in punto
        assert "min" in punto
        assert "max" in punto
        assert "habitual" in punto
        assert "simulado" in punto
        assert "p75" in punto
        assert "p90" in punto
        assert "factores" in punto
        assert punto["min"] <= punto["prediccion"] <= punto["max"]


def test_predecir_rango_horizonte_14():
    """Verifica predecir-rango con 14 días (horizonte usado por el frontend)."""
    payload = {
        "fecha_inicio": "2026-07-10",
        "dias": 14,
        "servicio": "rehabilitacion",
    }
    response = client.post("/api/predecir-rango", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["serie"]) == 14


def test_validaciones_pydantic():
    """Verifica que entradas inválidas devuelvan 422 Unprocessable Entity."""
    # Fecha inválida
    resp = client.post("/api/predecir", json={"fecha": "no-es-fecha", "servicio": "urgencias"})
    assert resp.status_code == 422

    # Falta servicio
    resp = client.post("/api/predecir", json={"fecha": "2026-07-10"})
    assert resp.status_code == 422

    # Días fuera de rango (ge=1, le=30)
    resp = client.post(
        "/api/predecir-rango",
        json={"fecha_inicio": "2026-07-10", "dias": 0, "servicio": "urgencias"},
    )
    assert resp.status_code == 422

    resp = client.post(
        "/api/predecir-rango",
        json={"fecha_inicio": "2026-07-10", "dias": 50, "servicio": "urgencias"},
    )
    assert resp.status_code == 422


# --------------------------------------------------------------------------- modo producción (T5)
def test_modo_produccion_falla_con_mensaje_claro_si_falta_paquete(monkeypatch, tmp_path):
    """En modo producción, si falta el paquete del modelo debe fallar sin tocar data/."""
    import pandas as pd

    from hun.models import predict as pred_mod

    monkeypatch.setenv("HUN_MODO_PRODUCCION", "1")
    monkeypatch.setenv("HUN_BUNDLE_PATH", str(tmp_path / "no_existe.joblib"))
    pred_mod.limpiar_cache_modelo()

    def _prohibido(*_args, **_kwargs):
        raise AssertionError("En modo producción no se debe leer ningún parquet de data/")

    monkeypatch.setattr(pd, "read_parquet", _prohibido)

    resp = client.post("/api/predecir", json={"fecha": "2026-07-10", "servicio": "urgencias"})
    assert resp.status_code == 503
    detalle = resp.json()["detail"]
    assert (
        "producción" in detalle.lower()
        and "modelos_web_bundle" in detalle
        or "paquete" in detalle.lower()
    )
    pred_mod.limpiar_cache_modelo()


def test_modo_produccion_carga_paquete_sin_tocar_data(monkeypatch, tmp_path):
    """Con un paquete válido, producción sirve predicciones sin tocar data/."""
    import joblib
    import pandas as pd

    from hun.models import empaquetar
    from hun.models import predict as pred_mod

    paquete_Sint = empaquetar.construir_paquete_sintetico_prueba()
    ruta_bundle = tmp_path / "modelos_web_bundle.joblib"
    joblib.dump(paquete_Sint, ruta_bundle)

    monkeypatch.setenv("HUN_MODO_PRODUCCION", "1")
    monkeypatch.setenv("HUN_BUNDLE_PATH", str(ruta_bundle))
    pred_mod.limpiar_cache_modelo()

    def _prohibido(*_args, **_kwargs):
        raise AssertionError("En modo producción no se debe leer ningún parquet de data/")

    monkeypatch.setattr(pd, "read_parquet", _prohibido)

    resp = client.post("/api/predecir", json={"fecha": "2026-07-10", "servicio": "urgencias"})
    assert resp.status_code == 200
    d = resp.json()
    assert d["min"] <= d["prediccion"] <= d["max"]
    pred_mod.limpiar_cache_modelo()


# --------------------------------------------------------------------------- endpoints nuevos (T6)
def test_endpoint_comparacion_predicho_vs_real():
    """Verifica GET /api/comparacion/{servicio}: predicho vs real y exactitud."""
    for s in ("urgencias", "rehabilitacion", "tratamiento_urgencia"):
        resp = client.get(f"/api/comparacion/{s}")
        assert resp.status_code == 200
        d = resp.json()
        assert d["servicio"] == s
        assert "exactitud" in d and 0.0 <= d["exactitud"] <= 1.0
        assert "wape" in d and "mae" in d and "cobertura" in d
        assert isinstance(d["serie"], list) and len(d["serie"]) > 0
        p0 = d["serie"][0]
        assert {"fecha", "real", "prediccion", "min", "max"}.issubset(p0.keys())
        assert p0["min"] <= p0["prediccion"] <= p0["max"]


def test_endpoint_efectos_eventos_por_servicio():
    """Verifica GET /api/efectos-eventos/{servicio}: efecto promedio histórico y frases."""
    for s in ("urgencias", "rehabilitacion", "tratamiento_urgencia"):
        resp = client.get(f"/api/efectos-eventos/{s}")
        assert resp.status_code == 200
        d = resp.json()
        assert d["servicio"] == s
        assert isinstance(d["eventos"], list) and len(d["eventos"]) >= 3
        nombres = {e["evento"] for e in d["eventos"]}
        assert {"festivos", "carnaval", "vacaciones"}.issubset(nombres)
        for ev in d["eventos"]:
            assert {
                "evento",
                "etiqueta",
                "media_evento",
                "media_normal",
                "cambio_visitas",
                "cambio_pct",
                "n_dias",
                "frase",
            }.issubset(ev.keys())
            assert isinstance(ev["frase"], str) and len(ev["frase"]) > 15


def test_endpoint_pronostico_largo_plazo():
    """Verifica GET /api/largo-plazo/{servicio}: pronóstico ago-nov 2026 y backtest a 120 días."""
    for s in ("urgencias", "rehabilitacion", "tratamiento_urgencia"):
        resp = client.get(f"/api/largo-plazo/{s}")
        assert resp.status_code == 200
        d = resp.json()
        assert d["servicio"] == s
        assert "backtest_120d" in d
        bt = d["backtest_120d"]
        assert {"exactitud", "wape", "mae", "cobertura"}.issubset(bt.keys())
        assert isinstance(d["resumen_mensual"], list) and len(d["resumen_mensual"]) == 4
        assert isinstance(d["serie"], list) and len(d["serie"]) >= 120
        for punto in d["serie"][:5]:
            assert {"fecha", "prediccion", "min", "max", "mes_horizonte"}.issubset(punto.keys())
            assert punto["min"] <= punto["prediccion"] <= punto["max"]


def test_simular_optimizacion_pronostico_requiere_fecha():
    """En modo pronóstico sin fecha la validación de Pydantic devuelve 422."""
    resp = client.post(
        "/api/optimizacion/simular",
        json={"servicio": "urgencias", "modo_demanda": "pronostico"},
    )
    assert resp.status_code == 422


def test_simular_optimizacion_pronostico_produccion_bundle_anterior_y_sintetico(
    monkeypatch, tmp_path
):
    """Verifica modo producción con bundle anterior (degradación) y v2.1 sintético."""
    from datetime import date

    import joblib
    import pandas as pd

    from hun.models import empaquetar
    from hun.models import predict as pred_mod

    paquete_v21 = empaquetar.construir_paquete_sintetico_prueba()
    paquete_v20 = {k: v for k, v in paquete_v21.items() if k != "perfiles_horarios"}

    ruta_v20 = tmp_path / "bundle_v20.joblib"
    ruta_v21 = tmp_path / "bundle_v21.joblib"
    joblib.dump(paquete_v20, ruta_v20)
    joblib.dump(paquete_v21, ruta_v21)

    def _prohibido(*_args, **_kwargs):
        raise AssertionError("En modo producción no se debe leer ningún parquet de data/")

    monkeypatch.setattr(pd, "read_parquet", _prohibido)
    monkeypatch.setenv("HUN_MODO_PRODUCCION", "1")

    try:
        # 1) Bundle anterior v2.0: histórico funciona y pronóstico degrada con aviso claro.
        monkeypatch.setenv("HUN_BUNDLE_PATH", str(ruta_v20))
        pred_mod.limpiar_cache_modelo()

        r_hist = client.post("/api/optimizacion/simular", json={"servicio": "urgencias"})
        assert r_hist.status_code == 200
        assert len(r_hist.json()["erlang_c_franjas"]) == 4

        r_v20 = client.post(
            "/api/optimizacion/simular",
            json={"servicio": "urgencias", "modo_demanda": "pronostico", "fecha": "2026-07-10"},
        )
        assert r_v20.status_code == 200
        d_v20 = r_v20.json()
        assert d_v20["disponible"] is False
        assert "Pronóstico por franja no disponible" in d_v20["motivo_no_disponible"]
        assert d_v20["erlang_c_franjas"] == []

        # 2) Bundle v2.1 sintético: fuera de muestra, reconciliado y sensible a la fecha.
        monkeypatch.setenv("HUN_BUNDLE_PATH", str(ruta_v21))
        pred_mod.limpiar_cache_modelo()

        serie_reh = paquete_v21["comparacion_real"]["rehabilitacion"]["serie"]
        f_lun = next(
            p["fecha"]
            for p in serie_reh
            if p.get("origen") and date.fromisoformat(p["fecha"]).weekday() == 0
        )
        f_dom = next(
            p["fecha"]
            for p in serie_reh
            if p.get("origen") and date.fromisoformat(p["fecha"]).weekday() == 6
        )

        r_lun = client.post(
            "/api/optimizacion/simular",
            json={
                "servicio": "rehabilitacion",
                "modo_demanda": "pronostico",
                "fecha": f_lun,
                "tiempo_servicio_min": 30,
                "meta_espera_min": 15,
            },
        )
        r_dom = client.post(
            "/api/optimizacion/simular",
            json={
                "servicio": "rehabilitacion",
                "modo_demanda": "pronostico",
                "fecha": f_dom,
                "tiempo_servicio_min": 30,
                "meta_espera_min": 15,
            },
        )
        assert r_lun.status_code == 200 and r_dom.status_code == 200
        d_lun, d_dom = r_lun.json(), r_dom.json()
        assert d_lun["disponible"] is True and d_dom["disponible"] is True
        assert d_lun["tipo_evaluacion"] == "fuera_de_muestra"
        assert len(d_lun["erlang_c_franjas"]) == 4
        assert (
            d_lun["erlang_c_franjas"][0]["lambda_central_h"]
            != d_dom["erlang_c_franjas"][0]["lambda_central_h"]
        )
    finally:
        pred_mod.limpiar_cache_modelo()
