"""Optimización operacional paramétrica. Ejecutar: python -m hun.models.optimizacion.

No estima la dotación existente. Un servidor representa un equipo activo equivalente,
no una persona ni una categoría profesional. Las duraciones de atención son supuestos.
"""

from __future__ import annotations

import argparse
import math
from datetime import date
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from hun import config
from hun.data.agregados import serie_censo_etapas, serie_llegadas
from hun.models.saturacion import calcular_calentamiento, calcular_umbrales_censo

FRANJAS = [
    "Mañana (06-12h)",
    "Tarde (12-18h)",
    "Noche (18-24h)",
    "Madrugada (00-06h)",
]
DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
SERVICIOS = {"urgencias": 9203, "rehabilitacion": 581479, "tratamiento_urgencia": 3045729}
NOTA_ERLANG = (
    "1/mu es un supuesto operativo paramétrico (15, 20 o 30 min), no una duración "
    "clínica observada. OMOP no contiene tabla de dotación (AI.md). Servidores = equipos "
    "activos equivalentes; no se conoce la plantilla actual. M/M/c supone llegadas Poisson, "
    "servicios exponenciales, cola única, estacionariedad y ausencia de abandono."
)
NOTA_TRANSICIONES = (
    "espera_h mide start_siguiente - end_anterior en OMOP; puede incluir solapamientos "
    "negativos, no equivale necesariamente a boarding clínico. El p90 conjunto es un "
    "promedio de p90 mensuales ponderado por pasos, no un percentil agrupado exacto. "
    "El mes corresponde al inicio de la visita; correlación ecológica, no causal."
)
DIAS_SEMANA_NOMBRE: tuple[str, ...] = (
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
)
MIN_DIAS_PERFIL_HORARIO: int = 4
NOTA_PRONOSTICO_FRANJA = (
    "Los volúmenes por franja reparten el pronóstico diario (p50 central y p90 alto) usando "
    "el perfil horario del día de semana calculado únicamente con observaciones completas "
    "anteriores al corte (incluyendo ceros de días completos). Repartir el p90 diario genera "
    "un escenario horario de demanda alta y no estima el p90 marginal independiente de cada "
    "franja. Los equipos equivalentes son requerimientos teóricos bajo 1/mu y meta elegidos, "
    "no comparación frente a plantilla real salvo que el operador aporte una referencia explícita."
)


def _validar_dotacion_referencia(dotacion_referencia: int | None) -> int | None:
    """Valida la dotación real de referencia opcional (equipos equivalentes >= 1)."""
    if dotacion_referencia is None:
        return None
    if isinstance(dotacion_referencia, bool) or not isinstance(dotacion_referencia, int):
        raise ValueError("La dotación de referencia debe ser un entero positivo.")
    if dotacion_referencia < 1:
        raise ValueError("La dotación de referencia debe ser al menos 1 equipo equivalente.")
    return dotacion_referencia


def _validar_tasa(llegadas_h: float, mu_h: float, servidores: int) -> None:
    if (
        not math.isfinite(llegadas_h)
        or llegadas_h < 0
        or not math.isfinite(mu_h)
        or mu_h <= 0
        or not isinstance(servidores, int)
        or servidores < 1
    ):
        raise ValueError("Tasas finitas no negativas, mu > 0 y servidores enteros >= 1.")


def probabilidad_espera_erlang_c(llegadas_h: float, mu_h: float, servidores: int) -> float:
    """Probabilidad de esperar en M/M/c, por recurrencia estable de Erlang B."""
    _validar_tasa(llegadas_h, mu_h, servidores)
    a = llegadas_h / mu_h
    rho = a / servidores
    if rho >= 1:
        return 1.0
    b = 1.0
    for k in range(1, servidores + 1):
        b = a * b / (k + a * b)
    return b / (1 - rho + rho * b)


def tiempo_espera_erlang_c_min(llegadas_h: float, mu_h: float, servidores: int) -> float:
    """Espera media en minutos; infinito cuando la cola no es estable."""
    p = probabilidad_espera_erlang_c(llegadas_h, mu_h, servidores)
    margen = servidores * mu_h - llegadas_h
    return 60 * p / margen if margen > 0 else math.inf


def dimensionar_erlang_c(
    llegadas_h: float,
    tiempo_servicio_min: float = 20.0,
    meta_espera_min: float = 15.0,
    nivel_servicio_objetivo: float = 0.80,
) -> dict[str, Any]:
    """Mínimo c estable que satisface ambas restricciones de espera."""
    if (
        not math.isfinite(tiempo_servicio_min)
        or tiempo_servicio_min <= 0
        or not math.isfinite(meta_espera_min)
        or meta_espera_min <= 0
        or not 0 < nivel_servicio_objetivo < 1
    ):
        raise ValueError("Servicio y meta deben ser positivos; nivel objetivo entre 0 y 1.")
    mu = 60 / tiempo_servicio_min
    _validar_tasa(llegadas_h, mu, 1)
    c = max(1, math.floor(llegadas_h / mu) + 1)
    while True:
        p = probabilidad_espera_erlang_c(llegadas_h, mu, c)
        espera = tiempo_espera_erlang_c_min(llegadas_h, mu, c)
        nivel = 1 - p * math.exp(-(c * mu - llegadas_h) * meta_espera_min / 60)
        if nivel >= nivel_servicio_objetivo and espera < meta_espera_min:
            return {
                "servidores": c,
                "espera_esperada_min": espera,
                "nivel_servicio": nivel,
                "ocupacion_pct": 100 * llegadas_h / (c * mu),
            }
        c += 1


def _fila_erlang(
    franja: str,
    tasas: list[float],
    tiempo: float,
    meta: float,
    nivel: float,
) -> dict[str, Any]:
    resultados = [dimensionar_erlang_c(t, tiempo, meta, nivel) for t in tasas]
    fila: dict[str, Any] = {"franja": franja}
    for regimen, tasa, r in zip(("normal", "p75", "p90"), tasas, resultados, strict=True):
        fila[f"lambda_{regimen}_h"] = tasa
        fila[f"servidores_{regimen}"] = r["servidores"]
    fila.update(
        {
            "delta_p90_vs_normal": resultados[2]["servidores"] - resultados[0]["servidores"],
            "espera_esperada_normal_min": resultados[0]["espera_esperada_min"],
            "espera_esperada_p90_min": resultados[2]["espera_esperada_min"],
            "ocupacion_p90_pct": resultados[2]["ocupacion_pct"],
        }
    )
    return fila


