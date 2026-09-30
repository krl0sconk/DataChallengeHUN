"""Series epidemiológicas semanales (dengue, IRAG) desde microdatos SIVIGILA.

Fuente: portal SIVIGILA del Instituto Nacional de Salud (INS), lista
SharePoint "Microdatos" (misma API que usa el paquete R `sivirep`).

Pasos:
1. Listar los archivos de microdatos disponibles (evento x año).
2. Descargar los de los eventos configurados (xlsx) a data/external/raw/.
3. Filtrar municipio de residencia/ocurrencia en el área de influencia del HUN.
4. Contar casos por semana epidemiológica y pasar a diario.
5. Aplicar rezagos de 2 y 3 semanas (la notificación se consolida con retraso;
   sin rezago habría fuga de información).

Limitaciones conocidas:
- El INS publica microdatos de años cerrados (el año en curso y a veces el
  anterior no están). Para el periodo reciente las columnas quedan NaN; el
  modelo (LightGBM) maneja NaN, y para producción se puede alimentar desde el
  Boletín Epidemiológico Semanal (BES) o el tablero del INS.
- La IRA de notificación colectiva (evento 995) normalmente no está como
  microdato individual.
"""

from __future__ import annotations

import io
import re
from datetime import date, timedelta

import numpy as np
import pandas as pd
import requests

from . import config

HEADERS = {"Accept": "application/json;odata=nometadata"}


# --------------------------------------------------------------------------- #
# Semanas epidemiológicas (domingo–sábado; semana 1 = la que contiene >= 4
# días del año nuevo, igual que MMWR, que es la convención del INS).
# --------------------------------------------------------------------------- #
def inicio_semana_epi(anio: int, semana: int) -> date:
    ene4 = date(anio, 1, 4)
    # domingo en o antes del 4 de enero
    inicio_s1 = ene4 - timedelta(days=(ene4.weekday() + 1) % 7)
    return inicio_s1 + timedelta(weeks=int(semana) - 1)


def fecha_a_semana_epi(d: date) -> tuple[int, int]:
    for y in (d.year + 1, d.year, d.year - 1):
        s1 = inicio_semana_epi(y, 1)
        if d >= s1:
            return y, (d - s1).days // 7 + 1
    raise ValueError(d)


# --------------------------------------------------------------------------- #
# Descarga
# --------------------------------------------------------------------------- #
def listar_microdatos(session: requests.Session | None = None) -> pd.DataFrame:
    s = session or requests.Session()
    r = s.get(config.SIVIGILA_LIST_URL, headers=HEADERS, timeout=60)
    r.raise_for_status()
    items = r.json().get("value", r.json().get("d", {}).get("results", []))
    df = pd.DataFrame(items).rename(columns={"A_x00f1_o": "anio"})
    df["anio"] = pd.to_numeric(df["anio"], errors="coerce")
    df["CodigoEvento"] = pd.to_numeric(df["CodigoEvento"], errors="coerce")
    return df


def _descargar_archivo(file_ref: str, session: requests.Session) -> bytes:
    url = config.SIVIGILA_FILE_URL.format(path=file_ref)
    r = session.get(url, timeout=300)
    r.raise_for_status()
    return r.content


def descargar_eventos(refresh: bool = False) -> dict[str, pd.DataFrame]:
    """Devuelve {grupo: DataFrame de microdatos concatenados} con caché en raw/."""
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    out: dict[str, list[pd.DataFrame]] = {g: [] for g in config.SIVIGILA_EVENTS}
    with requests.Session() as s:
        lista = listar_microdatos(s)
        for grupo, codigos in config.SIVIGILA_EVENTS.items():
            sel = lista[
                lista["CodigoEvento"].isin(codigos) & (lista["anio"] >= config.START_DATE.year)
            ]
            for row in sel.itertuples():
                nombre = re.sub(r"[^\w.-]", "_", str(row.FileRef).split("/")[-1])
                cache = (
                    config.RAW_DIR / f"sivigila_{int(row.CodigoEvento)}_{int(row.anio)}_{nombre}"
                )
                if refresh or not cache.exists():
                    cache.write_bytes(_descargar_archivo(row.FileRef, s))
                out[grupo].append(leer_microdato(cache.read_bytes(), cache.name))
    return {g: pd.concat(v, ignore_index=True) if v else pd.DataFrame() for g, v in out.items()}


