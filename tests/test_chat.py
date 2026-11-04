"""Pruebas unitarias para el asistente `/api/chat` (`app/api/chat.py`) con IA simulada."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.api import app
from app.api import chat as chat_mod

client = TestClient(app)


def test_herramientas_chatbot_devuelven_datos_reales_sin_pacientes():
    """Las 5 herramientas del chatbot consultan salidas del modelo y agregados, nunca pacientes."""
    r1 = chat_mod.ejecutar_herramienta("predecir", {"fecha": "2026-07-10", "servicio": "urgencias"})
    assert "prediccion" in r1 and "alerta" in r1

    r2 = chat_mod.ejecutar_herramienta(
        "predecir_rango", {"fecha_inicio": "2026-07-10", "dias": 5, "servicio": "urgencias"}
    )
    assert len(r2["serie"]) == 5

    r3 = chat_mod.ejecutar_herramienta(
        "simular_escenario",
        {"fecha": "2026-07-10", "servicio": "urgencias", "evento": "festivos"},
    )
    assert "base" in r3 and "simulado" in r3 and "delta_visitas" in r3

    r4 = chat_mod.ejecutar_herramienta("efecto_promedio_evento", {"servicio": "rehabilitacion"})
    assert "eventos" in r4 and len(r4["eventos"]) >= 3

    r5 = chat_mod.ejecutar_herramienta("indicadores_cuellos_botella", {})
    assert "etapas" in r5 and "etapa_critica" in r5


def test_endpoint_chat_con_ia_simulada_usa_herramienta_y_recorta_palabras(monkeypatch):
    """Inyecta guía y estado de pantalla, ejecuta herramientas y limita palabras."""
    chat_mod.limpiar_rate_limit()
    llamadas = []

    def _ia_simulada(mensajes, system_prompt, herramientas, ejecutor, timeout_s):
        llamadas.append(
            {"system": system_prompt, "herramientas": [h["name"] for h in herramientas]}
        )
        datos = ejecutor("predecir", {"fecha": "2026-07-10", "servicio": "urgencias"})
        texto_largo = (
            f"Para urgencias el 2026-07-10 se esperan {datos['prediccion']} llegadas "
            f"(rango {datos['min']} a {datos['max']}, alerta {datos['alerta']}). "
            + " ".join(["palabra"] * 200)
        )
        return texto_largo, ["predecir"]

    monkeypatch.setattr(chat_mod, "_llamar_claude_con_herramientas", _ia_simulada)

    payload = {
        "mensaje": "¿Cuántos pacientes se esperan el 2026-07-10 en urgencias?",
        "estado_pantalla": {
            "servicio": "urgencias",
            "fecha": "2026-07-10",
            "prediccion": 215,
            "intervalo": [175, 255],
            "alerta": "verde",
            "factores": [{"nombre": "Día de la semana", "aporte": 12}],
        },
    }
    resp = client.post("/api/chat", json=payload)
    assert resp.status_code == 200
    d = resp.json()
    assert d["modo"] == "ia"
    assert "predecir" in d["herramientas_usadas"]
    assert len(d["respuesta"].split()) <= 155
    assert len(llamadas) == 1
    assert "Glosario" in llamadas[0]["system"] or "semáforo" in llamadas[0]["system"].lower()
    assert "2026-07-10" in llamadas[0]["system"]


def test_endpoint_chat_pregunta_fuera_de_tema_responde_amablemente():
    """Si la pregunta no es sobre el hospital ni la herramienta, lo indica amablemente."""
    chat_mod.limpiar_rate_limit()
    resp = client.post(
        "/api/chat",
        json={"mensaje": "¿Cuál es la receta de una pizza napolitana?"},
    )
    assert resp.status_code == 200
    d = resp.json()
    assert d["modo"] == "fuera_de_tema"
    assert "herramienta" in d["respuesta"].lower() or "pronóstico" in d["respuesta"].lower()


def test_endpoint_chat_respaldo_cuando_ia_no_responde(monkeypatch):
    """Si la IA falla o falta ANTHROPIC_API_KEY, usa respaldo con datos reales."""
    chat_mod.limpiar_rate_limit()

    def _ia_falla(*_args, **_kwargs):
        raise TimeoutError("Tiempo agotado al contactar el proveedor de IA")

    monkeypatch.setattr(chat_mod, "_llamar_claude_con_herramientas", _ia_falla)

    resp = client.post(
        "/api/chat",
        json={
            "mensaje": "Explícame la predicción actual de urgencias",
            "estado_pantalla": {
                "servicio": "urgencias",
                "fecha": "2026-07-10",
                "prediccion": 210,
                "intervalo": [170, 250],
                "alerta": "verde",
                "factores": [{"nombre": "Festivos", "aporte": -15}],
            },
        },
    )
    assert resp.status_code == 200
    d = resp.json()
    assert d["modo"] == "respaldo"
    assert "210" in d["respuesta"]


def test_endpoint_chat_rate_limit(monkeypatch):
    """Aplica el límite de solicitudes por minuto y responde 429 al superarlo."""
    chat_mod.limpiar_rate_limit()
    monkeypatch.setattr(chat_mod, "MAX_SOLICITUDES_POR_MINUTO", 2)
    monkeypatch.setattr(
        chat_mod,
        "_llamar_claude_con_herramientas",
        lambda *_a, **_k: ("Respuesta corta de prueba.", []),
    )

    for _ in range(2):
        r = client.post("/api/chat", json={"mensaje": "¿Qué significa alerta amarilla?"})
        assert r.status_code == 200

    r_bloqueado = client.post("/api/chat", json={"mensaje": "¿Qué significa alerta roja?"})
    assert r_bloqueado.status_code == 429
    chat_mod.limpiar_rate_limit()
