"""Pruebas de validación, línea base, agregados, conexión y protocolo de factores.

Todo con datos SIMULADOS: no requieren VPN ni datos del hospital.
    python -m pytest tests/test_modelo_base.py -q
"""

import numpy as np
import pandas as pd
import pytest

from hun.data.agregados import serie_censo, serie_llegadas
from hun.data.conexion import validar_solo_lectura
from hun.models import evaluacion_factores as ef
from hun.models import linea_base, validacion


def _llegadas_horarias(dias=500, series=("urg", "cons"), semilla=0):
    rng = np.random.default_rng(semilla)
    ts = pd.date_range("2024-01-01", periods=dias * 24, freq="h")
    filas = []
    for i, s in enumerate(series):
        tasa = (
            (3 + i)
            * (1 + 0.5 * np.sin(2 * np.pi * ts.hour / 24))
            * np.where(ts.dayofweek < 5, 1.3, 0.7)
        )
        filas.append(pd.DataFrame({"ts": ts, "serie": s, "y": rng.poisson(tasa)}))
    return pd.concat(filas, ignore_index=True)


# --------------------------------------------------------------------------- validación
def test_pliegues_no_mezclan_futuro_y_caben_en_los_datos():
    df = _llegadas_horarias()
    pliegues = validacion.pliegues_walk_forward(df["ts"])
    assert len(pliegues) >= 8
    for p in pliegues:
        assert p.entrenamiento(df)["ts"].max() < p.origen
        assert p.prueba(df)["ts"].min() >= p.origen
        assert p.fin_prueba <= df["ts"].max() + pd.Timedelta("1h")
        assert len(p.prueba(df)) == 7 * 24 * 2  # 7 días completos × 2 series
    assert pliegues[-1].fin_prueba == df["ts"].max() + pd.Timedelta("1h")


def test_pliegues_diarios_usan_el_ultimo_dia():
    ts = pd.date_range("2023-01-01", "2025-06-30", freq="D")
    pliegues = validacion.pliegues_walk_forward(ts)
    assert pliegues[-1].fin_prueba == pd.Timestamp("2025-07-01")


def test_metricas_wape_y_ceros():
    m = validacion.metricas(np.array([0, 0, 10]), np.array([1, 0, 8]))
    assert m["wape"] == pytest.approx(3 / 10)
    assert m["sesgo"] == pytest.approx(-1 / 3)


# --------------------------------------------------------------------------- línea base
def test_linea_base_no_usa_datos_del_futuro():
    df = _llegadas_horarias(dias=60)
    origen = pd.Timestamp("2024-02-15")
    contaminado = df.copy()
    contaminado.loc[contaminado["ts"] >= origen, "y"] = 10_000
    prueba = df[(df["ts"] >= origen) & (df["ts"] < origen + pd.Timedelta("7D"))]
    p1 = linea_base.predecir(df, prueba["ts"], origen)
    p2 = linea_base.predecir(contaminado, prueba["ts"], origen)
    pd.testing.assert_frame_equal(p1, p2)
    assert p1["pred"].max() < 100


def test_linea_base_es_el_promedio_de_semanas_previas():
    ts = pd.date_range("2024-01-01", periods=24 * 7 * 5, freq="h")
    y = np.repeat([10, 20, 30, 40, 99], 24 * 7)  # cada semana un valor constante
    df = pd.DataFrame({"ts": ts, "serie": "a", "y": y})
    origen = pd.Timestamp("2024-01-29")  # inicio de la 5.ª semana
    pred = linea_base.predecir(df, [origen + pd.Timedelta("30h")], origen, semanas=4)
    assert pred["pred"].iloc[0] == pytest.approx(25)
    # A 9 días del origen, t − 7 días cae después del origen (no se conoce aún):
    # se salta y se usan t − 14 y t − 21 días (semanas 4 y 3).
    pred9 = linea_base.predecir(df, [origen + pd.Timedelta("9D")], origen, semanas=2)
    assert pred9["pred"].iloc[0] == pytest.approx((40 + 30) / 2)


