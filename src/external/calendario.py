"""Features de calendario: festivos, Carnaval, Semana Santa, vacaciones
escolares, quincenas y temporadas.

No requiere internet: todo sale de la librería `holidays`, de reglas y de
`data/external/manual/vacaciones_escolares.csv`.
"""

from __future__ import annotations

import calendar
from datetime import date, timedelta

import holidays
import numpy as np
import pandas as pd
from dateutil.easter import easter

from . import config


# --------------------------------------------------------------------------- #
# Utilidades
# --------------------------------------------------------------------------- #
def _date_index(start: date, end: date) -> pd.DatetimeIndex:
    return pd.date_range(start, end, freq="D", name="fecha")


def _days_to_next(flags: pd.Series) -> pd.Series:
    """Días hasta el próximo día con flag=True (0 si hoy lo es)."""
    idx = np.where(flags.values)[0]
    out = np.full(len(flags), np.nan)
    j = 0
    for i in range(len(flags)):
        while j < len(idx) and idx[j] < i:
            j += 1
        if j < len(idx):
            out[i] = idx[j] - i
    return pd.Series(out, index=flags.index)


def _days_since_last(flags: pd.Series) -> pd.Series:
    """Días desde el último día con flag=True (0 si hoy lo es)."""
    rev = _days_to_next(flags[::-1].reset_index(drop=True))
    return pd.Series(rev.values[::-1], index=flags.index)


# --------------------------------------------------------------------------- #
# Festivos
# --------------------------------------------------------------------------- #
def columnas_festivos(
    idx: pd.DatetimeIndex, es_festivo: pd.Series, nombre: pd.Series | None = None
) -> pd.DataFrame:
    """Columnas derivadas de los festivos desde la marca `es_festivo` (bool, indexada por `idx`).

    Se separa de `festivos` para poder recalcular TODAS las columnas cuando el placebo mueve los
    festivos a otras fechas (`evaluacion_factores.placebo_festivos`) sin duplicar la regla.
    """
    es_festivo = es_festivo.astype(bool)
    if nombre is None:
        nombre = pd.Series("", index=idx)

    dow = idx.dayofweek  # 0=lunes
    no_laboral = es_festivo | (dow >= 5)

    # Puente: fin de semana largo (festivo lunes o viernes pegado al fds).
    # Marcamos todos los días del bloque no laboral de >= 3 días.
    bloque = (no_laboral != no_laboral.shift()).cumsum()
    largo_bloque = no_laboral.groupby(bloque).transform("size")
    es_puente = no_laboral & (largo_bloque >= 3)

    return pd.DataFrame(
        {
            "es_festivo": es_festivo.astype("int8"),
            "nombre_festivo": nombre,
            "es_fin_de_semana": (dow >= 5).astype("int8"),
            "es_dia_no_laboral": no_laboral.astype("int8"),
            "es_puente": es_puente.astype("int8"),
            "dia_post_festivo": (no_laboral.shift(1, fill_value=False) & ~no_laboral).astype(
                "int8"
            ),
            "dias_a_festivo": _days_to_next(es_festivo),
            "dias_desde_festivo": _days_since_last(es_festivo),
        },
        index=idx,
    )


def festivos(idx: pd.DatetimeIndex) -> pd.DataFrame:
    years = range(idx.min().year, idx.max().year + 1)
    co = holidays.Colombia(years=years)
    d = idx.date
    es_festivo = pd.Series([x in co for x in d], index=idx)
    nombre = pd.Series([co.get(x, "") for x in d], index=idx)
    return columnas_festivos(idx, es_festivo, nombre)


# --------------------------------------------------------------------------- #
# Carnaval de Barranquilla y Semana Santa (derivados de la Pascua)
# --------------------------------------------------------------------------- #
def carnaval_semana_santa(idx: pd.DatetimeIndex) -> pd.DataFrame:
    es_carnaval = pd.Series(False, index=idx)
    es_precarnaval = pd.Series(False, index=idx)
    es_semana_santa = pd.Series(False, index=idx)
    for y in range(idx.min().year, idx.max().year + 1):
        pascua = easter(y)
        miercoles_ceniza = pascua - timedelta(days=46)
        # Carnaval: sábado a martes antes del Miércoles de Ceniza.
        ini_carn = miercoles_ceniza - timedelta(days=4)
        fin_carn = miercoles_ceniza - timedelta(days=1)
        es_carnaval |= (idx.date >= ini_carn) & (idx.date <= fin_carn)
        # Precarnaval: desde la Lectura del Bando (~ 5 semanas antes) hasta el
        # viernes previo. Aproximación; eventos masivos todos los fines de semana.
        ini_pre = ini_carn - timedelta(days=35)
        es_precarnaval |= (idx.date >= ini_pre) & (idx.date < ini_carn)
        # Semana Santa: Domingo de Ramos a Domingo de Resurrección.
        ramos = pascua - timedelta(days=7)
        es_semana_santa |= (idx.date >= ramos) & (idx.date <= pascua)

    return pd.DataFrame(
        {
            "es_carnaval": es_carnaval.astype("int8"),
            "es_precarnaval": es_precarnaval.astype("int8"),
            "es_semana_santa": es_semana_santa.astype("int8"),
            "dias_a_carnaval": _days_to_next(es_carnaval),
            "dias_desde_carnaval": _days_since_last(es_carnaval),
        },
        index=idx,
    )


