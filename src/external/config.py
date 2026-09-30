"""Configuración central de los datos externos (Data Challenge HUN 2026).

Todo lo que se pueda querer cambiar (rango de fechas, coordenadas, eventos
epidemiológicos, rezagos) vive aquí para no tocar la lógica.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

# --- Rutas -------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
EXT_DIR = DATA_DIR / "external"
RAW_DIR = EXT_DIR / "raw"  # descargas crudas / caché (no se versiona)
MANUAL_DIR = EXT_DIR / "manual"  # CSV curados a mano (sí se versionan)
OUTPUT_PARQUET = DATA_DIR / "externos.parquet"
OUTPUT_DICT = DATA_DIR / "externos_diccionario.csv"

# --- Rango temporal ----------------------------------------------------------
# Cubre histórico amplio + año siguiente para poder generar features de
# calendario en el horizonte de predicción. Se recorta al rango del dataset
# del hospital cuando llegue.
START_DATE = date(2018, 1, 1)
END_DATE = date(2027, 12, 31)

# --- Ubicación ---------------------------------------------------------------
# Hospital Universidad del Norte: Soledad (Atlántico), área metropolitana de
# Barranquilla, cerca del aeropuerto. ERA5 tiene resolución ~0.25°, así que
# cualquier punto del área metropolitana cae en la misma celda o la vecina.
LATITUDE = 10.93
LONGITUDE = -74.80
TIMEZONE = "America/Bogota"

# --- Clima (Open-Meteo Historical Weather API) -------------------------------
OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_DAILY_VARS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "apparent_temperature_max",
    "precipitation_sum",
    "precipitation_hours",
    "relative_humidity_2m_mean",
    "wind_speed_10m_max",
    "shortwave_radiation_sum",
]

# --- Epidemiología (SIVIGILA microdatos, INS) --------------------------------
# API SharePoint del portal SIVIGILA (misma que usa el paquete R `sivirep`
# de epiverse-trace).
SIVIGILA_API = "https://portalsivigila.ins.gov.co/_api/"
SIVIGILA_LIST_URL = (
    SIVIGILA_API + "web/lists/GetByTitle('Microdatos')/items?$select=CodigoEvento,A_x00f1_o,"
    "NombreEvento,FileRef&$orderby=NombreEvento%20asc&$top=5000"
)
SIVIGILA_FILE_URL = (
    SIVIGILA_API + "Web/GetFileByServerRelativeUrl('{path}')/$value?binaryStringResponseBody=true"
)

# Códigos de evento SIVIGILA -> nombre corto de columna.
#  210 dengue, 220 dengue grave, 580 mortalidad por dengue
#  348 IRAG inusitado, 345 ESI-IRAG (vigilancia centinela)
# OJO: la morbilidad por IRA (995) es de notificación COLECTIVA y normalmente
# no está en microdatos individuales; si no aparece, queda solo IRAG.
SIVIGILA_EVENTS = {
    "dengue": [210, 220, 580],
    "irag": [345, 348],
}

# Municipios de influencia del HUN (códigos DANE, 5 dígitos).
MUNICIPIOS = {
    "08001": "Barranquilla",
    "08758": "Soledad",
    "08433": "Malambo",
    "08573": "Puerto Colombia",
    "08296": "Galapa",
}
DPTO_ATLANTICO = "08"

# Rezagos (en semanas) aplicados a las series epidemiológicas para evitar
# fuga de información: el dato de la semana t se publica con retraso.
EPI_LAGS_WEEKS = [2, 3]

# --- Quincenas ---------------------------------------------------------------
PAYDAYS = (15, "last")  # día 15 y último día del mes
