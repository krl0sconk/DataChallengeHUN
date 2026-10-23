"""Pruebas de la auditoría de calidad con datos SIMULADOS (sin VPN ni datos del hospital).

python -m pytest tests/test_auditoria.py -q
"""

import numpy as np
import pandas as pd
import pytest

from hun.data import auditoria as au
from hun.data.conexion import leer_sql, validar_solo_lectura
from hun.data.extraer import EXTRACCIONES, GRUPOS


def _rehabilitacion(desfase=0, semilla=0):
    """Servicio programado: abre lunes a sábado y cierra en festivos (corridos `desfase` días)."""
    rng = np.random.default_rng(semilla)
    idx = pd.date_range("2023-01-01", "2025-12-31", freq="D")
    tasa = np.where(idx.day_of_week < 5, 800.0, np.where(idx.day_of_week == 5, 300.0, 0.5))
    festivos = au.festivos_entre_semana(idx.min(), idx.max()) + pd.Timedelta(days=desfase)
    tasa = np.where(idx.isin(festivos), 40.0, tasa)
    return pd.Series(rng.poisson(tasa).astype(float), index=idx), festivos


@pytest.mark.parametrize("desfase", [0, 7, -14, 3])
def test_prueba_desplazamiento_encuentra_el_corrimiento(desfase):
    diario, _ = _rehabilitacion(desfase)
    reales = au.festivos_entre_semana(diario.index.min(), diario.index.max())
    prueba = au.prueba_desplazamiento(diario, reales)
    v = au.veredicto_desplazamiento(prueba)
    assert v["desfase_estimado"] == desfase
    assert v["fechas_reales"] is (desfase == 0)


def test_sin_efecto_festivo_no_declara_fechas_reales():
    rng = np.random.default_rng(1)
    idx = pd.date_range("2023-01-01", "2025-12-31", freq="D")
    diario = pd.Series(rng.poisson(400, len(idx)).astype(float), index=idx)
    prueba = au.prueba_desplazamiento(diario, au.festivos_entre_semana(idx.min(), idx.max()))
    v = au.veredicto_desplazamiento(prueba)
    assert v["efecto_claro"] is False and v["fechas_reales"] is None


def test_relativo_semanas_vecinas_es_uno_en_dia_normal():
    diario, _ = _rehabilitacion()
    rel = au.relativo_semanas_vecinas(diario)
    martes_normal = rel[(rel.index.day_of_week == 1) & rel.notna()]
    assert martes_normal.median() == pytest.approx(1.0, abs=0.05)


def test_festivos_y_carnaval_caen_donde_deben():
    f = au.festivos_entre_semana("2024-01-01", "2024-12-31")
    assert pd.Timestamp("2024-12-25") in f  # miércoles
    assert pd.Timestamp("2024-07-20") not in f  # sábado
    c = au.dias_carnaval("2024-01-01", "2024-12-31")
    assert list(c.strftime("%m-%d")) == ["02-10", "02-11", "02-12", "02-13"]


def test_perfil_evento_marca_el_hueco():
    diario, festivos = _rehabilitacion()
    perfil = au.perfil_evento(diario, festivos, antes=3, despues=3)
    assert perfil.set_index("dia").loc[0, "relativo_medio"] < 0.2
    assert perfil.set_index("dia").loc[2, "relativo_medio"] > 0.8


def test_resumenes_calculan_porcentajes_y_alertas():
    nulos = pd.DataFrame(
        {"tabla": ["t", "t"], "columna": ["a", "b"], "filas": [1000, 1000], "nulos": [0, 50]}
    )
    r = au.resumen_nulos(nulos)
    assert r.loc[0, "columna"] == "b" and r.loc[0, "pct_nulos"] == pytest.approx(5.0)
    assert r["alerta"].tolist() == [True, False]

    dup = pd.DataFrame(
        {"tabla": ["t"], "chequeo": ["ids_repetidos"], "grupos": [2], "copias_sobrantes": [3]}
    )
    assert au.resumen_duplicados(dup, {"t": 300})["pct_sobrante"].iloc[0] == pytest.approx(1.0)

    fila = {c: 0 for c in au.COLUMNAS_TRAMOS + au.PROBLEMAS_ETAPAS}
    fila.update(visit_detail_concept_id=1, visit_concept_id=2, etapas=100, sin_fin=5, de_1_a_6_h=95)
    e = au.resumen_etapas(pd.DataFrame([fila]))
    assert e.loc[0, "pct_sin_fin"] == pytest.approx(5.0)
    assert e.loc[0, "alertas"] == "sin_fin"
    largo = au.tramos_largos(pd.DataFrame([fila]))
    assert largo["pct"].sum() == pytest.approx(100.0)


def test_serie_diaria_rellena_dias_vacios():
    df = pd.DataFrame(
        {"fecha": ["2024-01-01", "2024-01-03"], "visit_concept_id": [9, 9], "visitas": [5, 7]}
    )
    s = au.serie_diaria(df, 9, "visit_concept_id", "visitas")
    assert s.tolist() == [5.0, 0.0, 7.0]


def test_consultas_de_auditoria_son_de_solo_lectura_y_estan_registradas():
    for nombre in GRUPOS["auditoria"]:
        sql = leer_sql(EXTRACCIONES[nombre].sql).replace("{esquema}", "uninorte_omop")
        validar_solo_lectura(sql)