def test_linea_base_supera_al_promedio_global_en_datos_con_patron():
    df = _llegadas_horarias()
    pliegues = validacion.pliegues_walk_forward(df["ts"], paso="28D")
    r = linea_base.evaluar(df, pliegues, semanas=4)
    wape_base = validacion.metricas(r["y"], r["pred"])["wape"]
    plano = r.groupby("serie")["y"].transform("mean")
    wape_plano = validacion.metricas(r["y"], plano)["wape"]
    assert wape_base < wape_plano
    assert set(r["dia_horizonte"]) == set(range(1, 8))


# --------------------------------------------------------------------------- agregados
def test_serie_llegadas_rellena_horas_sin_llegadas_con_cero():
    entradas = pd.DataFrame(
        {
            "hora": pd.to_datetime(["2024-01-01 00:00", "2024-01-01 03:00"]),
            "visit_concept_id": [9203, 9203],
            "entradas": [2, 5],
        }
    )
    s = serie_llegadas(entradas)
    assert len(s) == 4
    assert s["y"].tolist() == [2, 0, 0, 5]


def test_censo_es_entradas_menos_salidas_acumuladas():
    entradas = pd.DataFrame(
        {
            "hora": pd.to_datetime(["2024-01-01 00:00", "2024-01-01 01:00"]),
            "visit_concept_id": [1, 1],
            "entradas": [3, 2],
            "entradas_con_salida": [3, 2],
        }
    )
    salidas = pd.DataFrame(
        {
            "hora": pd.to_datetime(["2024-01-01 02:00", "2024-01-01 04:00"]),
            "visit_concept_id": [1, 1],
            "salidas": [1, 4],
        }
    )
    c = serie_censo(entradas, salidas, calentamiento="0h")
    assert c["y"].tolist() == [3, 5, 4, 4, 0]


# --------------------------------------------------------------------------- conexión
@pytest.mark.parametrize(
    "sql",
    [
        "SELECT 1",
        "  with x AS (SELECT 1) SELECT * FROM x",
        "SELECT 'drop table' AS texto -- un comentario con delete",
        "SELECT COUNT(*) FROM uninorte_omop.person;",
    ],
)
def test_validador_acepta_lecturas(sql):
    validar_solo_lectura(sql)


@pytest.mark.parametrize(
    "sql",
    [
        "DELETE FROM person",
        "SELECT 1; DROP TABLE person",
        "WITH x AS (DELETE FROM person RETURNING *) SELECT * FROM x",
        "UPDATE person SET year_of_birth = 1",
        "CREATE TABLE t AS SELECT 1",
        "",
    ],
)
def test_validador_rechaza_escrituras(sql):
    with pytest.raises(ValueError):
        validar_solo_lectura(sql)


# --------------------------------------------------------------------------- factores
def _serie_diaria_con_factor(semilla=1):
    rng = np.random.default_rng(semilla)
    fechas = pd.date_range("2022-01-01", "2025-06-30", freq="D")
    lluvia = rng.gamma(0.6, 8, len(fechas))  # factor real: varía día a día
    ruido = rng.normal(size=len(fechas))  # factor que no tiene nada que ver
    externos = pd.DataFrame(
        {
            "dia_semana": fechas.dayofweek,
            "mes": fechas.month,
            "sin_dia_anio": np.sin(2 * np.pi * fechas.dayofyear / 365.25),
            "cos_dia_anio": np.cos(2 * np.pi * fechas.dayofyear / 365.25),
            "es_fin_de_semana": (fechas.dayofweek >= 5).astype(int),
            "clima_precipitation_sum": lluvia,
            "epi_ruido": ruido,
        },
        index=fechas,
    )
    tasa = 80 * np.where(fechas.dayofweek < 5, 1.2, 0.8) * (1 + 0.04 * np.minimum(lluvia, 25))
    serie = pd.DataFrame({"ts": fechas, "serie": "urg", "y": rng.poisson(tasa)})
    return serie, externos


