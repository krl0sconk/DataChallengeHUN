"""Servidor de API FastAPI para la aplicación web asistencial del HUN.

Expone el contrato canónico de predicción definido en src/hun/models/predict.py
para su consumo desacoplado desde la interfaz React (Vite).
"""

from __future__ import annotations

import os
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

# Asegurar resolución del paquete `hun` al ejecutar desde cualquier directorio
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from hun.models import predict as _predict_mod  # noqa: E402
from hun.models.predict import (  # noqa: E402
    PARAMETROS_SERVICIO,
    SERVICIOS_CANONICOS,
    obtener_comparacion_real,
    obtener_efectos_eventos,
    obtener_indicadores_cuellos_botella,
    obtener_llegadas_reales,
    obtener_ocupacion_real,
    obtener_pronostico_largo_plazo,
    obtener_turnos_reales,
    predecir,
    predecir_rango,
)

app = FastAPI(
    title="Hospital Universidad del Norte - API de Pronóstico",
    description=(
        "Capa de servicio HTTP para estimación de afluencia asistencial (Data Challenge 2026)"
    ),
    version="1.0.0",
)

# Configurar orígenes explícitos para despliegue; conservar desarrollo local por defecto.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origen.strip()
        for origen in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
        ).split(",")
        if origen.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PrediccionRequest(BaseModel):
    fecha: date = Field(..., description="Fecha objetivo de predicción (YYYY-MM-DD)")
    servicio: str = Field(
        ..., description="Nombre o concept_id del servicio (urgencias, 9203, etc.)"
    )


class RangoRequest(BaseModel):
    fecha_inicio: date = Field(..., description="Fecha de inicio (YYYY-MM-DD)")
    dias: int = Field(default=7, ge=1, le=30, description="Horizonte de días a predecir")
    servicio: str = Field(..., description="Nombre o concept_id del servicio")


class SimulacionOptimizacionRequest(BaseModel):
    """Supuestos configurables, no mediciones de dotación real."""

    servicio: str = "urgencias"
    tiempo_servicio_min: float = Field(20.0, ge=5.0, le=120.0)
    meta_espera_min: float = Field(15.0, ge=1.0, le=120.0)
    reduccion_estancia_horas: float = Field(4.0, ge=0.0, le=48.0)
    pct_altas_tempranas: int = Field(30, ge=0, le=80)


def _consultar_optimizacion(nombre: str, **parametros: Any) -> dict[str, Any]:
    funcion = getattr(_predict_mod, nombre, None)
    if funcion is None:
        raise HTTPException(status_code=503, detail="Módulo de optimización no disponible.")
    try:
        return funcion(**parametros)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/optimizacion")
def endpoint_optimizacion() -> dict[str, Any]:
    """Consulta recomendaciones cuantificadas y sus supuestos operacionales."""
    return _consultar_optimizacion("obtener_optimizacion")


@app.post("/api/optimizacion/simular")
def endpoint_simular_optimizacion(payload: SimulacionOptimizacionRequest) -> dict[str, Any]:
    """Simula dotación, estancia y altas sin modificar los datos históricos."""
    return _consultar_optimizacion("simular_optimizacion", **payload.model_dump())


@app.get("/api/health")
def health() -> dict[str, str]:
    """Chequeo de estado del servicio."""
    return {"status": "ok", "hospital": "HUN", "version": "1.0.0"}


@app.get("/api/servicios")
def obtener_servicios() -> list[dict[str, Any]]:
    """Devuelve la lista de servicios asistenciales configurados."""
    nombres_visibles = {
        "urgencias": ("Urgencias", "OMOP 9203"),
        "rehabilitacion": ("Rehabilitación Ambulatoria", "OMOP 581479"),
        "tratamiento_urgencia": ("Tratamiento Urgencias", "OMOP 3045729"),
    }
    servicios = []
    for sid, (nombre, codigo) in nombres_visibles.items():
        params = PARAMETROS_SERVICIO[sid]
        servicios.append(
            {
                "id": sid,
                "nombre": nombre,
                "codigo": codigo,
                "mediaDiaria": params["media_diaria"],
                "p75": params["umbral_p75"],
                "p90": params["umbral_p90"],
            }
        )
    return servicios


@app.get("/api/turnos/{servicio}")
def obtener_turnos(servicio: str) -> dict[str, Any]:
    """Calcula la matriz de afluencia estimada por franja horaria y día de la semana."""
    return obtener_turnos_reales(servicio)


