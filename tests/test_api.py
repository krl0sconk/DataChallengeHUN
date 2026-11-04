"""Pruebas completas de los endpoints de la API FastAPI (app/api/__init__.py).

Verifica códigos de estado HTTP, esquemas JSON, contrato canónico
(prediccion, min, max, alerta, factores), y robustez ante entradas inválidas.
"""

from fastapi.testclient import TestClient

from app.api import app

client = TestClient(app)


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