def leer_microdato(contenido: bytes, nombre: str = "") -> pd.DataFrame:
    if nombre.lower().endswith((".csv", ".txt")):
        df = pd.read_csv(io.BytesIO(contenido), sep=None, engine="python", dtype=str)
    else:
        df = pd.read_excel(io.BytesIO(contenido), dtype=str)
    df.columns = [c.strip().lower() for c in df.columns]
    return df


# --------------------------------------------------------------------------- #
# Procesamiento
# --------------------------------------------------------------------------- #
def _codigo_municipio(df: pd.DataFrame, tipo: str) -> pd.Series:
    """Código DANE de 5 dígitos. tipo = 'r' (residencia) u 'o' (ocurrencia)."""
    dpto = df.get(f"cod_dpto_{tipo}")
    mun = df.get(f"cod_mun_{tipo}")
    if dpto is None or mun is None:
        return pd.Series(pd.NA, index=df.index)
    dpto = dpto.astype(str).str.extract(r"(\d+)")[0].str.zfill(2)
    mun = mun.astype(str).str.extract(r"(\d+)")[0].str.zfill(3).str[-3:]
    return dpto + mun


def conteo_semanal(micro: pd.DataFrame) -> pd.DataFrame:
    """Casos por semana epi (notificación) para área metropolitana y Atlántico."""
    if micro.empty:
        return pd.DataFrame(columns=["inicio_semana", "area_metro", "atlantico"])
    m = micro.copy()
    # Preferimos residencia (demanda potencial del hospital); si no, ocurrencia.
    mun = _codigo_municipio(m, "r").fillna(_codigo_municipio(m, "o"))
    m["mun"] = mun
    m["anio"] = pd.to_numeric(m.get("ano", m.get("año")), errors="coerce")
    m["semana"] = pd.to_numeric(m.get("semana"), errors="coerce")
    m = m.dropna(subset=["anio", "semana"])
    m["inicio_semana"] = [
        pd.Timestamp(inicio_semana_epi(int(a), int(s)))
        for a, s in zip(m["anio"], m["semana"], strict=True)
    ]
    m["area_metro"] = m["mun"].isin(config.MUNICIPIOS.keys()).astype(int)
    m["atlantico"] = m["mun"].str[:2].eq(config.DPTO_ATLANTICO).astype(int)
    return m.groupby("inicio_semana")[["area_metro", "atlantico"]].sum().reset_index()


def semanal_a_diario(semanal: pd.DataFrame, grupo: str, idx: pd.DatetimeIndex) -> pd.DataFrame:
    """Asigna a cada día el conteo de su semana epi y crea rezagos.

    Columna <grupo>_<zona>_lag{k}s = casos de la semana epi que empezó k
    semanas antes de la semana del día. Solo se exportan las rezagadas.
    """
    out = pd.DataFrame(index=idx)
    if semanal.empty:
        for z in ("area_metro", "atlantico"):
            for k in config.EPI_LAGS_WEEKS:
                out[f"epi_{grupo}_{z}_lag{k}s"] = np.nan
        return out
    semanal = semanal.set_index("inicio_semana").sort_index()
    semanas = pd.date_range(semanal.index.min(), semanal.index.max(), freq="W-SUN")
    semanal = semanal.reindex(semanas)  # semanas sin casos quedan NaN -> 0 abajo
    semanal = semanal.fillna(0)
    # inicio de semana epi (domingo) de cada día
    dom = idx - pd.to_timedelta((idx.dayofweek + 1) % 7, unit="D")
    for z in ("area_metro", "atlantico"):
        for k in config.EPI_LAGS_WEEKS:
            serie = semanal[z].shift(k)  # valor de hace k semanas
            out[f"epi_{grupo}_{z}_lag{k}s"] = serie.reindex(dom).values
    # Fuera del rango publicado -> NaN (no 0): no inventar ausencia de casos.
    return out


def build_epidemiologia(idx: pd.DatetimeIndex, refresh: bool = False) -> pd.DataFrame:
    micro = descargar_eventos(refresh=refresh)
    partes = [semanal_a_diario(conteo_semanal(df), g, idx) for g, df in micro.items()]
    return pd.concat(partes, axis=1)
