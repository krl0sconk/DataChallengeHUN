"""Pruebas del pipeline de datos externos (sin internet: usan datos simulados).

pytest tests/test_external.py -q
"""

from datetime import date

import numpy as np
import pandas as pd

from src.external import calendario, clima, epidemiologia


def _cal():
    return calendario.build_calendario(date(2024, 1, 1), date(2026, 12, 31)).loc[:, :]


def test_una_fila_por_fecha():
    c = _cal()
    assert c.index.is_unique and c.index.is_monotonic_increasing
    assert len(c) == (date(2026, 12, 31) - date(2024, 1, 1)).days + 1


def test_festivos_y_carnaval_conocidos():
    c = _cal()
    assert c.loc["2026-07-13", "es_festivo"] == 1  # Virgen de Chiquinquirá (Ley 2025)
    assert c.loc["2025-12-25", "es_festivo"] == 1
    # Carnaval 2025: 1–4 de marzo; 2026: 14–17 de febrero
    assert c.loc["2025-03-01":"2025-03-04", "es_carnaval"].eq(1).all()
    assert c.loc["2026-02-14":"2026-02-17", "es_carnaval"].eq(1).all()
    assert c.loc["2026-02-18", "es_carnaval"] == 0
    # Semana Santa 2026: 29 mar – 5 abr
    assert c.loc["2026-03-29":"2026-04-05", "es_semana_santa"].eq(1).all()


def test_quincena_se_corre_a_habil_anterior():
    c = _cal()
    # 15 feb 2026 es domingo -> pago viernes 13
    assert c.loc["2026-02-13", "es_dia_pago"] == 1
    assert c.loc["2026-02-15", "es_dia_pago"] == 0
    # 2 pagos por mes
    assert (c["es_dia_pago"].groupby([c.index.year, c.index.month]).sum() == 2).all()


def test_vacaciones_oficiales():
    c = _cal()
    assert c.loc["2026-06-22":"2026-07-12", "es_vacaciones_escolares"].eq(1).all()
    assert c.loc["2026-07-13", "es_vacaciones_escolares"] == 0
    assert c.loc["2025-06-30", "vacaciones_es_estimado"] == 0


def test_clima_parse_y_features():
    fechas = pd.date_range("2024-01-01", periods=40).strftime("%Y-%m-%d").tolist()
    rng = np.random.default_rng(0)
    payload = {
        "daily": {
            "time": fechas,
            **{
                v: rng.uniform(0, 35, 40).tolist()
                for v in [
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
            },
        }
    }
    df = clima.features_clima(clima.parse_daily(payload))
    assert len(df) == 40 and df.index.name == "fecha"
    assert np.isclose(df["clima_lluvia_3d"].iloc[5], df["clima_precipitation_sum"].iloc[3:6].sum())


def test_semana_epi():
    # Semana epi 1 de 2026 empieza el domingo 4 ene 2026; de 2025, el 29 dic 2024.
    assert epidemiologia.inicio_semana_epi(2026, 1) == date(2026, 1, 4)
    assert epidemiologia.inicio_semana_epi(2025, 1) == date(2024, 12, 29)
    assert epidemiologia.fecha_a_semana_epi(date(2026, 1, 3)) == (2025, 53)


def test_epi_rezago_sin_fuga():
    micro = pd.DataFrame(
        {
            "ano": ["2024"] * 6,
            "semana": ["10", "10", "10", "11", "11", "12"],
            "cod_dpto_r": ["8", "8", "13", "8", "8", "8"],
            "cod_mun_r": ["1", "758", "1", "1", "433", "1"],
        }
    )
    sem = epidemiologia.conteo_semanal(micro)
    assert sem["area_metro"].tolist() == [2, 2, 1] and sem["atlantico"].tolist() == [2, 2, 1]
    idx = pd.date_range("2024-03-01", "2024-04-15", name="fecha")
    d = epidemiologia.semanal_a_diario(sem, "dengue", idx)
    s10 = pd.Timestamp(epidemiologia.inicio_semana_epi(2024, 10))
    # Durante la semana 12 (2 semanas después), lag2 muestra la semana 10.
    dia_s12 = s10 + pd.Timedelta(weeks=2, days=3)
    assert d.loc[dia_s12, "epi_dengue_area_metro_lag2s"] == 2
    # En la propia semana 10 el lag2 no puede ver la semana 10.
    assert pd.isna(d.loc[s10 + pd.Timedelta(days=1), "epi_dengue_area_metro_lag2s"])