def calcular_erlang_c_servicios(
    entradas: pd.DataFrame | None = None,
    turnos: dict | None = None,
    parametros_servicio: dict | None = None,
    meta_espera_min: float = 15.0,
    nivel_servicio_objetivo: float = 0.80,
) -> dict[str, Any]:
    """Tasas por día y franja de seis horas, incluyendo ceros de la grilla regular."""
    parametros_servicio = parametros_servicio or {}
    servicios = {}
    regular = serie_llegadas(entradas) if entradas is not None and not entradas.empty else None
    for sid, cid in SERVICIOS.items():
        tasas = []
        fuente = "parámetros históricos diarios / 24; sin perfil horario disponible"
        for indice, _franja in enumerate(FRANJAS):
            if regular is not None and cid in regular["serie"].values:
                sub = regular[regular["serie"] == cid].copy()
                sub["dia"] = pd.to_datetime(sub["ts"]).dt.normalize()
                sub["franja"] = (pd.to_datetime(sub["ts"]).dt.hour // 6).astype(int)
                # Orden de presentación: mañana, tarde, noche, madrugada.
                x = sub[sub["franja"] == ((indice + 1) % 4)].groupby("dia")["y"].sum() / 6
                t = [float(x.mean()), float(x.quantile(0.75)), float(x.quantile(0.90))]
                fuente = "llegadas observadas por día y franja / 6 h (grilla con ceros)"
            elif turnos and sid in turnos:
                x = pd.Series([float(c["estimado"]) / 6 for c in turnos[sid]["matriz"][indice]])
                t = [float(x.mean()), float(x.quantile(0.75)), float(x.quantile(0.90))]
                fuente = "perfil de turnos; percentiles de medias por día semanal, no diarios"
            else:
                p = parametros_servicio.get(sid, {})
                t = [float(p.get(k, 0)) / 24 for k in ("media_diaria", "umbral_p75", "umbral_p90")]
            tasas.append(t)
        tiempo = 30.0 if sid == "rehabilitacion" else 20.0
        filas = [
            _fila_erlang(f, t, tiempo, meta_espera_min, nivel_servicio_objetivo)
            for f, t in zip(FRANJAS, tasas, strict=True)
        ]
        pico = max(range(4), key=lambda i: tasas[i][2])
        sensibilidad = []
        for minutos in (15, 20, 30):
            f = _fila_erlang(
                FRANJAS[pico],
                tasas[pico],
                minutos,
                meta_espera_min,
                nivel_servicio_objetivo,
            )
            sensibilidad.append(
                {
                    "tiempo_servicio_min": minutos,
                    "franja_pico": FRANJAS[pico],
                    **{k: f[k] for k in ("servidores_normal", "servidores_p75", "servidores_p90")},
                    "delta_p90": f["delta_p90_vs_normal"],
                }
            )
        servicios[sid] = {
            "nombre": sid.replace("_", " ").capitalize(),
            "tiempo_servicio_base_min": tiempo,
            "franjas": filas,
            "sensibilidad": sensibilidad,
            "fuente": fuente,
        }
    return {
        "meta_espera_min": meta_espera_min,
        "nivel_servicio_objetivo": nivel_servicio_objetivo,
        "tiempos_servicio_min": [15, 20, 30],
        "servicios": servicios,
        "nota_metodologica": NOTA_ERLANG,
    }


def _hospital(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["visit_detail_concept_id"] == 9201].copy()


def _escenario_estancia(llegadas: float, estancia: float, reduccion: float) -> dict:
    efectiva = min(reduccion, estancia)
    return {
        "reduccion_horas": reduccion,
        "nueva_estancia_media_horas": estancia - efectiva,
        "camas_liberadas": llegadas * efectiva / 24,
        "reduccion_pct_censo": 100 * efectiva / estancia if estancia else 0.0,
    }


def _desplazar_altas(salidas: pd.DataFrame, pct: float) -> pd.DataFrame:
    """Redistribuye masa fraccional por día; conserva exactamente las altas diarias."""
    s = salidas.copy()
    s["hora"] = pd.to_datetime(s["hora"])
    valores = s.groupby("hora")["salidas"].sum()
    indice = pd.date_range(
        valores.index.min().normalize(),
        valores.index.max().normalize() + pd.Timedelta(hours=23),
        freq="h",
    )
    valores = valores.reindex(indice, fill_value=0.0).astype(float)
    origen = (indice.hour >= 14) & (indice.hour < 20)
    movidas = valores.where(origen, 0.0) * pct / 100
    por_dia = movidas.groupby(indice.normalize()).sum()
    valores -= movidas
    destino = (indice.hour >= 8) & (indice.hour < 12)
    valores.loc[destino] += por_dia.reindex(indice[destino].normalize()).to_numpy() / 4
    return pd.DataFrame(
        {
            "hora": indice,
            "visit_detail_concept_id": 9201,
            "salidas": valores.to_numpy(),
        }
    )


def calcular_ley_little_y_altas_tempranas(
    entradas: pd.DataFrame,
    salidas: pd.DataFrame,
    duraciones_diarias: pd.DataFrame,
    percentiles: pd.DataFrame,
) -> dict[str, Any]:
    """Ley de Little estacionaria y redistribución intradía sobre el mismo censo horario."""
    e, s, d, p = map(_hospital, (entradas, salidas, duraciones_diarias, percentiles))
    if any(x.empty for x in (e, s, d, p)):
        return _little_no_disponible()
    calentamiento = calcular_calentamiento(percentiles)
    censo = serie_censo_etapas(e, s, calentamiento)
    if censo.empty or d["etapas"].sum() <= 0:
        return _little_no_disponible()
    umbral = calcular_umbrales_censo(censo, como_dict=True)[9201]
    horas = pd.to_datetime(e["hora"])
    dias = pd.date_range(horas.min().normalize(), horas.max().normalize(), freq="D")
    ingresos = e.assign(dia=horas.dt.normalize()).groupby("dia")["entradas_con_salida"].sum()
    llegadas = float(ingresos.reindex(dias, fill_value=0).mean())
    estancia = float(np.average(d["horas_media"], weights=d["etapas"]))
    rojo = float(100 * (censo["y"] > umbral["p90"]).mean())
    escenarios = []
    # 0 y 100 son anclas explícitas para interpolar el simulador sin extrapolar.
    for pct in (0, 20, 35, 50, 100):
        sim = serie_censo_etapas(e, _desplazar_altas(s, pct), calentamiento)
        sim = sim[sim["ts"].isin(censo["ts"])]
        pico, pico_sim = float(censo["y"].max()), float(sim["y"].max())
        rojo_sim = float(100 * (sim["y"] > umbral["p90"]).mean())
        escenarios.append(
            {
                "pct_altas_adelantadas": pct,
                "ventana_origen": "14:00–20:00",
                "ventana_destino": "08:00–12:00",
                "censo_pico_base": pico,
                "censo_pico_simulado": pico_sim,
                "camas_pico_liberadas": pico - pico_sim,
                "pct_horas_rojo_base": rojo,
                "pct_horas_rojo_simulado": rojo_sim,
                "reduccion_horas_rojo_pct": 100 * (rojo - rojo_sim) / rojo if rojo else 0.0,
            }
        )
    return {
        "etapa": "Hospitalización",
        "concept_id": 9201,
        "ingresos_dia_promedio": llegadas,
        "estancia_media_horas": estancia,
        "estancia_mediana_horas": float(p["horas_p50"].iloc[0]),
        "censo_teorico_little": llegadas * estancia / 24,
        "censo_medio_observado": float(censo["y"].mean()),
        "censo_mediana_observada": umbral["p50"],
        "umbral_p75": umbral["p75"],
        "umbral_p90": umbral["p90"],
        "pct_horas_rojo_base": rojo,
        "escenarios_estancia": [_escenario_estancia(llegadas, estancia, h) for h in (2, 4, 6, 8)],
        "escenarios_altas_tempranas": [
            x for x in escenarios if x["pct_altas_adelantadas"] in (20, 35, 50)
        ],
        "anclas_altas_tempranas": escenarios,
        "calentamiento": calentamiento,
        "nota_metodologica": (
            "Ingresos cerrados, consistentes con el censo reconstruido; media de estancia "
            "ponderada por etapas. Ventanas semiabiertas [14,20) y [08,12), mismo día. "
            "Altas fraccionales distribuidas uniformemente: escenario agregado, no agenda "
            "individual; no garantiza factibilidad clínica ni causalidad. Umbral p90 fijo. "
            "Las series etapas_entradas_por_hora y etapas_salidas_por_hora ya excluyen "
            "estancias superiores al percentil p99.9 por etapa (14/15_etapas_*.sql)."
        ),
    }


def _little_no_disponible() -> dict:
    return {
        "etapa": "Hospitalización",
        "concept_id": 9201,
        **dict.fromkeys(
            (
                "ingresos_dia_promedio",
                "estancia_media_horas",
                "estancia_mediana_horas",
                "censo_teorico_little",
                "censo_medio_observado",
                "censo_mediana_observada",
                "umbral_p75",
                "umbral_p90",
                "pct_horas_rojo_base",
            )
        ),
        "escenarios_estancia": [],
        "escenarios_altas_tempranas": [],
        "nota_metodologica": "No disponible: faltan agregados reales; no se inventan cifras.",
    }


def analizar_cuello_urgencias_hospitalizacion(
    transiciones: pd.DataFrame | None,
    censo: pd.DataFrame | None,
) -> dict[str, Any]:
    """Relaciona las transiciones mensuales con el censo mensual medio y p90."""
    r = {
        "origen": "Treatment urgency (3045729)",
        "destino": "Inpatient Visit (9201)",
        "pasos_totales": 0,
        "espera_p50_horas": None,
        "espera_p90_horas": None,
        "correlacion_censo_espera_p90": None,
        "espera_p90_censo_normal_horas": None,
        "espera_p90_censo_alto_horas": None,
        "nota_metodologica": NOTA_TRANSICIONES,
    }
    if transiciones is None or transiciones.empty:
        return r
    t = transiciones[
        (transiciones["visit_concept_id"] == 9203)
        & (transiciones["etapa"] == 3045729)
        & (transiciones["etapa_siguiente"] == 9201)
    ].copy()
    if t.empty or t["pasos"].sum() <= 0:
        return r
    r["pasos_totales"] = int(t["pasos"].sum())
    for q in ("50", "90"):
        validos = t.dropna(subset=[f"espera_h_p{q}"])
        if not validos.empty:
            r[f"espera_p{q}_horas"] = float(
                np.average(
                    validos[f"espera_h_p{q}"],
                    weights=validos["pasos"],
                )
            )
    if censo is None or censo.empty:
        return r
    c = censo[censo["serie"] == 9201].copy()
    c["mes"] = pd.to_datetime(c["ts"]).dt.to_period("M").dt.to_timestamp()
    mensual = c.groupby("mes")["y"].agg(censo_media="mean", censo_p90=lambda x: x.quantile(0.9))
    t["mes"] = pd.to_datetime(t["mes"]).dt.to_period("M").dt.to_timestamp()
    unido = t.merge(mensual, on="mes").dropna(subset=["espera_h_p90", "censo_media"])
    if (
        len(unido) >= 2
        and unido["censo_media"].nunique() > 1
        and unido["espera_h_p90"].nunique() > 1
    ):
        r["correlacion_censo_espera_p90"] = float(unido["censo_media"].corr(unido["espera_h_p90"]))
    mediana = mensual["censo_media"].median()
    for nombre, mascara in (
        ("normal", unido["censo_media"] <= mediana),
        ("alto", unido["censo_media"] > mediana),
    ):
        grupo = unido[mascara]
        if not grupo.empty and grupo["pasos"].sum() > 0:
            r[f"espera_p90_censo_{nombre}_horas"] = float(
                np.average(
                    grupo["espera_h_p90"],
                    weights=grupo["pasos"],
                )
            )
    r["mensual"] = [
        {
            "mes": str(f["mes"].date()),
            "censo_media": float(f["censo_media"]),
            "censo_p90": float(f["censo_p90"]),
            "espera_p90_horas": float(f["espera_h_p90"]),
        }
        for _, f in unido.iterrows()
    ]
    return r


def generar_recomendaciones_cuantificadas(base: dict) -> list[dict]:
    """Acciones derivadas exclusivamente de los resultados disponibles."""
    recomendaciones = []

    def agregar(area, palanca, titulo, accion, impacto, horizonte):
        recomendaciones.append(
            {
                "id": f"REC-{len(recomendaciones) + 1:02d}",
                "area": area,
                "palanca": palanca,
                "titulo": titulo,
                "accion": accion,
                "impacto_cuantificado": impacto,
                "horizonte": horizonte,
            }
        )

    for sid in ("urgencias", "rehabilitacion"):
        servicio = base["erlang_c"]["servicios"][sid]
        pico = max(servicio["franjas"], key=lambda f: f["lambda_p90_h"])
        agregar(
            servicio["nombre"],
            "equipos activos equivalentes",
            f"Planificar {pico['franja']}",
            "Validar tiempos de atención y disponibilidad real antes de asignar equipos.",
            f"Demanda p90 {pico['lambda_p90_h']:.2f}/h: {pico['servidores_p90']} equipos "
            f"frente a {pico['servidores_normal']} en régimen normal; espera media "
            f"{pico['espera_esperada_p90_min']:.2f} min. No es dotación adicional observada.",
            "Planificación de turnos",
        )
    little = base["ley_little_camas"]
    if little["escenarios_estancia"]:
        e = little["escenarios_estancia"][1]
        agregar(
            "Hospitalización",
            "estancia",
            "Evaluar reducción segura de estancia",
            "Revisar demoras evitables, sin modificar criterios clínicos.",
            f"Reducir {e['reduccion_horas']:.0f} h libera teóricamente "
            f"{e['camas_liberadas']:.2f} camas medias ({e['reduccion_pct_censo']:.2f}%).",
            "Piloto y seguimiento",
        )
    if little["escenarios_altas_tempranas"]:
        e = little["escenarios_altas_tempranas"][1]
        agregar(
            "Hospitalización",
            "horario de alta",
            "Pilotar altas matutinas",
            "Adelantar a 08–12 h el 35% de altas de 14–20 h clínicamente elegibles.",
            f"Pico {e['censo_pico_base']:.2f} → {e['censo_pico_simulado']:.2f}; "
            f"horas rojas {e['pct_horas_rojo_base']:.2f}% → "
            f"{e['pct_horas_rojo_simulado']:.2f}% (umbral fijo).",
            "Piloto intradía",
        )
    cuello = base["cuello_urgencias_hospitalizacion"]
    if cuello.get("espera_p90_horas") is not None:
        agregar(
            "Urgencias → Hospitalización",
            "transferencia",
            "Auditar transiciones demoradas",
            "Coordinar disponibilidad de cama y revisar marcas temporales OMOP.",
            f"{cuello['pasos_totales']} pasos; p90 mensual ponderado "
            f"{cuello['espera_p90_horas']:.2f} h. No se atribuye una reducción causal.",
            "Seguimiento mensual",
        )
    return recomendaciones


def construir_resumen_optimizacion(
    raw_dir: Path | None = None,
    turnos: dict | None = None,
    parametros_servicio: dict | None = None,
) -> dict[str, Any]:
    """Construye el resumen; los datos ausentes quedan explícitamente no disponibles."""
    raw = raw_dir if raw_dir is not None else config.RAW_DIR

    def leer(nombre):
        ruta = raw / f"{nombre}.parquet"
        return pd.read_parquet(ruta) if ruta.exists() else None

    entradas = leer("entradas_por_hora")
    e, s = leer("etapas_entradas_por_hora"), leer("etapas_salidas_por_hora")
    d, p = leer("duracion_etapas_diaria"), leer("duracion_etapas_percentiles")
    little, censo = _little_no_disponible(), None
    if all(x is not None for x in (e, s, d, p)):
        little = calcular_ley_little_y_altas_tempranas(e, s, d, p)
        censo = serie_censo_etapas(_hospital(e), _hospital(s), calcular_calentamiento(p))
    base = {
        "erlang_c": calcular_erlang_c_servicios(entradas, turnos, parametros_servicio),
        "ley_little_camas": little,
        "cuello_urgencias_hospitalizacion": analizar_cuello_urgencias_hospitalizacion(
            leer("transiciones_etapas"),
            censo,
        ),
    }
    base["recomendaciones"] = generar_recomendaciones_cuantificadas(base)
    return base


def construir_perfiles_horarios_por_corte(
    entradas: pd.DataFrame | None,
    *,
    fecha_corte_datos: Any = None,
    cortes: list[Any] | None = None,
    cortes_extra: list[Any] | None = None,
    min_dias_por_dia_semana: int = MIN_DIAS_PERFIL_HORARIO,
) -> dict[str, Any]:
    """Construye perfiles horarios por servicio, corte y día de semana sin fuga temporal.

    Incluye ceros de horas y días calendario completos dentro del historial anterior a cada
    corte para evitar sesgos por días con cero llegadas.
    """
    vacio: dict[str, Any] = {
        "version": "1.0",
        "franjas": list(FRANJAS),
        "min_dias_por_dia_semana": int(min_dias_por_dia_semana),
        "incluye_ceros_dias_completos": True,
        "cortes_disponibles": [],
        "servicios": {sid: {} for sid in SERVICIOS},
    }
    if entradas is None or entradas.empty:
        return vacio

    horas = pd.to_datetime(entradas["hora"])
    if fecha_corte_datos is not None:
        corte_max = pd.Timestamp(fecha_corte_datos).normalize()
        df_in = entradas[horas < corte_max].copy()
        if df_in.empty:
            return vacio
        ultimo_dia = corte_max - pd.Timedelta(days=1)
    else:
        df_in = entradas.copy()
        ultimo_dia = horas.max().normalize()
        corte_max = ultimo_dia + pd.Timedelta(days=1)

    primer_dia = pd.to_datetime(df_in["hora"]).min().normalize()
    if primer_dia > ultimo_dia:
        return vacio

    regular = serie_llegadas(
        df_in,
        freq="h",
        inicio=primer_dia,
        fin=ultimo_dia + pd.Timedelta(hours=23),
    )
    ts = pd.to_datetime(regular["ts"])
    regular["dia"] = ts.dt.normalize()
    # Alinea la hora con el orden de presentación en FRANJAS: 06-12, 12-18, 18-24, 00-06.
    regular["franja_idx"] = ((ts.dt.hour // 6) - 1) % 4

    diario = regular.groupby(["serie", "dia", "franja_idx"], as_index=False)["y"].sum()
    piv = (
        diario.pivot(index=["serie", "dia"], columns="franja_idx", values="y")
        .reindex(columns=[0, 1, 2, 3], fill_value=0.0)
        .fillna(0.0)
        .reset_index()
    )
    piv["dia_semana"] = pd.to_datetime(piv["dia"]).dt.day_of_week

    if cortes is not None:
        cortes_ts = sorted({pd.Timestamp(c).normalize() for c in cortes})
    else:
        mensuales = list(pd.date_range(primer_dia, corte_max, freq="MS"))
        extras = [pd.Timestamp(c).normalize() for c in (cortes_extra or [])]
        cortes_ts = sorted({*mensuales, *extras, corte_max})

    servicios_out: dict[str, dict[str, dict[str, Any]]] = {sid: {} for sid in SERVICIOS}
    for sid, cid in SERVICIOS.items():
        df_srv = piv[piv["serie"] == cid]
        if df_srv.empty:
            continue
        for corte_ts in cortes_ts:
            prev = df_srv[df_srv["dia"] < corte_ts]
            if prev.empty:
                continue
            corte_str = corte_ts.strftime("%Y-%m-%d")
            perfil_corte: dict[str, Any] = {}
            for dow in range(7):
                g = prev[prev["dia_semana"] == dow]
                if len(g) < min_dias_por_dia_semana:
                    continue
                totales = [float(g[i].sum()) for i in range(4)]
                total = sum(totales)
                if total <= 0:
                    continue
                props = [t / total for t in totales]
                suma = sum(props)
                props = [p / suma for p in props]
                perfil_corte[str(dow)] = {
                    "proporciones": props,
                    "dias_observados": int(len(g)),
                    "fecha_inicio_obs": pd.Timestamp(g["dia"].min()).strftime("%Y-%m-%d"),
                    "fecha_fin_obs": pd.Timestamp(g["dia"].max()).strftime("%Y-%m-%d"),
                }
            if perfil_corte:
                servicios_out[sid][corte_str] = perfil_corte

    cortes_disponibles = sorted({c for s_dict in servicios_out.values() for c in s_dict})
    return {
        "version": "1.0",
        "franjas": list(FRANJAS),
        "min_dias_por_dia_semana": int(min_dias_por_dia_semana),
        "incluye_ceros_dias_completos": True,
        "cortes_disponibles": cortes_disponibles,
        "servicios": servicios_out,
    }


def seleccionar_perfil_horario(
    perfiles_horarios: dict[str, Any] | None,
    servicio: str,
    fecha_objetivo: date,
    *,
    corte_maximo: date | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    """Selecciona el perfil horario más reciente sin fuga para (servicio, fecha)."""
    if not isinstance(perfiles_horarios, dict) or "servicios" not in perfiles_horarios:
        return (
            None,
            "Pronóstico por franja no disponible: el paquete del modelo no contiene perfiles "
            "horarios por corte.",
        )
    srv_cortes = perfiles_horarios.get("servicios", {}).get(servicio)
    if not srv_cortes:
        return (
            None,
            f"Pronóstico por franja no disponible: no hay perfiles horarios registrados para "
            f"'{servicio}'.",
        )
    limite = (corte_maximo or fecha_objetivo).isoformat()
    dow = fecha_objetivo.weekday()
    dow_key = str(dow)
    candidatos = sorted(
        c for c in srv_cortes if c <= limite and (dow_key in srv_cortes[c] or dow in srv_cortes[c])
    )
    if not candidatos:
        return (
            None,
            f"Pronóstico por franja no disponible: historial insuficiente o sin llegadas previas "
            f"para {DIAS_SEMANA_NOMBRE[dow]} antes del corte {limite}.",
        )
    corte_sel = candidatos[-1]
    entrada = srv_cortes[corte_sel].get(dow_key) or srv_cortes[corte_sel].get(dow)
    if not isinstance(entrada, dict):
        return None, "Pronóstico por franja no disponible: perfil horario inválido."
    try:
        props = [float(x) for x in entrada.get("proporciones", [])]
    except (TypeError, ValueError):
        return None, "Pronóstico por franja no disponible: proporciones horarias inválidas."
    if (
        len(props) != 4
        or any(not math.isfinite(p) or p < 0 for p in props)
        or abs(sum(props) - 1.0) > 1e-6
    ):
        return None, "Pronóstico por franja no disponible: el perfil horario no suma 1."
    return (
        {
            "corte_perfil": corte_sel,
            "dia_semana": dow,
            "nombre_dia": DIAS_SEMANA_NOMBRE[dow],
            "dias_observados": int(entrada.get("dias_observados", 0)),
            "fecha_inicio_obs": entrada.get("fecha_inicio_obs"),
            "fecha_fin_obs": entrada.get("fecha_fin_obs"),
            "incluye_ceros_dias_completos": bool(
                perfiles_horarios.get("incluye_ceros_dias_completos", True)
            ),
            "proporciones": props,
            "suma_proporciones": float(sum(props)),
        },
        None,
    )


def _simular_estancia_y_altas(
    optimizacion_base: dict,
    reduccion_estancia_horas: float,
    pct_altas_tempranas: float,
) -> tuple[float | None, dict[str, Any] | None]:
    """Calcula escenarios históricos separados de estancia (Little) y altas tempranas."""
    if (
        not math.isfinite(reduccion_estancia_horas)
        or reduccion_estancia_horas < 0
        or not math.isfinite(pct_altas_tempranas)
        or not 0 <= pct_altas_tempranas <= 100
    ):
        raise ValueError("Reducción de estancia >= 0 y porcentaje de altas entre 0 y 100.")
    little = optimizacion_base["ley_little_camas"]
    camas = None
    if little["ingresos_dia_promedio"] is not None:
        camas = _escenario_estancia(
            little["ingresos_dia_promedio"],
            little["estancia_media_horas"],
            reduccion_estancia_horas,
        )["camas_liberadas"]
    anclas = little.get("anclas_altas_tempranas", little["escenarios_altas_tempranas"])
    escenario = None
    if anclas:
        anclas = sorted(anclas, key=lambda x: x["pct_altas_adelantadas"])
        xs = [x["pct_altas_adelantadas"] for x in anclas]
        if not xs[0] <= pct_altas_tempranas <= xs[-1]:
            raise ValueError("Porcentaje fuera del intervalo de escenarios precalculados.")
        escenario = {
            k: float(np.interp(pct_altas_tempranas, xs, [a[k] for a in anclas]))
            if isinstance(v, (float, int))
            else v
            for k, v in anclas[0].items()
        }
        escenario["pct_altas_adelantadas"] = pct_altas_tempranas
        escenario["metodo"] = (
            "exacto precalculado"
            if pct_altas_tempranas in xs
            else "interpolación lineal de escenarios; horas rojas aproximadas"
        )
    return camas, escenario


def simular_erlang_c_pronostico(
    demanda_central: float,
    demanda_alta: float,
    proporciones_franjas: list[float],
    *,
    tiempo_servicio_min: float = 20.0,
    meta_espera_min: float = 15.0,
    nivel_servicio_objetivo: float = 0.80,
    dotacion_referencia: int | None = None,
) -> dict[str, Any]:
    """Reparte p50 y p90 diarios por franja de 6 h y dimensiona Erlang C en cada una."""
    _validar_dotacion_referencia(dotacion_referencia)
    if (
        not math.isfinite(demanda_central)
        or not math.isfinite(demanda_alta)
        or demanda_central < 0
        or demanda_alta < demanda_central
    ):
        raise ValueError("Se requiere 0 <= demanda_central <= demanda_alta finitas.")
    if len(proporciones_franjas) != 4:
        raise ValueError("Se requieren exactamente 4 proporciones de franja.")
    props_raw = [float(p) for p in proporciones_franjas]
    suma = sum(props_raw)
    if any(not math.isfinite(p) or p < 0 for p in props_raw) or suma <= 0 or abs(suma - 1.0) > 1e-6:
        raise ValueError("Las proporciones por franja deben ser no negativas y sumar 1.")
    props = [p / suma for p in props_raw]

    filas = []
    for franja, prop in zip(FRANJAS, props, strict=True):
        vol_c = float(demanda_central) * prop
        vol_a = float(demanda_alta) * prop
        lam_c = vol_c / 6.0
        lam_a = vol_a / 6.0
        res_c = dimensionar_erlang_c(
            lam_c,
            tiempo_servicio_min,
            meta_espera_min,
            nivel_servicio_objetivo,
        )
        res_a = dimensionar_erlang_c(
            lam_a,
            tiempo_servicio_min,
            meta_espera_min,
            nivel_servicio_objetivo,
        )
        fila: dict[str, Any] = {
            "franja": franja,
            "proporcion_franja": prop,
            "volumen_central": vol_c,
            "volumen_alto": vol_a,
            "lambda_central_h": lam_c,
            "lambda_alto_h": lam_a,
            "servidores_central": res_c["servidores"],
            "servidores_alto": res_a["servidores"],
            "delta_alto_vs_central": res_a["servidores"] - res_c["servidores"],
            "espera_esperada_central_min": res_c["espera_esperada_min"],
            "espera_esperada_alto_min": res_a["espera_esperada_min"],
            "nivel_servicio_central": res_c["nivel_servicio"],
            "nivel_servicio_alto": res_a["nivel_servicio"],
            "ocupacion_central_pct": res_c["ocupacion_pct"],
            "ocupacion_alto_pct": res_a["ocupacion_pct"],
        }
        if dotacion_referencia is not None:
            fila["dotacion_referencia"] = dotacion_referencia
            fila["brecha_central_vs_referencia"] = res_c["servidores"] - dotacion_referencia
            fila["brecha_alto_vs_referencia"] = res_a["servidores"] - dotacion_referencia
        filas.append(fila)

    return {
        "erlang_c_franjas": filas,
        "reconciliacion": {
            "total_central_objetivo": float(demanda_central),
            "suma_franjas_central": float(sum(f["volumen_central"] for f in filas)),
            "total_alto_objetivo": float(demanda_alta),
            "suma_franjas_alto": float(sum(f["volumen_alto"] for f in filas)),
        },
    }


def simular_escenario_optimizacion(
    optimizacion_base: dict,
    servicio: str,
    tiempo_servicio_min: float = 20.0,
    meta_espera_min: float = 15.0,
    reduccion_estancia_horas: float = 4.0,
    pct_altas_tempranas: float = 30,
    *,
    pronostico_jornada: dict[str, Any] | None = None,
    turnos: dict[str, Any] | None = None,
    dotacion_habitual: int | None = None,
    dotacion_alternativa: int | None = None,
    dotacion_referencia: int | None = None,
) -> dict[str, Any]:
    """Erlang exacto; Little estacionario; altas interpoladas, no nueva simulación causal."""
    _validar_dotacion_referencia(dotacion_referencia)
    erlang = optimizacion_base["erlang_c"]
    if servicio not in erlang["servicios"]:
        raise ValueError("Servicio no disponible para optimización.")
    camas, escenario = _simular_estancia_y_altas(
        optimizacion_base,
        reduccion_estancia_horas,
        pct_altas_tempranas,
    )
    filas = []
    for f in erlang["servicios"][servicio]["franjas"]:
        fila = _fila_erlang(
            f["franja"],
            [f[f"lambda_{r}_h"] for r in ("normal", "p75", "p90")],
            tiempo_servicio_min,
            meta_espera_min,
            erlang["nivel_servicio_objetivo"],
        )
        if dotacion_referencia is not None:
            fila["dotacion_referencia"] = dotacion_referencia
            fila["brecha_normal_vs_referencia"] = fila["servidores_normal"] - dotacion_referencia
            fila["brecha_p90_vs_referencia"] = fila["servidores_p90"] - dotacion_referencia
        filas.append(fila)

    decision_jornada = None
    if pronostico_jornada is not None:
        decision_jornada = dimensionar_jornada_con_pronostico(
            optimizacion_base=optimizacion_base,
            servicio=servicio,
            pred_p10=float(pronostico_jornada["p10"]),
            pred_p50=float(pronostico_jornada["p50"]),
            pred_p90=float(pronostico_jornada["p90"]),
            fecha=pronostico_jornada.get("fecha"),
            dia_semana=pronostico_jornada.get("dia_semana"),
            turnos=turnos,
            tiempo_servicio_min=tiempo_servicio_min,
            meta_espera_min=meta_espera_min,
            dotacion_habitual=dotacion_habitual,
            dotacion_alternativa=dotacion_alternativa,
            alerta=pronostico_jornada.get("alerta"),
            llegadas_reales=pronostico_jornada.get("llegadas_reales"),
        )
    elif dotacion_habitual is not None or dotacion_alternativa is not None:
        decision_jornada = dimensionar_jornada_con_pronostico(
            optimizacion_base=optimizacion_base,
            servicio=servicio,
            pred_p10=sum(float(f["lambda_normal_h"]) * 6.0 for f in filas),
            pred_p50=sum(float(f["lambda_p75_h"]) * 6.0 for f in filas),
            pred_p90=sum(float(f["lambda_p90_h"]) * 6.0 for f in filas),
            turnos=turnos,
            tiempo_servicio_min=tiempo_servicio_min,
            meta_espera_min=meta_espera_min,
            dotacion_habitual=dotacion_habitual,
            dotacion_alternativa=dotacion_alternativa,
        )

    salida: dict[str, Any] = {
        "servicio": servicio,
        "erlang_c_franjas": filas,
        "camas_liberadas_estancia": camas,
        "escenario_altas_tempranas": escenario,
        "decision_jornada": decision_jornada,
    }
    if dotacion_referencia is not None:
        salida["dotacion_referencia"] = dotacion_referencia
    return salida


def _evaluar_dotacion_fija(
    llegadas_h: float,
    tiempo_servicio_min: float,
    meta_espera_min: float,
    servidores: int,
) -> dict[str, Any]:
    """Evalúa espera media, nivel de servicio y estabilidad en M/M/c para c fijo."""
    if (
        not math.isfinite(tiempo_servicio_min)
        or tiempo_servicio_min <= 0
        or not math.isfinite(meta_espera_min)
        or meta_espera_min <= 0
        or isinstance(servidores, bool)
        or not isinstance(servidores, int)
        or servidores < 1
    ):
        raise ValueError("Servicio, meta y servidores (>= 1) deben ser positivos.")
    mu = 60.0 / tiempo_servicio_min
    _validar_tasa(llegadas_h, mu, servidores)
    ocupacion_pct = 100.0 * llegadas_h / (servidores * mu)
    estable = (servidores * mu) > llegadas_h
    if estable:
        p_esp = probabilidad_espera_erlang_c(llegadas_h, mu, servidores)
        espera_min = float(tiempo_espera_erlang_c_min(llegadas_h, mu, servidores))
        nivel_servicio = float(
            1.0 - p_esp * math.exp(-(servidores * mu - llegadas_h) * meta_espera_min / 60.0)
        )
    else:
        espera_min = None
        nivel_servicio = 0.0
    return {
        "estable": estable,
        "espera_min": espera_min,
        "nivel_servicio": nivel_servicio,
        "ocupacion_pct": float(ocupacion_pct),
    }


def dimensionar_jornada_con_pronostico(
    optimizacion_base: dict[str, Any],
    servicio: str,
    pred_p10: float,
    pred_p50: float,
    pred_p90: float,
    fecha: str | None = None,
    dia_semana: int | None = None,
    turnos: dict[str, Any] | None = None,
    tiempo_servicio_min: float = 20.0,
    meta_espera_min: float = 15.0,
    dotacion_habitual: int | None = None,
    dotacion_alternativa: int | None = None,
    alerta: str | None = None,
    llegadas_reales: int | None = None,
) -> dict[str, Any]:
    """Acopla pronóstico diario (p10/p50/p90) con perfiles de franja y Erlang C paramétrico."""
    erlang = optimizacion_base["erlang_c"]
    if servicio not in erlang["servicios"]:
        raise ValueError("Servicio no disponible para optimización.")
    if dotacion_habitual is not None and (
        isinstance(dotacion_habitual, bool) or dotacion_habitual < 1
    ):
        raise ValueError("La dotación habitual debe ser un entero >= 1.")
    if dotacion_alternativa is not None and (
        isinstance(dotacion_alternativa, bool) or dotacion_alternativa < 1
    ):
        raise ValueError("La dotación alternativa debe ser un entero >= 1.")

    valores = [float(pred_p10), float(pred_p50), float(pred_p90)]
    if any(not math.isfinite(v) for v in valores):
        raise ValueError("El pronóstico diario debe contener valores finitos.")
    p10_v, p50_v, p90_v = sorted(max(0.0, v) for v in valores)

    if dia_semana is not None:
        dia_idx = int(dia_semana) % 7
    elif fecha is not None:
        dia_idx = int(pd.Timestamp(fecha).dayofweek) % 7
    else:
        dia_idx = 0
    dia_nombre = DIAS_SEMANA[dia_idx]

    franjas_hist = erlang["servicios"][servicio]["franjas"]
    matriz_turnos = (
        turnos[servicio].get("matriz")
        if isinstance(turnos, dict) and isinstance(turnos.get(servicio), dict)
        else None
    )
    if (
        isinstance(matriz_turnos, list)
        and len(matriz_turnos) == 4
        and all(isinstance(fila, list) and len(fila) > dia_idx for fila in matriz_turnos)
    ):
        pesos_brutos = [max(0.0, float(matriz_turnos[i][dia_idx]["estimado"])) for i in range(4)]
    else:
        pesos_brutos = [max(0.0, float(franjas_hist[i]["lambda_normal_h"])) for i in range(4)]

    suma_pesos = sum(pesos_brutos)
    pesos_franja = (
        [b / suma_pesos for b in pesos_brutos] if suma_pesos > 0 else [0.25, 0.25, 0.25, 0.25]
    )

    nivel_objetivo = float(erlang.get("nivel_servicio_objetivo", 0.80))
    franjas_salida: list[dict[str, Any]] = []

    for i, franja_nombre in enumerate(FRANJAS):
        w = float(pesos_franja[i])
        lambda_p10_h = p10_v * w / 6.0
        lambda_p50_h = p50_v * w / 6.0
        lambda_p90_h = p90_v * w / 6.0

        dim_p10 = dimensionar_erlang_c(
            lambda_p10_h, tiempo_servicio_min, meta_espera_min, nivel_objetivo
        )
        dim_p50 = dimensionar_erlang_c(
            lambda_p50_h, tiempo_servicio_min, meta_espera_min, nivel_objetivo
        )
        dim_p90 = dimensionar_erlang_c(
            lambda_p90_h, tiempo_servicio_min, meta_espera_min, nivel_objetivo
        )
        c_hist_normal = int(
            dimensionar_erlang_c(
                float(franjas_hist[i]["lambda_normal_h"]),
                tiempo_servicio_min,
                meta_espera_min,
                nivel_objetivo,
            )["servidores"]
        )

        c_hab = max(1, int(dotacion_habitual) if dotacion_habitual is not None else c_hist_normal)
        c_alt = max(
            1,
            int(dotacion_alternativa)
            if dotacion_alternativa is not None
            else int(dim_p90["servidores"]),
        )

        ev_hab_p50 = _evaluar_dotacion_fija(
            lambda_p50_h, tiempo_servicio_min, meta_espera_min, c_hab
        )
        ev_hab_p90 = _evaluar_dotacion_fija(
            lambda_p90_h, tiempo_servicio_min, meta_espera_min, c_hab
        )
        ev_alt_p50 = _evaluar_dotacion_fija(
            lambda_p50_h, tiempo_servicio_min, meta_espera_min, c_alt
        )
        ev_alt_p90 = _evaluar_dotacion_fija(
            lambda_p90_h, tiempo_servicio_min, meta_espera_min, c_alt
        )

        requiere_refuerzo = (
            c_alt > c_hab
            or not ev_hab_p90["estable"]
            or (ev_hab_p90["espera_min"] is not None and ev_hab_p90["espera_min"] > meta_espera_min)
        )
        if requiere_refuerzo and c_alt > c_hab:
            accion_franja = (
                f"Reforzar de {c_hab} a {c_alt} equipos equivalentes (+{c_alt - c_hab}) "
                "y coordinar traslados/altas previas"
            )
        elif requiere_refuerzo:
            accion_franja = (
                f"Activar contingencia sobre {c_hab} equipos equivalentes y priorizar "
                "traslados/altas matutinas para contener espera bajo p90"
            )
        else:
            accion_franja = f"Mantener dotación habitual ({c_hab} equipos equivalentes)"

        franjas_salida.append(
            {
                "franja": franja_nombre,
                "peso_franja": w,
                "lambda_prevista_p10_h": float(lambda_p10_h),
                "lambda_prevista_p50_h": float(lambda_p50_h),
                "lambda_prevista_p90_h": float(lambda_p90_h),
                "servidores_previstos_p10": int(dim_p10["servidores"]),
                "servidores_previstos_p50": int(dim_p50["servidores"]),
                "servidores_previstos_p90": int(dim_p90["servidores"]),
                "servidores_historico_normal": c_hist_normal,
                "brecha_incertidumbre_equipos": int(dim_p90["servidores"] - dim_p10["servidores"]),
                "delta_p90_previsto_vs_historico": int(dim_p90["servidores"] - c_hist_normal),
                "dotacion_habitual": c_hab,
                "dotacion_alternativa": c_alt,
                "delta_alternativa_vs_habitual": int(c_alt - c_hab),
                "espera_habitual_p50_min": ev_hab_p50["espera_min"],
                "espera_habitual_p90_min": ev_hab_p90["espera_min"],
                "cola_inestable_habitual_p90": bool(not ev_hab_p90["estable"]),
                "nivel_servicio_habitual_p90": float(ev_hab_p90["nivel_servicio"]),
                "ocupacion_habitual_p90_pct": float(ev_hab_p90["ocupacion_pct"]),
                "espera_alternativa_p50_min": ev_alt_p50["espera_min"],
                "espera_alternativa_p90_min": ev_alt_p90["espera_min"],
                "cola_inestable_alternativa_p90": bool(not ev_alt_p90["estable"]),
                "nivel_servicio_alternativa_p90": float(ev_alt_p90["nivel_servicio"]),
                "ocupacion_alternativa_p90_pct": float(ev_alt_p90["ocupacion_pct"]),
                "accion_franja": accion_franja,
            }
        )

    pico = max(franjas_salida, key=lambda f: f["lambda_prevista_p90_h"])
    franja_critica = pico["franja"]
    espera_hab_txt = (
        "cola inestable (ρ ≥ 1)"
        if pico["cola_inestable_habitual_p90"] or pico["espera_habitual_p90_min"] is None
        else f"{pico['espera_habitual_p90_min']:.1f} min"
    )
    espera_alt_txt = (
        "cola inestable (ρ ≥ 1)"
        if pico["cola_inestable_alternativa_p90"] or pico["espera_alternativa_p90_min"] is None
        else f"{pico['espera_alternativa_p90_min']:.1f} min"
    )
    decision_recomendada = (
        f"Franja crítica {franja_critica} ({pico['lambda_prevista_p90_h']:.1f} llegadas/h en p90; "
        f"demanda diaria p50={p50_v:.0f}, rango p10–p90={p10_v:.0f}–{p90_v:.0f}). "
        f"Comparación paramétrica: {pico['dotacion_habitual']} equipos habituales "
        f"({espera_hab_txt}) frente a {pico['dotacion_alternativa']} en alternativa "
        f"({espera_alt_txt}); sensibilidad por incertidumbre de "
        f"{pico['brecha_incertidumbre_equipos']} equipos. "
        "Coordinar traslados tempranos y adelantar altas elegibles en Hospitalización."
    )
    requisitos_validacion_hospital = [
        "Validar dotación real y capacidad habilitada por turno, pues OMOP no contiene tabla de "
        "plantilla ni camas físicas asignadas por franja.",
        "Medir tiempo clínico real de atención (1/μ) por equipo equivalente y verificar la "
        "estacionariedad de llegadas frente al supuesto paramétrico M/M/c.",
        "Instrumentar en el HIS los tres sellos temporales: hora_decision_hospitalizar, "
        "hora_asignacion_cama y hora_traslado_efectivo para separar boarding clínico del salto "
        "administrativo OMOP.",
    ]
    nota_metodologica = (
        "Comparación paramétrica: la dotación habitual y la alternativa son supuestos del usuario "
        "o derivados del régimen histórico base, no plantilla real observada en OMOP. La demanda "
        "diaria (p10/p50/p90) se reparte entre las 4 franjas de 6 h según pesos históricos del día "
        "de semana (suma = 1.0) y se convierte a tasa horaria (λ = Demanda × peso / 6). "
        "Cuando ρ ≥ 1 la espera se reporta como None (cola inestable). Cualquier valor en "
        "llegadas_reales_observadas es solo contraste retrospectivo y no alimenta el pronóstico."
    )

    return {
        "fecha": fecha,
        "dia_semana": dia_nombre,
        "servicio": servicio,
        "tipo_comparacion": "parametrica",
        "origen_dotacion_habitual": "usuario"
        if dotacion_habitual is not None
        else "regimen_historico_normal",
        "origen_dotacion_alternativa": "usuario"
        if dotacion_alternativa is not None
        else "requerimiento_p90_previsto",
        "pronostico_diario": {
            "p10": float(p10_v),
            "p50": float(p50_v),
            "p90": float(p90_v),
            "alerta": alerta,
            "llegadas_reales_observadas": int(llegadas_reales)
            if llegadas_reales is not None
            else None,
        },
        "franja_critica": franja_critica,
        "franjas": franjas_salida,
        "decision_recomendada": decision_recomendada,
        "requisitos_validacion_hospital": requisitos_validacion_hospital,
        "nota_metodologica": nota_metodologica,
    }


def reporte_markdown(base: dict) -> str:
    """Reporte reproducible de resultados y limitaciones, con tablas de sensibilidad."""
    lineas = ["# Optimización operacional", "", "## Erlang C", "", NOTA_ERLANG, ""]
    for servicio in base["erlang_c"]["servicios"].values():
        lineas += [
            f"### {servicio['nombre']}",
            "",
            f"Fuente: {servicio['fuente']}.",
            "",
            "| Franja | λ normal/h | λ p75/h | λ p90/h | c normal | c p75 | c p90 "
            "| Espera p90 (min) |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
        for f in servicio["franjas"]:
            lineas.append(
                f"| {f['franja']} | {f['lambda_normal_h']:.3f} | {f['lambda_p75_h']:.3f} | "
                f"{f['lambda_p90_h']:.3f} | {f['servidores_normal']} | {f['servidores_p75']} | "
                f"{f['servidores_p90']} | {f['espera_esperada_p90_min']:.3f} |"
            )
        lineas += [
            "",
            "| 1/mu (min) | Franja pico | c normal | c p75 | c p90 | Δ p90 |",
            "|---:|---|---:|---:|---:|---:|",
        ]
        for f in servicio["sensibilidad"]:
            lineas.append(
                f"| {f['tiempo_servicio_min']} | {f['franja_pico']} | "
                f"{f['servidores_normal']} | {f['servidores_p75']} | "
                f"{f['servidores_p90']} | {f['delta_p90']} |"
            )
        lineas.append("")
    little = base["ley_little_camas"]
    lineas += ["## Ley de Little y altas matutinas", "", little["nota_metodologica"], ""]
    for k in (
        "ingresos_dia_promedio",
        "estancia_media_horas",
        "estancia_mediana_horas",
        "censo_teorico_little",
        "censo_medio_observado",
        "censo_mediana_observada",
        "umbral_p75",
        "umbral_p90",
        "pct_horas_rojo_base",
    ):
        v = little[k]
        lineas.append(f"- {k}: {v:.4f}" if v is not None else f"- {k}: no disponible")
    lineas += [
        "",
        "L = ingresos/día × estancia media (horas) / 24. No equivale a camas "
        "físicas ni a capacidad instalada.",
        "",
        "| Reducción (h) | Nueva media (h) | Camas medias liberadas | Reducción (%) |",
        "|---:|---:|---:|---:|",
    ]
    for e in little["escenarios_estancia"]:
        lineas.append(
            f"| {e['reduccion_horas']:.0f} | {e['nueva_estancia_media_horas']:.3f} | "
            f"{e['camas_liberadas']:.3f} | {e['reduccion_pct_censo']:.3f} |"
        )
    lineas += [
        "",
        "| Altas adelantadas (%) | Pico base | Pico simulado | Camas pico liberadas "
        "| Horas rojas base (%) | Horas rojas simuladas (%) | Reducción roja relativa (%) |",
        "|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for e in little["escenarios_altas_tempranas"]:
        lineas.append(
            "| "
            + " | ".join(
                f"{e[k]:.3f}"
                for k in (
                    "pct_altas_adelantadas",
                    "censo_pico_base",
                    "censo_pico_simulado",
                    "camas_pico_liberadas",
                    "pct_horas_rojo_base",
                    "pct_horas_rojo_simulado",
                    "reduccion_horas_rojo_pct",
                )
            )
            + " |"
        )
    lineas += ["", "## Urgencias → Hospitalización", "", NOTA_TRANSICIONES, ""]
    for k, v in base["cuello_urgencias_hospitalizacion"].items():
        if k not in ("nota_metodologica", "mensual"):
            lineas.append(f"- {k}: {v}")
    lineas += ["", "## Recomendaciones cuantificadas", ""]
    for r in base["recomendaciones"]:
        lineas += [
            f"### {r['id']}: {r['titulo']}",
            "",
            r["accion"],
            "",
            r["impacto_cuantificado"],
            "",
            f"Horizonte: {r['horizonte']}.",
            "",
        ]
    demo = base.get("demo_decision_jornada")
    if not demo:
        demo = dimensionar_jornada_con_pronostico(
            base,
            servicio="urgencias",
            pred_p10=418.0,
            pred_p50=488.0,
            pred_p90=600.0,
            fecha="2026-07-06",
            dotacion_habitual=12,
            alerta="verde",
            llegadas_reales=526,
        )
    lineas += [
        "## Decisión de principio a fin con pronóstico acoplado (Etapa 1)",
        "",
        demo["nota_metodologica"],
        "",
        f"- jornada_demostrada: {demo['fecha']} ({demo['dia_semana']})",
        f"- servicio: {demo['servicio']}",
        f"- tipo_comparacion: {demo['tipo_comparacion']}",
        f"- pronostico_diario_p10_p50_p90: {demo['pronostico_diario']['p10']:.0f} / "
        f"{demo['pronostico_diario']['p50']:.0f} / {demo['pronostico_diario']['p90']:.0f}",
        f"- llegadas_reales_observadas_contraste: "
        f"{demo['pronostico_diario']['llegadas_reales_observadas']}",
        f"- franja_critica: {demo['franja_critica']}",
        "",
        "| Franja | Peso | λ prevista p10/p50/p90 (/h) | c req p10/p50/p90 | Brecha inc. "
        "| Dot. habitual → alt. | Espera hab. p50 / p90 (min) | Espera alt. p50 / p90 (min) |",
        "|---|---:|---|---:|---:|---:|---|---|",
    ]
    for f in demo["franjas"]:
        esp_hab_p50 = (
            "inestable (ρ≥1)"
            if f["espera_habitual_p50_min"] is None
            else f"{f['espera_habitual_p50_min']:.2f}"
        )
        esp_hab_p90 = (
            "inestable (ρ≥1)"
            if f["cola_inestable_habitual_p90"] or f["espera_habitual_p90_min"] is None
            else f"{f['espera_habitual_p90_min']:.2f}"
        )
        esp_alt_p50 = (
            "inestable (ρ≥1)"
            if f["espera_alternativa_p50_min"] is None
            else f"{f['espera_alternativa_p50_min']:.2f}"
        )
        esp_alt_p90 = (
            "inestable (ρ≥1)"
            if f["cola_inestable_alternativa_p90"] or f["espera_alternativa_p90_min"] is None
            else f"{f['espera_alternativa_p90_min']:.2f}"
        )
        lineas.append(
            f"| {f['franja']} | {100 * f['peso_franja']:.1f}% | "
            f"{f['lambda_prevista_p10_h']:.2f} / {f['lambda_prevista_p50_h']:.2f} / "
            f"{f['lambda_prevista_p90_h']:.2f} | "
            f"{f['servidores_previstos_p10']} / {f['servidores_previstos_p50']} / "
            f"{f['servidores_previstos_p90']} | {f['brecha_incertidumbre_equipos']} | "
            f"{f['dotacion_habitual']} → {f['dotacion_alternativa']} | "
            f"{esp_hab_p50} / {esp_hab_p90} | {esp_alt_p50} / {esp_alt_p90} |"
        )
    lineas += [
        "",
        f"**Decisión recomendada del turno:** {demo['decision_recomendada']}",
        "",
        "### Hoja de ruta de decisión anticipada (Urgencias → Hospitalización)",
        "",
        "| Etapa | Qué construir | Qué demostrar | Estado en MediFlow |",
        "|---|---|---|---|",
        (
            "| 1. Pronóstico que alimenta decisiones | Reutilizar el LightGBM existente. Repartir "
            "la demanda diaria prevista por franjas con perfiles históricos y pasar escenarios de "
            "demanda típica y alta al dimensionamiento. | Cuándo cambia el requerimiento de "
            "equipos y qué tan sensible es a la incertidumbre del pronóstico. | Implementado "
            "(`dimensionar_jornada_con_pronostico`, `POST /api/optimizacion/simular`, UI y chat) |"
        ),
        (
            "| 2. Simulador del recorrido | Incorporar capacidad habilitada, dotación, tiempos de "
            "atención y marcas de decisión y traslado. Reconstruir el censo con stock inicial y "
            "comparar escenarios con restricciones reales. | Qué alternativa reduce la espera de "
            "traslado o las horas de presión, a qué costo y bajo qué supuestos. | Diseño "
            "paramétrico; requiere 3 marcas HIS (`hora_decision_hospitalizar`, "
            "`hora_asignacion_cama`, `hora_traslado_efectivo`) |"
        ),
        (
            "| 3. Piloto prospectivo | Ejecutar MediFlow en paralelo con la operación habitual. "
            "Registrar alertas, recomendaciones y resultados observados antes de probar una "
            "intervención supervisada. | Si las alertas llegan con suficiente anticipación, si el "
            "equipo puede actuar y si el beneficio estimado se sostiene en la práctica. | "
            "Propuesto para validación operativa en sombra en el HUN |"
        ),
        "",
        "## Alcance",
        "",
        "Resultados históricos agregados, no promesas de impacto. "
        "El simulador mantiene tasas fijas y usa interpolación explícita para porcentajes "
        "de altas no precalculados. Las series horarias etapas_entradas_por_hora y "
        "etapas_salidas_por_hora ya excluyen estancias superiores al percentil p99.9 por "
        "etapa (14/15_etapas_*.sql). Validar con datos clínicos y capacidad real antes de "
        "decidir dotaciones.",
        "",
    ]
    return "\n".join(lineas)


def main() -> None:
    """Genera el informe únicamente cuando existen los agregados reales requeridos."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    requeridos = (
        "entradas_por_hora",
        "etapas_entradas_por_hora",
        "etapas_salidas_por_hora",
        "duracion_etapas_diaria",
        "duracion_etapas_percentiles",
        "transiciones_etapas",
    )
    if not all((config.RAW_DIR / f"{n}.parquet").exists() for n in requeridos):
        parser.error("Faltan agregados reales en data/raw; no se genera un informe ficticio.")
    base = construir_resumen_optimizacion()
    ruta = config.ROOT_DIR / "docs/resultados/optimizacion.md"
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(reporte_markdown(base), encoding="utf-8")
    print(f"Informe real generado: {ruta}")


if __name__ == "__main__":
    main()