# --------------------------------------------------------------------------- #
# Vacaciones escolares (CSV manual)
# --------------------------------------------------------------------------- #
def vacaciones_escolares(idx: pd.DatetimeIndex) -> pd.DataFrame:
    path = config.MANUAL_DIR / "vacaciones_escolares.csv"
    vac = pd.read_csv(path, parse_dates=["inicio", "fin"], comment="#")
    flag = pd.Series(False, index=idx)
    estimado = pd.Series(False, index=idx)
    for r in vac.itertuples():
        m = (idx >= r.inicio) & (idx <= r.fin)
        flag |= m
        if r.confianza != "oficial":
            estimado |= m
    return pd.DataFrame(
        {
            "es_vacaciones_escolares": flag.astype("int8"),
            "vacaciones_es_estimado": (flag & estimado).astype("int8"),
        },
        index=idx,
    )


# --------------------------------------------------------------------------- #
# Quincenas (pago de nómina)
# --------------------------------------------------------------------------- #
def quincenas(idx: pd.DatetimeIndex, no_laboral: pd.Series) -> pd.DataFrame:
    """Día de pago = 15 y último día del mes; si cae en día no laboral se
    corre al día hábil anterior (práctica usual en Colombia)."""
    pagos = set()
    nl = set(idx[no_laboral.astype(bool).values].date)
    for y in range(idx.min().year, idx.max().year + 1):
        for m in range(1, 13):
            for d in (15, calendar.monthrange(y, m)[1]):
                p = date(y, m, d)
                while p in nl:
                    p -= timedelta(days=1)
                pagos.add(p)
    es_pago = pd.Series([x in pagos for x in idx.date], index=idx)
    desde = _days_since_last(es_pago)
    return pd.DataFrame(
        {
            "es_dia_pago": es_pago.astype("int8"),
            "dias_desde_pago": desde,
            "semana_de_pago": (desde <= 3).astype("int8"),  # 0–3 días tras el pago
            # Prima de servicios: a más tardar 30 jun y 20 dic.
            "es_mes_prima": idx.month.isin([6, 12]).astype("int8"),
        },
        index=idx,
    )


# --------------------------------------------------------------------------- #
# Básicos y temporadas
# --------------------------------------------------------------------------- #
def basicos(idx: pd.DatetimeIndex) -> pd.DataFrame:
    doy = idx.dayofyear
    return pd.DataFrame(
        {
            "anio": idx.year.astype("int16"),
            "mes": idx.month.astype("int8"),
            "dia_mes": idx.day.astype("int8"),
            "dia_semana": idx.dayofweek.astype("int8"),  # 0=lunes
            "semana_iso": idx.isocalendar().week.astype("int8").values,
            "dia_anio": doy.astype("int16"),
            # Codificación cíclica (útil para modelos lineales / Poisson).
            "sin_dia_anio": np.sin(2 * np.pi * doy / 365.25),
            "cos_dia_anio": np.cos(2 * np.pi * doy / 365.25),
            "sin_dia_semana": np.sin(2 * np.pi * idx.dayofweek / 7),
            "cos_dia_semana": np.cos(2 * np.pi * idx.dayofweek / 7),
            # Temporadas de lluvia en el Caribe colombiano (climatología IDEAM):
            # primera abr–jun, segunda (más fuerte) sep–nov.
            "temporada_lluvias": idx.month.isin([4, 5, 6, 9, 10, 11]).astype("int8"),
            "temporada_navidad": (
                ((idx.month == 12) & (idx.day >= 7)) | ((idx.month == 1) & (idx.day <= 6))
            ).astype("int8"),
        },
        index=idx,
    )


def fase_covid(idx: pd.DatetimeIndex) -> pd.DataFrame:
    """Fases de la pandemia en Colombia (cambio estructural en la demanda).
    0 = pre (antes del 2020-03-25), 1 = aislamiento obligatorio
    (2020-03-25 a 2020-08-31), 2 = aislamiento selectivo / emergencia sanitaria
    (2020-09-01 a 2022-06-30), 3 = post."""
    f = np.zeros(len(idx), dtype="int8")
    f[idx >= "2020-03-25"] = 1
    f[idx >= "2020-09-01"] = 2
    f[idx >= "2022-07-01"] = 3
    return pd.DataFrame({"fase_covid": f}, index=idx)


def build_calendario(start: date = config.START_DATE, end: date = config.END_DATE) -> pd.DataFrame:
    idx = _date_index(start, end)
    fest = festivos(idx)
    return pd.concat(
        [
            basicos(idx),
            fest,
            carnaval_semana_santa(idx),
            vacaciones_escolares(idx),
            quincenas(idx, fest["es_dia_no_laboral"]),
            fase_covid(idx),
        ],
        axis=1,
    )