@app.get("/api/parametros")
def obtener_parametros() -> dict[str, Any]:
    """Devuelve los parámetros operativos y umbrales canónicos del modelo."""
    return {
        "servicios": PARAMETROS_SERVICIO,
        "mapeo": SERVICIOS_CANONICOS,
        "rango_datos": {
            "inicio": "2023-01-01",
            "fin": "2026-07-16",
            "base_maxima": "2026-07-10",
        },
    }


@app.get("/api/ocupacion")
def endpoint_ocupacion() -> list[dict[str, Any]]:
    """Calcula la comparativa de ocupación y presión hospitalaria con parámetros canónicos."""
    return obtener_ocupacion_real()


@app.post("/api/predecir")
def endpoint_predecir(payload: PrediccionRequest) -> dict[str, Any]:
    """Genera la predicción puntual para una fecha y servicio aplicando el contrato."""
    try:
        resultado = predecir(payload.fecha, payload.servicio)
        if "real" not in resultado:
            resultado["real"] = obtener_llegadas_reales(payload.fecha, payload.servicio)
        return resultado
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/predecir-rango")
def endpoint_predecir_rango(payload: RangoRequest) -> dict[str, Any]:
    """Genera el pronóstico diario y la serie consecutiva para el horizonte pedido."""
    try:
        fecha_fin = payload.fecha_inicio + timedelta(days=payload.dias - 1)
        serie = predecir_rango(payload.fecha_inicio, fecha_fin, payload.servicio)
        puntual = predecir(payload.fecha_inicio, payload.servicio)
        real_puntual = puntual.get("real")
        if real_puntual is None:
            real_puntual = obtener_llegadas_reales(payload.fecha_inicio, payload.servicio)

        sid_lower = payload.servicio.lower()
        param_serv = PARAMETROS_SERVICIO.get(sid_lower, PARAMETROS_SERVICIO["urgencias"])
        p75_val = param_serv["umbral_p75"]
        p90_val = param_serv["umbral_p90"]

        return {
            "fecha": str(payload.fecha_inicio),
            "servicio": payload.servicio,
            "prediccion": puntual["prediccion"],
            "real": real_puntual,
            "habitual": puntual["prediccion"],
            "min": puntual["min"],
            "max": puntual["max"],
            "alerta": puntual["alerta"],
            "delta_total": 0,
            "factores": [{"nombre": f[0], "aporte": int(round(f[1]))} for f in puntual["factores"]],
            "serie": [
                {
                    "fecha": str(p["fecha"]),
                    "habitual": p["prediccion"],
                    "simulado": p["prediccion"],
                    "prediccion": p["prediccion"],
                    "real": p.get("real", obtener_llegadas_reales(p["fecha"], payload.servicio)),
                    "min": p["min"],
                    "max": p["max"],
                    "factores": [
                        {"nombre": f[0], "aporte": int(round(f[1]))} for f in p.get("factores", [])
                    ],
                    "p75": p75_val,
                    "p90": p90_val,
                }
                for p in serie
            ],
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/comparacion/{servicio}")
def endpoint_comparacion_real(
    servicio: str,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
) -> dict[str, Any]:
    """Devuelve predicho vs. real walk-forward en fechas pasadas con métricas de exactitud."""
    try:
        return obtener_comparacion_real(servicio, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/efectos-eventos/{servicio}")
def endpoint_efectos_eventos(servicio: str) -> dict[str, Any]:
    """Devuelve el efecto promedio histórico de cada evento por servicio."""
    try:
        return obtener_efectos_eventos(servicio)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/largo-plazo/{servicio}")
def endpoint_largo_plazo(
    servicio: str,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
) -> dict[str, Any]:
    """Devuelve el pronóstico de largo plazo (ago–nov 2026) y su backtest a 120 días."""
    try:
        return obtener_pronostico_largo_plazo(
            servicio, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/cuellos-botella")
def endpoint_cuellos_botella() -> dict[str, Any]:
    """Devuelve indicadores agregados de duración y saturación por etapa en urgencias."""
    try:
        return obtener_indicadores_cuellos_botella()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


try:  # Compatible con `uvicorn api:app` desde app y `app.api` desde la raíz.
    from app.api.chat import router as chat_router  # noqa: E402
except ModuleNotFoundError:
    from api.chat import router as chat_router  # noqa: E402

app.include_router(chat_router)
