"""Configuración del proyecto: rutas y parámetros leídos desde `.env`.

Las rutas relativas del `.env` se resuelven respecto a la raíz del repositorio,
así funcionan igual desde notebooks, scripts o tests.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]

load_dotenv(ROOT_DIR / ".env")


def _path_from_env(var: str, default: str) -> Path:
    path = Path(os.getenv(var, default)).expanduser()
    return path if path.is_absolute() else ROOT_DIR / path


DATA_DIR = _path_from_env("HUN_DATA_DIR", "data")
RAW_DIR = _path_from_env("HUN_RAW_DIR", "data/raw")
EXTERNAL_DIR = _path_from_env("HUN_EXTERNAL_DIR", "data/external")
INTERIM_DIR = _path_from_env("HUN_INTERIM_DIR", "data/interim")
PROCESSED_DIR = _path_from_env("HUN_PROCESSED_DIR", "data/processed")
MODELS_DIR = _path_from_env("HUN_MODELS_DIR", "models")
FIGURES_DIR = _path_from_env("HUN_FIGURES_DIR", "reports/figures")

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
LATITUDE = float(os.getenv("HUN_LATITUDE", "11.0190"))
LONGITUDE = float(os.getenv("HUN_LONGITUDE", "-74.8511"))
TIMEZONE = os.getenv("HUN_TIMEZONE", "America/Bogota")
RANDOM_SEED = int(os.getenv("HUN_RANDOM_SEED", "42"))
