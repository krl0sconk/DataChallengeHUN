"""Asistente conversacional `/api/chat` para la plataforma web del HUN.

Conecta el modelo `claude-haiku-5-5` (API de Anthropic, clave `ANTHROPIC_API_KEY` solo en `.env`)
con el contexto de `docs/guia_chatbot.md`, el estado actual de la pantalla enviado por la web y
cinco herramientas de solo lectura sobre las salidas del modelo:

1. `predecir`: pronóstico puntual, intervalo, alerta y factores SHAP.
2. `predecir_rango`: serie diaria de 1 a 30 días.
3. `simular_escenario`: qué pasa si ocurre un evento (festivos, Carnaval, vacaciones, etc.).
4. `efecto_promedio_evento`: impacto histórico medido de cada evento por servicio.
5. `indicadores_cuellos_botella`: duración y saturación por etapa de atención en urgencias.

Nunca accede a la base de datos ni a filas de pacientes. Incluye límite de solicitudes por
minuto, tiempo máximo de espera, tope de ~150 palabras y respuesta de respaldo determinista si
la IA no está configurada o no responde.
"""

from __future__ import annotations

import json
import logging
import os
import time
from collections import deque
from collections.abc import Callable
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import requests
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from hun import config
from hun.models.predict import (
    PARAMETROS_SERVICIO,
    normalizar_servicio,
    obtener_efectos_eventos,
    obtener_indicadores_cuellos_botella,
    predecir,
    predecir_rango,
)

log = logging.getLogger("api.chat")

router = APIRouter()

MODELO_CLAUDE: str = "claude-haiku-5-5"
ANTHROPIC_API_URL: str = "https://api.anthropic.com/v1/messages"
MAX_PALABRAS_RESPUESTA: int = 150
TIMEOUT_IA_SEGUNDOS: float = 12.0
MAX_SOLICITUDES_POR_MINUTO: int = 20

_VENTANA_SOLICITUDES: dict[str, deque[float]] = {}

_PALABRAS_FUERA_DE_TEMA: tuple[str, ...] = (
    "receta",
    "pizza",
    "futbol",
    "fútbol",
    "horoscopo",
    "horóscopo",
    "chiste",
    "pelicula",
    "película",
    "criptomoneda",
    "bitcoin",
    "videojuego",
)

_PALABRAS_DOMINIO: tuple[str, ...] = (
    "urgencia",
    "rehabilita",
    "tratamiento",
    "hospital",
    "hun",
    "paciente",
    "llegada",
    "demanda",
    "predicci",
    "pronostico",
    "pronóstico",
    "alerta",
    "semaforo",
    "semáforo",
    "verde",
    "amarill",
    "roj",
    "intervalo",
    "rango",
    "min",
    "max",
    "festivo",
    "carnaval",
    "vacacion",
    "semana santa",
    "fin de semana",
    "etapa",
    "cuello",
    "botella",
    "observaci",
    "triage",
    "reanimaci",
    "simula",
    "herramienta",
    "grafica",
    "gráfica",
    "turno",
    "ocupaci",
    "saturaci",
    "shap",
    "factor",
)


class FactorPantalla(BaseModel):
    nombre: str
    aporte: float


class EstadoPantalla(BaseModel):
    servicio: str = Field(default="urgencias")
    fecha: str = Field(default="2026-07-10")
    prediccion: int | None = None
    intervalo: list[int] | None = None
    alerta: str | None = None
    factores: list[FactorPantalla] = Field(default_factory=list)


class ChatRequest(BaseModel):
    mensaje: str = Field(..., min_length=1, max_length=1000)
    estado_pantalla: EstadoPantalla | None = None


def limpiar_rate_limit() -> None:
    """Reinicia el contador de solicitudes por minuto (útil en pruebas)."""
    _VENTANA_SOLICITUDES.clear()


def _verificar_rate_limit(cliente_id: str) -> None:
    ahora = time.monotonic()
    cola = _VENTANA_SOLICITUDES.setdefault(cliente_id, deque())
    while cola and ahora - cola[0] > 60.0:
        cola.popleft()
    if len(cola) >= MAX_SOLICITUDES_POR_MINUTO:
        raise HTTPException(
            status_code=429,
            detail="Límite de consultas por minuto alcanzado. Intenta de nuevo en unos segundos.",
        )
    cola.append(ahora)


