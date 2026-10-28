"""Servidor de API FastAPI para la aplicación web asistencial del HUN.

Expone el contrato canónico de predicción definido en src/hun/models/predict.py
para su consumo desacoplado desde la interfaz React (Vite).
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

# Asegurar resolución del paquete `hun` al ejecutar desde cualquier directorio
ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from hun.models.predict import PARAMETROS_SERVICIO, SERVICIOS_CANONICOS, predecir, predecir_rango

app = FastAPI(
    title="Hospital Universidad del Norte - API de Pronóstico",
    description="Capa de servicio HTTP para estimación de afluencia asistencial (Data Challenge 2026)",
    version="1.0.0",
)

# Permitir solicitudes locales desde el frontend de desarrollo (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PrediccionRequest(BaseModel):
    fecha: date = Field(..., description="Fecha objetivo de predicción (YYYY-MM-DD)")
    servicio: str = Field(..., description="Nombre o concept_id del servicio (urgencias, 9203, etc.)")


class RangoRequest(BaseModel):
    fecha_inicio: date = Field(..., description="Fecha de inicio (YYYY-MM-DD)")
    dias: int = Field(default=7, ge=1, le=30, description="Horizonte de días a predecir")
    servicio: str = Field(..., description="Nombre o concept_id del servicio")


@app.get("/api/health")
def health() -> dict[str, str]:
    """Chequeo de estado del servicio."""
    return {"status": "ok", "hospital": "HUN", "version": "1.0.0"}


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
    """Calcula la comparativa de ocupación y presión hospitalaria usando los parámetros canónicos."""
    nombres_visibles = {
        "urgencias": ("Urgencias", "Urgencias", "OMOP 9203"),
        "rehabilitacion": ("Rehabilitación Ambulatoria", "Rehabilitación", "OMOP 581479"),
        "tratamiento_urgencia": ("Tratamiento Urgencias", "Tratamiento Urg.", "OMOP 3045729"),
    }

    resultado = []
    for sid, (nombre_completo, nombre_corto, codigo) in nombres_visibles.items():
        params = PARAMETROS_SERVICIO[sid]
        media = params["media_diaria"]
        p75 = params["umbral_p75"]
        p90 = params["umbral_p90"]

        ocupacion_pct = int(round((media / p90) * 100))
        alerta_pct = int(round((p75 / p90) * 100))
        estado = "rojo" if media > p90 else ("amarillo" if media >= p75 else "verde")

        resultado.append({
            "id": sid,
            "nombreCompleto": nombre_completo,
            "nombreCorto": nombre_corto,
            "codigo": codigo,
            "mediaDiaria": media,
            "p75": p75,
            "p90": p90,
            "ocupacion": ocupacion_pct,
            "alertaPct": alerta_pct,
            "estado": estado,
        })

    return resultado


@app.post("/api/predecir")
def endpoint_predecir(payload: PrediccionRequest) -> dict[str, Any]:
    """Genera la predicción puntual para una fecha y servicio aplicando el contrato."""
    try:
        return predecir(payload.fecha, payload.servicio)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/predecir-rango")
def endpoint_predecir_rango(payload: RangoRequest) -> dict[str, Any]:
    """Genera el pronóstico diario y la serie consecutiva para el horizonte pedido."""
    try:
        fecha_fin = payload.fecha_inicio + timedelta(days=payload.dias - 1)
        serie = predecir_rango(payload.fecha_inicio, fecha_fin, payload.servicio)
        puntual = predecir(payload.fecha_inicio, payload.servicio)
        return {
            "fecha": str(payload.fecha_inicio),
            "servicio": payload.servicio,
            "prediccion": puntual["prediccion"],
            "habitual": puntual["prediccion"],
            "min": puntual["min"],
            "max": puntual["max"],
            "alerta": puntual["alerta"],
            "delta_total": 0,
            "factores": [
                {"nombre": f[0], "aporte": int(round(f[1]))} for f in puntual["factores"]
            ],
            "serie": [
                {
                    "fecha": str(p["fecha"]),
                    "habitual": p["prediccion"],
                    "simulado": p["prediccion"],
                    "prediccion": p["prediccion"],
                    "min": p["min"],
                    "max": p["max"],
                    "factores": [
                        {"nombre": f[0], "aporte": int(round(f[1]))} for f in p.get("factores", [])
                    ],
                    "p75": PARAMETROS_SERVICIO.get(payload.servicio.lower(), PARAMETROS_SERVICIO["urgencias"])["umbral_p75"],
                    "p90": PARAMETROS_SERVICIO.get(payload.servicio.lower(), PARAMETROS_SERVICIO["urgencias"])["umbral_p90"],
                }
                for p in serie
            ],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
