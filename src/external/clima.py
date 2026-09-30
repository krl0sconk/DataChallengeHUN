"""Clima diario del área metropolitana de Barranquilla desde Open-Meteo.

- Histórico: Historical Weather API (reanálisis ERA5 / ERA5-Land), gratis, sin
  API key. Tiene ~5 días de retraso respecto a hoy.
- Pronóstico: Forecast API (hasta 16 días). Úsalo en PRODUCCIÓN para las
  features de clima del horizonte t+1..t+7; nunca entrenes con clima
  observado y predigas con clima observado del futuro (fuga).

Las descargas se cachean en data/external/raw/clima_<anio>.json por año
para no re-descargar.
"""

from __future__ import annotations

import json
import time
from datetime import date, timedelta

import pandas as pd
import requests

from . import config

PREFIX = "clima_"


def _fetch_archive(start: date, end: date, session: requests.Session | None = None) -> dict:
    s = session or requests.Session()
    params = {
        "latitude": config.LATITUDE,
        "longitude": config.LONGITUDE,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": ",".join(config.WEATHER_DAILY_VARS),
        "timezone": config.TIMEZONE,
    }
    for intento in range(4):
        r = s.get(config.OPEN_METEO_ARCHIVE_URL, params=params, timeout=60)
        if r.status_code == 429:  # rate limit
            time.sleep(10 * (intento + 1))
            continue
        r.raise_for_status()
        return r.json()
    r.raise_for_status()
    return {}


def parse_daily(payload: dict) -> pd.DataFrame:
    daily = payload["daily"]
    df = pd.DataFrame(daily)
    df["fecha"] = pd.to_datetime(df.pop("time"))
    df = df.set_index("fecha").sort_index()
    return df.rename(columns={c: PREFIX + c for c in df.columns})


def descargar_clima(
    start: date = config.START_DATE, end: date | None = None, refresh: bool = False
) -> pd.DataFrame:
    """Descarga (o lee de caché) el clima diario año por año."""
    # El archivo tiene ~5 días de retraso: no pedir más allá.
    limite = date.today() - timedelta(days=6)
    end = min(end or limite, limite)
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    partes = []
    with requests.Session() as s:
        for y in range(start.year, end.year + 1):
            a, b = max(start, date(y, 1, 1)), min(end, date(y, 12, 31))
            cache = config.RAW_DIR / f"clima_{y}.json"
            año_cerrado = b == date(y, 12, 31)
            if cache.exists() and año_cerrado and not refresh:
                payload = json.loads(cache.read_text())
            else:
                payload = _fetch_archive(a, b, s)
                cache.write_text(json.dumps(payload))
            partes.append(parse_daily(payload))
    return pd.concat(partes).loc[pd.Timestamp(start) : pd.Timestamp(end)]


def features_clima(df: pd.DataFrame) -> pd.DataFrame:
    """Features derivadas: acumulados y anomalías respecto a la climatología."""
    out = df.copy()
    p = PREFIX
    out[p + "lluvia_3d"] = df[p + "precipitation_sum"].rolling(3, min_periods=1).sum()
    out[p + "lluvia_7d"] = df[p + "precipitation_sum"].rolling(7, min_periods=1).sum()
    out[p + "lluvia_30d"] = df[p + "precipitation_sum"].rolling(30, min_periods=1).sum()
    out[p + "dia_lluvioso"] = (df[p + "precipitation_sum"] >= 1.0).astype("int8")
    out[p + "lluvia_fuerte"] = (df[p + "precipitation_sum"] >= 20.0).astype("int8")
    out[p + "tmax_7d"] = df[p + "temperature_2m_max"].rolling(7, min_periods=1).mean()
    # Ola de calor: sensación térmica máx en el percentil 90 del mes.
    at = df[p + "apparent_temperature_max"]
    p90 = at.groupby(at.index.month).transform(lambda s: s.quantile(0.9))
    out[p + "calor_extremo"] = (at >= p90).astype("int8")
    # Anomalía de temperatura vs media del mismo mes (climatología del periodo).
    t = df[p + "temperature_2m_mean"]
    out[p + "anomalia_temp"] = t - t.groupby(t.index.month).transform("mean")
    return out


def pronostico(dias: int = 7) -> pd.DataFrame:
    """Pronóstico para producción (mismas variables, mismo prefijo)."""
    params = {
        "latitude": config.LATITUDE,
        "longitude": config.LONGITUDE,
        "daily": ",".join(config.WEATHER_DAILY_VARS),
        "timezone": config.TIMEZONE,
        "forecast_days": dias,
    }
    r = requests.get(config.OPEN_METEO_FORECAST_URL, params=params, timeout=60)
    r.raise_for_status()
    return parse_daily(r.json())
