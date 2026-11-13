"""Protocolo para decidir si un factor externo aporta de verdad o es sesgo.

Ver `docs/protocolo_factores_externos.md` para el porqué de cada prueba. Resumen:

1. Ablación: mismo modelo con y sin el grupo de factores, en los mismos pliegues walk-forward.
2. Control de estacionalidad: el modelo "sin" ya tiene mes, día de la semana, ciclo anual y
   rezagos semanales. Si la lluvia solo refleja "estamos en octubre", no mejora nada.
3. Placebo: el mismo grupo pero desplazado en el tiempo (clima de hace un año, festivos
   corridos una semana). Conserva la forma y la estacionalidad del factor, pero rompe su
   relación con el día real. Si el placebo "aporta" casi lo mismo, el aporte era espurio.
4. Estabilidad: la mejora tiene que repetirse en la mayoría de pliegues, no solo en promedio.

Se evalúa por GRUPOS de factores (no columna por columna) para no hacer decenas de
comparaciones y aceptar alguna por azar.

El modelo es intercambiable: cualquier función `ajustar_predecir(train, test, columnas)`
que devuelva predicciones para `test`. Por defecto, gradient boosting con pérdida Poisson
(adecuada para conteos), de scikit-learn.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from math import comb

import numpy as np
import pandas as pd

from hun.models.validacion import Pliegue, metricas

AjustarPredecir = Callable[[pd.DataFrame, pd.DataFrame, list[str]], np.ndarray]


# --------------------------------------------------------------------------- configuración
@dataclass(frozen=True)
class GrupoFactor:
    """Un grupo de columnas de `externos.parquet` que se acepta o descarta en bloque.

    `desplazamiento_placebo`: cuánto se corre el grupo en el placebo.
    - Variables continuas (clima, epidemiología): 364 días → misma temporada y mismo día de
      la semana, pero el valor de OTRO año. Si "aporta" igual, solo estaba midiendo la temporada.
    - Eventos de calendario (Carnaval, vacaciones): 7 o 14 días → el evento cae en una fecha
      equivocada.
    - `placebo`: función propia `(externos, columnas) -> externos` cuando correr las fechas no
      basta. Los festivos la usan (`placebo_festivos`): correr 7 días conserva los fines de
      semana y la forma del calendario, y el placebo terminaba "aportando" lo que ya es
      estacionalidad. Si se define, `desplazamiento_placebo` se ignora.
    """

    nombre: str
    prefijos: tuple[str, ...] = ()
    columnas: tuple[str, ...] = ()
    desplazamiento_placebo: str = "364D"
    placebo: Callable[[pd.DataFrame, list[str]], pd.DataFrame] | None = None

    def resolver(self, disponibles: list[str]) -> list[str]:
        cols = [c for c in self.columnas if c in disponibles]
        cols += [c for c in disponibles if self.prefijos and c.startswith(self.prefijos)]
        return sorted(set(cols))


def placebo_festivos(
    externos: pd.DataFrame, columnas: list[str], semana_max: int = 4, semilla: int | None = None
) -> pd.DataFrame:
    """Placebo de festivos: cada festivo se muda a otro día del MISMO día de la semana.

    Mueve cada festivo `k` semanas (1 ≤ |k| ≤ `semana_max`, elegido con una semilla fija) a una
    fecha que no sea festivo real ni ya usada, así conserva el día de la semana, los fines de
    semana, la cantidad de festivos por año y la temporada, y rompe SOLO la relación con el día
    real. Luego recalcula todas las columnas derivadas (puentes, días a/desde festivo...) con la
    misma regla de `external.calendario.columnas_festivos`. Si el placebo "aporta" casi lo mismo
    que el real, el aporte venía de la estacionalidad, no de los festivos.
    """
    from external.calendario import columnas_festivos
    from hun import config

    ext = externos.copy()
    ext.index = pd.to_datetime(ext.index).normalize()
    idx = ext.index
    reales = set(idx[ext["es_festivo"].astype(bool).to_numpy()])
    rng = np.random.default_rng(config.RANDOM_SEED if semilla is None else semilla)
    ocupadas = set(reales)
    nuevos = set()
    saltos = [k for k in range(-semana_max, semana_max + 1) if k]
    for dia in sorted(reales):
        opciones = [
            dia + pd.Timedelta(days=7 * k)
            for k in saltos
            if idx.min() <= dia + pd.Timedelta(days=7 * k) <= idx.max()
            and dia + pd.Timedelta(days=7 * k) not in ocupadas
        ]
        if not opciones:
            continue
        destino = opciones[int(rng.integers(len(opciones)))]
        ocupadas.add(destino)
        nuevos.add(destino)
    es_festivo = pd.Series(idx.isin(list(nuevos)), index=idx)
    derivadas = columnas_festivos(idx, es_festivo)
    comunes = [c for c in columnas if c in derivadas.columns]
    ext[comunes] = derivadas[comunes].to_numpy()
    return ext


GRUPOS_POR_DEFECTO = (
    GrupoFactor(
        "festivos_y_puentes",
        columnas=(
            "es_festivo",
            "es_puente",
            "es_dia_no_laboral",
            "dia_post_festivo",
            "dias_a_festivo",
            "dias_desde_festivo",
        ),
        placebo=placebo_festivos,
    ),
    GrupoFactor(
        "carnaval_y_semana_santa",
        columnas=(
            "es_carnaval",
            "es_precarnaval",
            "es_semana_santa",
            "dias_a_carnaval",
            "dias_desde_carnaval",
        ),
        desplazamiento_placebo="7D",
    ),
    GrupoFactor(
        "vacaciones_escolares",
        columnas=("es_vacaciones_escolares", "temporada_navidad"),
        desplazamiento_placebo="14D",
    ),
    GrupoFactor(
        "quincena_y_primas",
        columnas=("es_dia_pago", "dias_desde_pago", "semana_de_pago", "es_mes_prima"),
        desplazamiento_placebo="7D",
    ),
    GrupoFactor("clima", prefijos=("clima_",), desplazamiento_placebo="364D"),
    GrupoFactor("epidemiologia", prefijos=("epi_",), desplazamiento_placebo="364D"),
)

# Variables que el modelo "sin factores" ya tiene. Representan la estacionalidad pura.
CALENDARIO_BASE = ("dia_semana", "mes", "sin_dia_anio", "cos_dia_anio", "es_fin_de_semana")


@dataclass(frozen=True)
class Criterios:
    """Umbrales de aceptación. Son una PROPUESTA: se ajustan con Daniel antes del Sprint 2."""

    mejora_minima: float = 0.01  # mediana de mejora relativa de WAPE ≥ 1 %
    fraccion_pliegues: float = 0.70  # mejora en ≥ 70 % de los pliegues
    p_valor_maximo: float = 0.05  # prueba de signo unilateral sobre los pliegues
    margen_placebo: float = 0.5  # el real debe mejorar ≥ 2× lo que mejora el placebo


@dataclass
class ResultadoGrupo:
    grupo: str
    columnas: list[str]
    mejora_mediana: float
    mejora_placebo_mediana: float
    fraccion_pliegues_mejora: float
    p_valor_signo: float
    aceptado: bool
    motivos: list[str] = field(default_factory=list)
    por_pliegue: pd.DataFrame | None = None


# --------------------------------------------------------------------------- features
def rezagos_semanales(
    serie: pd.DataFrame, semanas: tuple[int, ...] = (1, 2, 3, 4), freq: str = "D"
) -> pd.DataFrame:
    """Rezagos de 7, 14, 21, 28 días del mismo día (y hora). Seguros para horizontes ≤ 7 días.

    Agrega `rezago_prom_4s` (= la línea base) para que el modelo parta de ella.
    """
    df = serie.sort_values(["serie", "ts"]).copy()
    pasos_semana = int(pd.Timedelta("7D") / pd.Timedelta(f"1{freq}" if freq.isalpha() else freq))
    for s in semanas:
        df[f"rezago_{s}s"] = df.groupby("serie")["y"].shift(s * pasos_semana)
    cols = [f"rezago_{s}s" for s in semanas]
    df["rezago_prom_4s"] = df[cols].mean(axis=1)
    return df


def unir_externos(serie: pd.DataFrame, externos: pd.DataFrame) -> pd.DataFrame:
    """Une por fecha. `externos` indexado por fecha (como `data/externos.parquet`)."""
    ext = externos.copy()
    ext.index = pd.to_datetime(ext.index).normalize()
    df = serie.copy()
    df["fecha"] = pd.to_datetime(df["ts"]).dt.normalize()
    return df.merge(ext, left_on="fecha", right_index=True, how="left")


def placebo(externos: pd.DataFrame, columnas: list[str], desplazamiento: str) -> pd.DataFrame:
    """Copia de `externos` con `columnas` tomadas de `fecha − desplazamiento`."""
    ext = externos.copy()
    ext.index = pd.to_datetime(ext.index).normalize()
    corrido = ext[columnas].copy()
    corrido.index = corrido.index + pd.Timedelta(desplazamiento)
    ext[columnas] = corrido.reindex(ext.index)
    return ext


# --------------------------------------------------------------------------- modelo
def modelo_por_defecto(train: pd.DataFrame, test: pd.DataFrame, columnas: list[str]) -> np.ndarray:
    """Gradient boosting (scikit-learn) con pérdida Poisson. Maneja NaN de forma nativa."""
    from sklearn.ensemble import HistGradientBoostingRegressor

    from hun import config

    x_cols = columnas + ["serie_cod"]
    modelo = HistGradientBoostingRegressor(
        loss="poisson",
        max_iter=300,
        learning_rate=0.05,
        max_leaf_nodes=31,
        min_samples_leaf=20,
        categorical_features=["serie_cod"],
        random_state=config.RANDOM_SEED,
    )
    modelo.fit(train[x_cols], train["y"])
    return modelo.predict(test[x_cols])


def _error_por_pliegue(
    df: pd.DataFrame,
    columnas: list[str],
    pliegues: list[Pliegue],
    ajustar_predecir: AjustarPredecir,
) -> pd.Series:
    errores = {}
    for p in pliegues:
        train = p.entrenamiento(df).dropna(subset=["rezago_prom_4s"])
        test = p.prueba(df)
        pred = ajustar_predecir(train, test, columnas)
        errores[p.numero] = metricas(test["y"].to_numpy(), pred)["wape"]
    return pd.Series(errores, name="wape")


def prueba_signo(exitos: int, n: int) -> float:
    """p-valor unilateral de obtener ≥ `exitos` mejoras en `n` pliegues si fuera azar (p=0.5)."""
    return sum(comb(n, k) for k in range(exitos, n + 1)) / 2**n if n else 1.0


# --------------------------------------------------------------------------- protocolo
def evaluar_grupos(
    serie: pd.DataFrame,
    externos: pd.DataFrame,
    pliegues: list[Pliegue],
    grupos: tuple[GrupoFactor, ...] = GRUPOS_POR_DEFECTO,
    ajustar_predecir: AjustarPredecir = modelo_por_defecto,
    criterios: Criterios | None = None,
    freq: str = "D",
) -> list[ResultadoGrupo]:
    """Corre las 4 pruebas para cada grupo. `serie` en formato largo (`ts`, `serie`, `y`)."""
    criterios = criterios or Criterios()
    base = rezagos_semanales(serie, freq=freq)
    base["serie_cod"] = base["serie"].astype("category").cat.codes
    df = unir_externos(base, externos)
    cols_rezago = [c for c in base.columns if c.startswith("rezago_")]
    cols_base = cols_rezago + [c for c in CALENDARIO_BASE if c in df.columns]
    if freq.lower().startswith("h"):
        df["hora"] = pd.to_datetime(df["ts"]).dt.hour
        cols_base.append("hora")

    wape_base = _error_por_pliegue(df, cols_base, pliegues, ajustar_predecir)
    resultados = []
    for g in grupos:
        cols = g.resolver(list(externos.columns))
        if not cols:
            continue
        wape_con = _error_por_pliegue(df, cols_base + cols, pliegues, ajustar_predecir)
        if g.placebo is not None:
            ext_placebo = g.placebo(externos, cols)
        else:
            ext_placebo = placebo(externos, cols, g.desplazamiento_placebo)
        df_placebo = unir_externos(base, ext_placebo)
        if "hora" in cols_base:
            df_placebo["hora"] = df["hora"]
        wape_placebo = _error_por_pliegue(df_placebo, cols_base + cols, pliegues, ajustar_predecir)

        mejora = (wape_base - wape_con) / wape_base
        mejora_placebo = (wape_base - wape_placebo) / wape_base
        exitos, n = int((mejora > 0).sum()), int(mejora.notna().sum())
        r = ResultadoGrupo(
            grupo=g.nombre,
            columnas=cols,
            mejora_mediana=float(mejora.median()),
            mejora_placebo_mediana=float(mejora_placebo.median()),
            fraccion_pliegues_mejora=exitos / n if n else 0.0,
            p_valor_signo=prueba_signo(exitos, n),
            aceptado=False,
            por_pliegue=pd.DataFrame(
                {
                    "wape_sin": wape_base,
                    "wape_con": wape_con,
                    "wape_placebo": wape_placebo,
                    "mejora": mejora,
                    "mejora_placebo": mejora_placebo,
                }
            ),
        )
        if r.mejora_mediana < criterios.mejora_minima:
            r.motivos.append(
                f"mejora mediana {r.mejora_mediana:.2%} < {criterios.mejora_minima:.0%}"
            )
        if r.fraccion_pliegues_mejora < criterios.fraccion_pliegues:
            r.motivos.append(f"mejora solo en {r.fraccion_pliegues_mejora:.0%} de los pliegues")
        if r.p_valor_signo > criterios.p_valor_maximo:
            r.motivos.append(f"prueba de signo p={r.p_valor_signo:.3f}")
        if r.mejora_placebo_mediana > criterios.margen_placebo * max(r.mejora_mediana, 0):
            r.motivos.append(
                f"el placebo mejora {r.mejora_placebo_mediana:.2%}: el aporte puede ser "
                "estacionalidad o forma del factor, no el factor"
            )
        r.aceptado = not r.motivos
        resultados.append(r)
    return resultados


def tabla_resultados(resultados: list[ResultadoGrupo]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "grupo": r.grupo,
                "decision": "acepta" if r.aceptado else "descarta",
                "mejora_mediana": r.mejora_mediana,
                "mejora_placebo": r.mejora_placebo_mediana,
                "pliegues_con_mejora": r.fraccion_pliegues_mejora,
                "p_signo": r.p_valor_signo,
                "motivos": "; ".join(r.motivos),
                "n_columnas": len(r.columnas),
            }
            for r in resultados
        ]
    )