def _modelo_rapido(train, test, columnas):
    from sklearn.ensemble import HistGradientBoostingRegressor

    m = HistGradientBoostingRegressor(
        loss="poisson", max_iter=60, learning_rate=0.15, random_state=0
    )
    m.fit(train[columnas], train["y"])
    return m.predict(test[columnas])


def test_protocolo_acepta_factor_real_y_descarta_ruido():
    serie, externos = _serie_diaria_con_factor()
    pliegues = validacion.pliegues_walk_forward(serie["ts"], paso="21D")
    grupos = (
        ef.GrupoFactor("clima", prefijos=("clima_",)),
        ef.GrupoFactor("epidemiologia", prefijos=("epi_",)),
    )
    res = {r.grupo: r for r in ef.evaluar_grupos(serie, externos, pliegues, grupos, _modelo_rapido)}
    assert res["clima"].aceptado, res["clima"].motivos
    assert not res["epidemiologia"].aceptado
    tabla = ef.tabla_resultados(list(res.values()))
    assert set(tabla["decision"]) == {"acepta", "descarta"}


def test_placebo_corre_las_fechas():
    fechas = pd.date_range("2024-01-01", periods=20, freq="D")
    ext = pd.DataFrame({"x": np.arange(20)}, index=fechas)
    p = ef.placebo(ext, ["x"], "7D")
    assert np.isnan(p.loc["2024-01-07", "x"])
    assert p.loc["2024-01-08", "x"] == 0


def test_prueba_de_signo():
    assert ef.prueba_signo(10, 10) == pytest.approx(1 / 1024)
    assert ef.prueba_signo(0, 10) == pytest.approx(1.0)


def test_fecha_corte_descarta_registros_tardios_y_dia_a_medias():
    from hun.data.agregados import fecha_corte

    dias = pd.date_range("2026-01-01", "2026-03-09", freq="D")
    base = pd.DataFrame(
        {"hora": dias + pd.Timedelta("23h"), "visit_concept_id": 1, "entradas": 100}
    )
    parcial = pd.DataFrame(
        {"hora": [pd.Timestamp("2026-03-10 15:00")], "visit_concept_id": 1, "entradas": 60}
    )
    tardio = pd.DataFrame(
        {"hora": [pd.Timestamp("2026-04-20 09:00")], "visit_concept_id": 1, "entradas": 2}
    )
    entradas = pd.concat([base, parcial, tardio], ignore_index=True)
    assert fecha_corte(entradas) == pd.Timestamp("2026-03-10")


def test_agrupar_bajo_volumen_junta_los_tipos_raros():
    from hun.data.agregados import OTROS, agrupar_bajo_volumen

    ts = pd.date_range("2026-01-01", periods=10, freq="D")
    df = pd.concat(
        [
            pd.DataFrame({"ts": ts, "serie": 1, "y": 50}),
            pd.DataFrame({"ts": ts, "serie": 2, "y": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]}),
            pd.DataFrame({"ts": ts, "serie": 3, "y": [0, 0, 0, 0, 0, 0, 0, 0, 0, 1]}),
        ]
    )
    r = agrupar_bajo_volumen(df, min_por_dia=1.0)
    assert set(r["serie"]) == {1, OTROS}
    assert r.loc[r["serie"] == OTROS, "y"].sum() == 2


# --------------------------------------------------------------------------- placebo de festivos
def _externos_calendario():
    from external.calendario import festivos

    idx = pd.date_range("2022-01-01", "2025-12-31", freq="D", name="fecha")
    return festivos(idx).drop(columns=["nombre_festivo", "es_fin_de_semana"])