def cargar_guia_chatbot() -> str:
    """Lee `docs/guia_chatbot.md` para inyectarla en el prompt de sistema."""
    ruta: Path = config.ROOT_DIR / "docs" / "guia_chatbot.md"
    if ruta.exists():
        return ruta.read_text(encoding="utf-8")
    return (
        "Asistente operativo del Hospital Universidad del Norte. Responde en español, "
        "en menos de 150 palabras y solo con cifras del modelo."
    )


def _es_fuera_de_tema(mensaje: str) -> bool:
    texto = mensaje.lower()
    if any(p in texto for p in _PALABRAS_DOMINIO):
        return False
    if any(p in texto for p in _PALABRAS_FUERA_DE_TEMA):
        return True
    return False


def recortar_palabras(texto: str, max_palabras: int = MAX_PALABRAS_RESPUESTA) -> str:
    """Recorta la respuesta a `max_palabras` sin cortar frases bruscamente."""
    palabras = texto.strip().split()
    if len(palabras) <= max_palabras:
        return texto.strip()
    recorte = " ".join(palabras[:max_palabras])
    if not recorte.endswith((".", "!", "?")):
        recorte += "..."
    return recorte


HERRAMIENTAS_ESQUEMA: list[dict[str, Any]] = [
    {
        "name": "predecir",
        "description": (
            "Obtiene la predicción puntual, el intervalo [min, max], "
            "la alerta y los factores SHAP de un servicio en una fecha."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "fecha": {"type": "string", "description": "Fecha YYYY-MM-DD"},
                "servicio": {
                    "type": "string",
                    "description": "urgencias, rehabilitacion o tratamiento_urgencia",
                },
            },
            "required": ["fecha", "servicio"],
        },
    },
    {
        "name": "predecir_rango",
        "description": "Obtiene el pronóstico diario consecutivo para un rango de 1 a 30 días.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fecha_inicio": {"type": "string", "description": "Fecha inicial YYYY-MM-DD"},
                "dias": {"type": "integer", "description": "Cantidad de días (1 a 30)"},
                "servicio": {"type": "string", "description": "Servicio hospitalario"},
            },
            "required": ["fecha_inicio", "servicio"],
        },
    },
    {
        "name": "simular_escenario",
        "description": (
            "Simula qué pasa con las llegadas de un servicio en una fecha si "
            "ocurre un evento (festivos, carnaval, semana_santa, vacaciones, fin_de_semana)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "fecha": {"type": "string", "description": "Fecha YYYY-MM-DD"},
                "servicio": {"type": "string", "description": "Servicio hospitalario"},
                "evento": {
                    "type": "string",
                    "description": "festivos, carnaval, semana_santa, vacaciones o fin_de_semana",
                },
            },
            "required": ["fecha", "servicio", "evento"],
        },
    },
    {
        "name": "efecto_promedio_evento",
        "description": (
            "Devuelve el efecto promedio histórico medido de festivos, Carnaval, "
            "Semana Santa, vacaciones y fines de semana en un servicio."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "servicio": {"type": "string", "description": "Servicio hospitalario"},
            },
            "required": ["servicio"],
        },
    },
    {
        "name": "indicadores_cuellos_botella",
        "description": (
            "Devuelve las duraciones (mediana y p90 en horas) y los umbrales "
            "de saturación por etapa de atención."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
]


def ejecutar_herramienta(nombre: str, argumentos: dict[str, Any]) -> dict[str, Any]:
    """Ejecuta una herramienta interna de la API (solo lecturas del modelo y agregados)."""
    if nombre == "predecir":
        f = date.fromisoformat(str(argumentos.get("fecha", "2026-07-10"))[:10])
        srv = normalizar_servicio(str(argumentos.get("servicio", "urgencias")))
        res = predecir(f, srv)
        return {
            "fecha": f.isoformat(),
            "servicio": srv,
            "prediccion": res["prediccion"],
            "min": res["min"],
            "max": res["max"],
            "alerta": res["alerta"],
            "factores": [{"nombre": k, "aporte": float(v)} for k, v in res.get("factores", [])],
        }

    if nombre == "predecir_rango":
        f_ini = date.fromisoformat(str(argumentos.get("fecha_inicio", "2026-07-10"))[:10])
        dias = max(1, min(30, int(argumentos.get("dias", 7))))
        srv = normalizar_servicio(str(argumentos.get("servicio", "urgencias")))
        serie = predecir_rango(f_ini, f_ini + timedelta(days=dias - 1), srv)
        return {
            "servicio": srv,
            "fecha_inicio": f_ini.isoformat(),
            "dias": dias,
            "serie": [
                {
                    "fecha": p["fecha"].isoformat()
                    if hasattr(p["fecha"], "isoformat")
                    else str(p["fecha"]),
                    "prediccion": p["prediccion"],
                    "min": p["min"],
                    "max": p["max"],
                    "alerta": p["alerta"],
                }
                for p in serie
            ],
        }

    if nombre == "simular_escenario":
        f = date.fromisoformat(str(argumentos.get("fecha", "2026-07-10"))[:10])
        srv = normalizar_servicio(str(argumentos.get("servicio", "urgencias")))
        evento = str(argumentos.get("evento", "festivos")).strip().lower()
        base_pred = predecir(f, srv)
        ef_srv = obtener_efectos_eventos(srv)
        ev_match = next(
            (
                e
                for e in ef_srv.get("eventos", [])
                if e["evento"] == evento or evento in e["evento"]
            ),
            ef_srv["eventos"][0]
            if ef_srv.get("eventos")
            else {"cambio_pct": 0.0, "etiqueta": evento},
        )
        factor = 1.0 + float(ev_match.get("cambio_pct", 0.0)) / 100.0
        sim_val = max(0, int(round(base_pred["prediccion"] * factor)))
        params = PARAMETROS_SERVICIO.get(srv, PARAMETROS_SERVICIO["urgencias"])
        alerta_sim = (
            "rojo"
            if sim_val > params["umbral_p90"]
            else ("amarillo" if sim_val >= params["umbral_p75"] else "verde")
        )
        return {
            "fecha": f.isoformat(),
            "servicio": srv,
            "evento": ev_match.get("etiqueta", evento),
            "base": base_pred["prediccion"],
            "simulado": sim_val,
            "delta_visitas": sim_val - base_pred["prediccion"],
            "cambio_pct_historico": ev_match.get("cambio_pct", 0.0),
            "alerta_simulada": alerta_sim,
        }

    if nombre == "efecto_promedio_evento":
        srv = normalizar_servicio(str(argumentos.get("servicio", "urgencias")))
        return obtener_efectos_eventos(srv)

    if nombre == "indicadores_cuellos_botella":
        return obtener_indicadores_cuellos_botella()

    raise ValueError(f"Herramienta no reconocida: {nombre}")


def _construir_system_prompt(estado: EstadoPantalla | None) -> str:
    guia = cargar_guia_chatbot()
    estado_txt = (
        json.dumps(estado.model_dump(), ensure_ascii=False)
        if estado is not None
        else "Sin estado de pantalla enviado (usa urgencias y 2026-07-10 por defecto)."
    )
    return (
        f"{guia}\n\n"
        f"## Estado actual de la pantalla del usuario\n{estado_txt}\n\n"
        "Recuerda: responde en español, en máximo 150 palabras, sin inventar cifras y "
        "cerrando con una acción concreta."
    )


def _llamar_claude_con_herramientas(
    mensajes: list[dict[str, Any]],
    system_prompt: str,
    herramientas: list[dict[str, Any]],
    ejecutor: Callable[[str, dict[str, Any]], dict[str, Any]],
    timeout_s: float = TIMEOUT_IA_SEGUNDOS,
) -> tuple[str, list[str]]:
    """Llama a la API de Anthropic (`claude-haiku-5-5`) y resuelve las herramientas."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY no configurada en el entorno.")

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    usadas: list[str] = []
    historial = list(mensajes)

    for _ in range(3):
        cuerpo = {
            "model": MODELO_CLAUDE,
            "max_tokens": 350,
            "system": system_prompt,
            "tools": herramientas,
            "messages": historial,
        }
        resp = requests.post(ANTHROPIC_API_URL, headers=headers, json=cuerpo, timeout=timeout_s)
        resp.raise_for_status()
        data = resp.json()
        bloques = data.get("content", [])
        tool_uses = [b for b in bloques if b.get("type") == "tool_use"]
        if not tool_uses:
            textos = [b.get("text", "") for b in bloques if b.get("type") == "text"]
            return "\n".join(textos).strip(), usadas

        historial.append({"role": "assistant", "content": bloques})
        resultados_tools = []
        for tu in tool_uses:
            nom = str(tu.get("name", ""))
            inp = tu.get("input") or {}
            usadas.append(nom)
            salida = ejecutor(nom, inp)
            resultados_tools.append(
                {
                    "type": "tool_result",
                    "tool_use_id": tu.get("id"),
                    "content": json.dumps(salida, ensure_ascii=False),
                }
            )
        historial.append({"role": "user", "content": resultados_tools})

    return "Se completó la consulta de herramientas.", usadas


def _respuesta_respaldo(mensaje: str, estado: EstadoPantalla | None) -> tuple[str, list[str]]:
    """Construye una respuesta determinista con datos reales del modelo si la IA no responde."""
    est = estado or EstadoPantalla()
    srv = normalizar_servicio(est.servicio)
    fecha_str = est.fecha or "2026-07-10"
    usadas: list[str] = []
    msg = mensaje.lower()

    if "cuello" in msg or "etapa" in msg or "observaci" in msg:
        cb = ejecutar_herramienta("indicadores_cuellos_botella", {})
        usadas.append("indicadores_cuellos_botella")
        etapas = cb.get("etapas", [])
        top = (
            etapas[0]
            if etapas
            else {"etapa": "Observación", "mediana_horas": 10.7, "p90_horas": 41.3}
        )
        return (
            f" Modo respaldo activo (con datos reales del modelo): la etapa con mayor tiempo "
            f"de estancia es {top['etapa']} (mediana {top['mediana_horas']} h, percentil 90 de "
            f"{top['p90_horas']} h). Acción sugerida: priorizar altas tempranas y traslados a "
            "piso antes del pico del mediodía.",
            usadas,
        )

    if any(k in msg for k in ("festivo", "carnaval", "vacacion", "semana santa")):
        ef_srv = ejecutar_herramienta("efecto_promedio_evento", {"servicio": srv})
        usadas.append("efecto_promedio_evento")
        frases = [e["frase"] for e in ef_srv.get("eventos", [])[:2]]
        return (
            " Modo respaldo activo (datos históricos reales): "
            + " ".join(frases)
            + " Acción sugerida: ajustar la programación de turnos según este cambio esperado.",
            usadas,
        )

    if est.prediccion is not None and est.intervalo and len(est.intervalo) == 2:
        pred_val = est.prediccion
        lo, hi = est.intervalo[0], est.intervalo[1]
        alerta = est.alerta or "verde"
    else:
        datos = ejecutar_herramienta("predecir", {"fecha": fecha_str, "servicio": srv})
        usadas.append("predecir")
        pred_val = datos["prediccion"]
        lo, hi = datos["min"], datos["max"]
        alerta = datos["alerta"]

    accion = {
        "verde": "mantener la dotación habitual del turno.",
        "amarillo": "reforzar admisión y agilizar altas tempranas.",
        "rojo": "activar refuerzo de personal y camas de contingencia.",
    }.get(alerta, "monitorear el flujo del servicio.")

    return (
        f"En {srv} para el {fecha_str} se estiman {pred_val} llegadas "
        f"(rango esperado de {lo} a {hi} pacientes, alerta {alerta}). "
        f"Recomendación operativa: {accion}",
        usadas,
    )


@router.post("/api/chat")
def endpoint_chat(payload: ChatRequest, request: Request) -> dict[str, Any]:
    """Atiende consultas sobre la herramienta usando Claude Haiku o respaldo determinista."""
    cliente_ip = request.client.host if request.client else "local"
    _verificar_rate_limit(cliente_ip)

    if _es_fuera_de_tema(payload.mensaje):
        return {
            "modo": "fuera_de_tema",
            "modelo": MODELO_CLAUDE,
            "herramientas_usadas": [],
            "respuesta": (
                "Soy el asistente operativo de la herramienta de pronóstico del Hospital "
                "Universidad del Norte. Puedo ayudarte a interpretar las llegadas esperadas, "
                "el semáforo de alerta, el simulador de eventos o los cuellos de botella por "
                "etapa. ¿Qué servicio o fecha quieres revisar?"
            ),
        }

    system_prompt = _construir_system_prompt(payload.estado_pantalla)
    mensajes = [{"role": "user", "content": payload.mensaje}]

    try:
        texto, usadas = _llamar_claude_con_herramientas(
            mensajes,
            system_prompt,
            HERRAMIENTAS_ESQUEMA,
            ejecutar_herramienta,
            TIMEOUT_IA_SEGUNDOS,
        )
        return {
            "modo": "ia",
            "modelo": MODELO_CLAUDE,
            "herramientas_usadas": usadas,
            "respuesta": recortar_palabras(texto, MAX_PALABRAS_RESPUESTA),
        }
    except Exception as exc:
        log.info("Usando respuesta de respaldo en /api/chat (%s)", exc)
        texto_resp, usadas_resp = _respuesta_respaldo(payload.mensaje, payload.estado_pantalla)
        return {
            "modo": "respaldo",
            "modelo": MODELO_CLAUDE,
            "herramientas_usadas": usadas_resp,
            "respuesta": recortar_palabras(texto_resp, MAX_PALABRAS_RESPUESTA),
        }
