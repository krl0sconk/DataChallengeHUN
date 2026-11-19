"""Pruebas de las ventanas mensuales y la caché de `hun.data.extraer` (sin base de datos)."""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from hun.data import extraer


def _rangos(desde, hasta):
    return [(f"{i:%Y-%m-%d}", f"{f:%Y-%m-%d}") for i, f in extraer._meses(desde, hasta)]


def test_meses_sin_ventana_vacia_al_final():
    rangos = _rangos(date(2024, 11, 1), date(2025, 1, 1))
    assert rangos == [("2024-11-01", "2024-12-01"), ("2024-12-01", "2025-01-01")]


def test_meses_con_bordes_parciales():
    rangos = _rangos(date(2023, 1, 10), date(2023, 3, 15))
    assert rangos == [
        ("2023-01-10", "2023-02-01"),
        ("2023-02-01", "2023-03-01"),
        ("2023-03-01", "2023-03-15"),
    ]


def test_meses_rango_vacio():
    assert _rangos(date(2023, 1, 1), date(2023, 1, 1)) == []


def test_es_mes_completo():
    t = pd.Timestamp
    assert extraer._es_mes_completo(t("2023-02-01"), t("2023-03-01"))
    assert not extraer._es_mes_completo(t("2023-03-01"), t("2023-03-15"))
    assert not extraer._es_mes_completo(t("2023-01-10"), t("2023-02-01"))


@pytest.fixture
def entorno(tmp_path, monkeypatch):
    """RAW_DIR temporal y una base falsa que devuelve una fila por día de la ventana."""
    monkeypatch.setattr(extraer.config, "RAW_DIR", tmp_path)
    monkeypatch.setattr(extraer, "leer_sql", lambda _: "SELECT 1")
    llamadas = []

    def consultar(_sql, params):
        llamadas.append((params["desde"], params["hasta"]))
        dias = pd.date_range(params["desde"], params["hasta"], freq="D", inclusive="left")
        return pd.DataFrame({"fecha": dias, "n": 1})

    monkeypatch.setattr(extraer, "consultar", consultar)
    return tmp_path, llamadas


def test_mes_parcial_no_queda_en_cache(entorno):
    raw, llamadas = entorno
    nombre = "llegadas_diarias_perfil"  # una extracción por ventana

    df = extraer.ejecutar(nombre, date(2023, 2, 1), date(2023, 3, 15))
    assert len(df) == 28 + 14
    partes = {p.name for p in (raw / f"{nombre}_partes").glob("*.parquet")}
    assert partes == {"2023-02.parquet"}  # marzo a medias no se guarda

    # Con el mes completo, marzo se vuelve a consultar entero y febrero sale de la caché.
    llamadas.clear()
    df = extraer.ejecutar(nombre, date(2023, 2, 1), date(2023, 4, 1))
    assert len(df) == 28 + 31
    assert [f"{d:%Y-%m-%d}" for d, _ in llamadas] == ["2023-03-01"]


def test_archivo_final_solo_tiene_el_rango_pedido(entorno):
    raw, _ = entorno
    nombre = "llegadas_diarias_perfil"
    extraer.ejecutar(nombre, date(2023, 1, 1), date(2023, 4, 1))
    df = extraer.ejecutar(nombre, date(2023, 2, 1), date(2023, 3, 1))
    assert pd.to_datetime(df["fecha"]).dt.month.unique().tolist() == [2]
    assert len(pd.read_parquet(raw / f"{nombre}.parquet")) == 28


@pytest.mark.parametrize(
    "archivo",
    [
        "04_entradas_por_hora.sql",
        "11_auditoria_llegadas_diarias.sql",
        "13_llegadas_diarias_perfil.sql",
    ],
)
def test_consultas_de_llegadas_cuentan_visitas_unicas(archivo):
    """Las copias de visit_occurrence (mismo paciente, servicio e inicio) no deben sobrecontarse."""
    sql = " ".join(extraer.leer_sql(archivo).lower().split())
    assert "count(*)" not in sql.replace("count(*) filter", "")
    assert "count(distinct" in sql
    for columna in ("person_id", "visit_concept_id", "visit_start_datetime"):
        assert columna in sql.split("count(distinct", 1)[1].split("from", 1)[0]


def test_consultas_etapas_recortan_extremos_sobre_p999():
    """Las consultas de censo y percentiles de etapas deben acotar outliers por encima de p99.9."""
    sql_pct = extraer.leer_sql("23_duracion_etapas_percentiles.sql").lower()
    assert "0.999" in sql_pct and "horas_p999" in sql_pct

    for archivo in (
        "14_etapas_entradas_por_hora.sql",
        "15_etapas_salidas_por_hora.sql",
        "16_duracion_etapas_diaria.sql",
    ):
        sql = extraer.leer_sql(archivo).lower()
        assert "0.999" in sql, f"{archivo} debe recortar duraciones extremas sobre p99.9"