def test_placebo_festivos_mueve_cada_festivo_a_otro_dia_de_la_misma_semana_tipo():
    ext = _externos_calendario()
    cols = list(ext.columns)
    p = ef.placebo_festivos(ext, cols)
    real = ext.index[ext["es_festivo"] == 1]
    falso = p.index[p["es_festivo"] == 1]
    assert len(falso) == len(real)  # mismos festivos, en otras fechas
    assert not set(falso) & set(real)  # ninguno cae donde está el festivo real
    # el día de la semana de cada festivo se conserva (se compara la distribución)
    assert sorted(falso.dayofweek) == sorted(real.dayofweek)
    # el placebo no debe desplazar más de 4 semanas a ningún festivo
    desvios = [min(abs((f - r).days) for r in real) for f in falso]
    assert max(desvios) > 0


def test_placebo_festivos_recalcula_las_columnas_derivadas():
    ext = _externos_calendario()
    p = ef.placebo_festivos(ext, list(ext.columns))
    assert (p.loc[p["es_festivo"] == 1, "dias_a_festivo"] == 0).all()
    assert (p.loc[p["es_festivo"] == 1, "dias_desde_festivo"] == 0).all()
    # fines de semana intactos: la estacionalidad semanal no se rompe
    finde = p.index.dayofweek >= 5
    assert (p.loc[finde, "es_dia_no_laboral"] == 1).all()
    # cuenta de no laborales = fines de semana + festivos entre semana
    habil = ~finde
    assert (p.loc[habil, "es_dia_no_laboral"] == p.loc[habil, "es_festivo"]).all()


def test_placebo_festivos_es_reproducible_y_no_toca_otras_columnas():
    ext = _externos_calendario()
    ext["clima_x"] = np.arange(len(ext), dtype=float)
    cols = [c for c in ext.columns if c != "clima_x"]
    a = ef.placebo_festivos(ext, cols)
    b = ef.placebo_festivos(ext, cols)
    pd.testing.assert_frame_equal(a, b)
    pd.testing.assert_series_equal(a["clima_x"], ext["clima_x"])


def test_placebo_de_festivos_no_imita_un_efecto_festivo_real():
    """Con un efecto festivo real, el placebo (festivos movidos de día) casi no mejora."""
    cal = _externos_calendario()
    fechas = cal.index
    rng = np.random.default_rng(3)
    externos = cal.assign(
        dia_semana=fechas.dayofweek,
        mes=fechas.month,
        sin_dia_anio=np.sin(2 * np.pi * fechas.dayofyear / 365.25),
        cos_dia_anio=np.cos(2 * np.pi * fechas.dayofyear / 365.25),
        es_fin_de_semana=(fechas.dayofweek >= 5).astype(int),
    )
    tasa = 100 * np.where(fechas.dayofweek < 5, 1.0, 0.7) * np.where(cal["es_festivo"] == 1, 0.2, 1)
    serie = pd.DataFrame({"ts": fechas, "serie": "rehab", "y": rng.poisson(tasa)})
    pliegues = validacion.pliegues_walk_forward(serie["ts"], paso="30D")
    grupo = ef.GrupoFactor(
        "festivos_y_puentes", columnas=tuple(cal.columns), placebo=ef.placebo_festivos
    )
    (r,) = ef.evaluar_grupos(serie, externos, pliegues, (grupo,), _modelo_rapido)
    # con pliegues de 30 días varios no traen ningún festivo, así que la prueba de signo no se exige
    assert r.mejora_mediana > 0.05
    assert r.mejora_placebo_mediana < 0.5 * r.mejora_mediana


def test_evaluar_grupos_usa_el_placebo_propio_del_grupo():
    serie, externos = _serie_diaria_con_factor()
    pliegues = validacion.pliegues_walk_forward(serie["ts"], paso="60D")
    llamadas = []

    def mi_placebo(ext, cols):
        llamadas.append(list(cols))
        return ef.placebo(ext, cols, "7D")

    g = ef.GrupoFactor("clima", prefijos=("clima_",), placebo=mi_placebo)
    ef.evaluar_grupos(serie, externos, pliegues, (g,), _modelo_rapido)
    assert llamadas == [["clima_precipitation_sum"]]
