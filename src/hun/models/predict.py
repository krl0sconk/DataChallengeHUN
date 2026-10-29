"""Contrato canónico modelo–web para predicción de llegadas hospitalarias.

Define la interfaz pública `predecir()` acordada para consumo de la aplicación web
y dashboards del Hospital Universidad del Norte (HUN), documentada en AI.md sección 6.
Integra modelos LightGBM por cuantiles (p10, p50, p90), corrección de cuantiles cruzados
y explicabilidad SHAP agregada por factores clínicos y contextuales con datos 100 % reales.
"""

from __future__ import annotations

import logging
import unicodedata
from datetime import date, timedelta
from typing import Any, Literal

import holidays
import joblib
import numpy as np
import pandas as pd

from hun import config
from hun.data.agregados import agrupar_bajo_volumen, fecha_corte, serie_llegadas
from hun.models.demanda import (
    GRUPOS_ACEPTADOS,
    columnas_por_grupos,
    construir_features_demanda,
)
from hun.models.explicacion import (
    corregir_cuantiles_cruzados,
    entrenar_modelos_cuantiles,
    explicar_prediccion_shap,
    predecir_intervalos,
)

log = logging.getLogger("predict")

# Concept IDs OMOP y nombres normalizados de servicios principales
SERVICIOS_CANONICOS: dict[str, str] = {
    "urgencias": "urgencias",
    "emergency room visit": "urgencias",
    "9203": "urgencias",
    "rehabilitacion": "rehabilitacion",
    "rehabilitacion ambulatoria": "rehabilitacion",
    "ambulatory rehabilitation visit": "rehabilitacion",
    "581479": "rehabilitacion",
    "tratamiento_urgencia": "tratamiento_urgencia",
    "tratamiento urgencia": "tratamiento_urgencia",
    "urgencia-tratamiento": "tratamiento_urgencia",
    "treatment urgency": "tratamiento_urgencia",
    "3045729": "tratamiento_urgencia",
    "otros": "otros",
    "hospitalizacion": "otros",
    "inpatient visit": "otros",
    "9201": "otros",
}

CANONICO_A_SERIE: dict[str, int] = {
    "urgencias": 9203,
    "rehabilitacion": 581479,
    "tratamiento_urgencia": 3045729,
    "otros": -1,
}

SERIE_A_CANONICO: dict[int, str] = {
    9203: "urgencias",
    581479: "rehabilitacion",
    3045729: "tratamiento_urgencia",
    -1: "otros",
}

SERIE_A_COD: dict[int, int] = {
    -1: 0,
    9203: 1,
    581479: 2,
    3045729: 3,
}

# Parámetros operativos históricos por servicio (base de estimación y semáforo)
# Calculados directamente sobre las llegadas diarias observadas
PARAMETROS_SERVICIO: dict[str, dict[str, Any]] = {
    "urgencias": {
        "media_diaria": 462,
        "p10_ratio": 0.74,
        "p90_ratio": 1.28,
        "umbral_p75": 526,
        "umbral_p90": 592,
    },
    "rehabilitacion": {
        "media_diaria": 842,
        "p10_ratio": 0.05,
        "p90_ratio": 1.70,
        "umbral_p75": 1298,
        "umbral_p90": 1432,
    },
    "tratamiento_urgencia": {
        "media_diaria": 14,
        "p10_ratio": 0.29,
        "p90_ratio": 1.86,
        "umbral_p75": 18,
        "umbral_p90": 26,
    },
    "otros": {
        "media_diaria": 1,
        "p10_ratio": 0.0,
        "p90_ratio": 2.0,
        "umbral_p75": 2,
        "umbral_p90": 4,
    },
}

_EXTERNOS_DF: pd.DataFrame | None = None
_EXTERNOS_CARGADO: bool = False

_BUNDLE_CACHE: dict[str, Any] | None = None
_BUNDLE_CARGADO: bool = False


def _obtener_externos_cache() -> pd.DataFrame | None:
    """Carga perezosamente los factores externos desde `data/externos.parquet`."""
    global _EXTERNOS_DF, _EXTERNOS_CARGADO
    if not _EXTERNOS_CARGADO:
        _EXTERNOS_CARGADO = True
        ruta_externos = config.DATA_DIR / "externos.parquet"
        if ruta_externos.exists():
            try:
                df = pd.read_parquet(ruta_externos)
                if "fecha" in df.columns:
                    df["_fecha_dt"] = pd.to_datetime(df["fecha"]).dt.date
                    _EXTERNOS_DF = df.drop_duplicates(subset=["_fecha_dt"]).set_index("_fecha_dt")
                elif isinstance(df.index, pd.DatetimeIndex):
                    df["_fecha_dt"] = df.index.date
                    _EXTERNOS_DF = df.drop_duplicates(subset=["_fecha_dt"]).set_index("_fecha_dt")
            except Exception as e:
                log.warning("No se pudo cargar externos.parquet en predict: %s", e)
                _EXTERNOS_DF = None
    return _EXTERNOS_DF


def _generar_turnos(entradas_filt: pd.DataFrame) -> dict[str, Any]:
    """Calcula la matriz real de pacientes promedio por turno horario y día de semana."""
    df = entradas_filt.copy()
    df["hora_dt"] = pd.to_datetime(df["hora"])
    df["fecha"] = df["hora_dt"].dt.normalize()
    df["h"] = df["hora_dt"].dt.hour
    df["dia_semana"] = df["hora_dt"].dt.day_of_week

    def asignar_franja(h: int) -> str:
        if 6 <= h < 12:
            return "Mañana (06-12h)"
        if 12 <= h < 18:
            return "Tarde (12-18h)"
        if 18 <= h < 24:
            return "Noche (18-24h)"
        return "Madrugada (00-06h)"

    df["franja"] = df["h"].apply(asignar_franja)
    franjas = ["Mañana (06-12h)", "Tarde (12-18h)", "Noche (18-24h)", "Madrugada (00-06h)"]
    dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    mapping_sid = {
        "urgencias": 9203,
        "rehabilitacion": 581479,
        "tratamiento_urgencia": 3045729,
    }

    resultado: dict[str, Any] = {}
    for sid, cid in mapping_sid.items():
        sub = df[df["visit_concept_id"] == cid]
        agrup = sub.groupby(["fecha", "dia_semana", "franja"])["entradas"].sum().reset_index()
        prom = agrup.groupby(["dia_semana", "franja"])["entradas"].mean().to_dict()
        media_diaria = (
            float(agrup.groupby("fecha")["entradas"].sum().mean()) if len(agrup) > 0 else 100.0
        )
        media_franja = max(1.0, media_diaria / 4.0)

        matriz = []
        for f in franjas:
            fila = []
            for d_idx, d in enumerate(dias):
                estimado = int(round(prom.get((d_idx, f), 0.0)))
                ratio = float(round(estimado / media_franja, 2))
                if ratio > 1.25:
                    nivel = "rojo"
                elif ratio >= 0.85:
                    nivel = "amarillo"
                else:
                    nivel = "verde"
                fila.append(
                    {
                        "dia": d,
                        "franja": f,
                        "estimado": estimado,
                        "ratio": ratio,
                        "nivel": nivel,
                    }
                )
            matriz.append(fila)

        resultado[sid] = {"servicio": sid, "franjas": franjas, "dias": dias, "matriz": matriz}

    return resultado


def _generar_ocupacion(serie: pd.DataFrame) -> list[dict[str, Any]]:
    """Genera la comparativa de ocupación y alerta con base en las series diarias observadas."""
    nombres_visibles = {
        "urgencias": ("Urgencias", "Urgencias", "OMOP 9203"),
        "rehabilitacion": ("Rehabilitación Ambulatoria", "Rehabilitación", "OMOP 581479"),
        "tratamiento_urgencia": ("Tratamiento Urgencias", "Tratamiento Urg.", "OMOP 3045729"),
    }
    resultado = []
    for sid, (nombre_completo, nombre_corto, codigo) in nombres_visibles.items():
        s_id = CANONICO_A_SERIE[sid]
        sub = serie[serie["serie"] == s_id]["y"]
        if len(sub) > 0:
            media = int(round(float(sub.mean())))
            p75 = int(round(float(np.percentile(sub, 75))))
            p90 = int(round(float(np.percentile(sub, 90))))
        else:
            p = PARAMETROS_SERVICIO[sid]
            media, p75, p90 = p["media_diaria"], p["umbral_p75"], p["umbral_p90"]

        ocupacion_pct = int(round((media / max(1, p90)) * 100))
        alerta_pct = int(round((p75 / max(1, p90)) * 100))
        estado = "rojo" if media > p90 else ("amarillo" if media >= p75 else "verde")

        resultado.append(
            {
                "id": sid,
                "nombreCompleto": nombre_completo,
                "nombreCorto": nombre_corto,
                "codigo": codigo,
                "mediaDiaria": media,
                "p75": p75,
                "p90": p90,
                "ocupacion": ocupacion_pct,
                "alertaPct": alerta_pct,
                "estado": estado,
            }
        )
    return resultado


def _obtener_bundle_modelo() -> dict[str, Any] | None:
    """Carga de memoria o disco (o construye perezosamente) los modelos reales entrenados."""
    global _BUNDLE_CACHE, _BUNDLE_CARGADO
    if _BUNDLE_CARGADO:
        return _BUNDLE_CACHE

    bundle_path = config.PROCESSED_DIR / "modelos_web_bundle.joblib"
    if bundle_path.exists():
        try:
            _BUNDLE_CACHE = joblib.load(bundle_path)
            _BUNDLE_CARGADO = True
            log.info("Bundle de modelos cargado desde %s", bundle_path)
            return _BUNDLE_CACHE
        except Exception as e:
            log.warning("No se pudo cargar %s: %s. Reconstruyendo bundle...", bundle_path, e)

    entradas_path = config.RAW_DIR / "entradas_por_hora.parquet"
    externos_path = config.DATA_DIR / "externos.parquet"
    if not entradas_path.exists():
        log.warning("Archivo %s no encontrado para construir bundle", entradas_path)
        _BUNDLE_CARGADO = True
        return None

    try:
        log.info("Entrenando bundle de modelos web con datos reales de entradas_por_hora...")
        entradas = pd.read_parquet(entradas_path)
        externos = pd.read_parquet(externos_path) if externos_path.exists() else None
        corte = fecha_corte(entradas)
        entradas_filt = entradas[pd.to_datetime(entradas["hora"]) < corte].copy()
        serie = agrupar_bajo_volumen(serie_llegadas(entradas_filt, freq="D"), min_por_dia=1.0)

        ext_cols = list(externos.columns) if externos is not None else []
        cols = columnas_por_grupos(ext_cols, grupos_incluidos=GRUPOS_ACEPTADOS)
        df_feat = construir_features_demanda(serie, externos)
        modelos_q = entrenar_modelos_cuantiles(df_feat, cols)
        modelo_p50 = modelos_q[0.50]

        lookup_y = {
            (int(r["serie"]), r["ts"].date()): int(round(r["y"])) for _, r in serie.iterrows()
        }

        max_ts = serie["ts"].max()
        ultimas_8s = serie[serie["ts"] >= max_ts - pd.Timedelta(weeks=8)]
        medianas_dw = (
            ultimas_8s.groupby(["serie", ultimas_8s["ts"].dt.day_of_week])["y"].median().to_dict()
        )
        for k, v in (
            serie.groupby(["serie", serie["ts"].dt.day_of_week])["y"].median().to_dict().items()
        ):
            if k not in medianas_dw:
                medianas_dw[k] = v

        turnos = _generar_turnos(entradas_filt)
        ocupacion = _generar_ocupacion(serie)

        bundle = {
            "modelos_q": modelos_q,
            "modelo_p50": modelo_p50,
            "cols": cols,
            "lookup_y": lookup_y,
            "medianas_dw": medianas_dw,
            "turnos": turnos,
            "ocupacion": ocupacion,
            "externos_df": externos,
        }

        try:
            bundle_path.parent.mkdir(parents=True, exist_ok=True)
            joblib.dump(bundle, bundle_path)
            log.info("Bundle de modelos persistido en %s", bundle_path)
        except Exception as e:
            log.warning("No se pudo escribir %s: %s", bundle_path, e)

        _BUNDLE_CACHE = bundle
        _BUNDLE_CARGADO = True
        return _BUNDLE_CACHE
    except Exception as exc:
        log.error("Error al construir bundle de modelos reales: %s", exc)
        _BUNDLE_CARGADO = True
        return None


def _construir_fila_fecha(f: date, s_id: int, bundle: dict[str, Any]) -> pd.DataFrame:
    """Construye un DataFrame de 1 fila con los features requeridos para (serie_id, fecha)."""
    lookup_y = bundle["lookup_y"]
    medianas_dw = bundle["medianas_dw"]
    cols = bundle["cols"]
    externos = bundle.get("externos_df")

    f_ts = pd.Timestamp(f)
    dw = f_ts.day_of_week

    lags: dict[str, float] = {}
    for d in (7, 14, 21, 28, 35, 42, 49, 56):
        lag_date = f - timedelta(days=d)
        val = lookup_y.get((s_id, lag_date))
        if val is None or pd.isna(val):
            val = medianas_dw.get((s_id, lag_date.weekday()), 0.0)
        lags[f"llegadas_lag_{d}"] = float(val)

    lag_4s = [lags[f"llegadas_lag_{d}"] for d in (7, 14, 21, 28)]
    lag_8s = [lags[f"llegadas_lag_{d}"] for d in (7, 14, 21, 28, 35, 42, 49, 56)]
    rezago_prom_4s = float(np.mean(lag_4s))
    rezago_mediana_8s = float(np.median(lag_8s))

    row_dict: dict[str, Any] = {
        "ts": f_ts,
        "fecha": f_ts.normalize(),
        "serie": s_id,
        "serie_cod": SERIE_A_COD.get(s_id, 0),
        "dia_semana": dw,
        "mes": f_ts.month,
        "dia_anio": f_ts.day_of_year,
        "sin_dia_anio": float(np.sin(2 * np.pi * f_ts.day_of_year / 365.25)),
        "cos_dia_anio": float(np.cos(2 * np.pi * f_ts.day_of_year / 365.25)),
        "es_fin_de_semana": int(dw >= 5),
        "sin_dia_semana": float(np.sin(2 * np.pi * dw / 7.0)),
        "cos_dia_semana": float(np.cos(2 * np.pi * dw / 7.0)),
        "rezago_prom_4s": rezago_prom_4s,
        "rezago_mediana_8s": rezago_mediana_8s,
        **lags,
    }

    if externos is not None:
        if "fecha" in externos.columns:
            ext_sub = externos[externos["fecha"] == f_ts]
            if len(ext_sub) > 0:
                for col in ext_sub.columns:
                    if col not in row_dict:
                        row_dict[col] = ext_sub.iloc[0][col]
        elif f in externos.index:
            ext_row = externos.loc[f]
            for col in externos.columns:
                if col not in row_dict:
                    row_dict[col] = ext_row[col]

    # Asignar valores por defecto para festivos si externos no estaba presente
    if "es_festivo" not in row_dict:
        co_h = holidays.Colombia(years=[f.year])
        row_dict["es_festivo"] = int(f in co_h)
    if "es_dia_no_laboral" not in row_dict:
        row_dict["es_dia_no_laboral"] = int(dw >= 5 or row_dict.get("es_festivo", 0) == 1)
    if "dia_post_festivo" not in row_dict:
        co_h = holidays.Colombia(years=[f.year])
        ayer = f - timedelta(days=1)
        row_dict["dia_post_festivo"] = int(ayer in co_h)
    if "es_puente" not in row_dict:
        row_dict["es_puente"] = int(row_dict.get("es_festivo", 0) == 1 and dw == 0)

    for col in cols:
        if col not in row_dict:
            row_dict[col] = 0

    return pd.DataFrame([row_dict])


def _limpiar_texto(texto: str) -> str:
    """Elimina tildes y caracteres especiales para comparación insensible."""
    texto_norm = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in texto_norm if not unicodedata.combining(c)).strip().lower()


def normalizar_servicio(servicio: str) -> str:
    """Convierte cualquier variante de nombre o concept_id al servicio canónico.

    Args:
        servicio: Nombre o código de servicio (ej: 'Urgencias', '9203').

    Returns:
        Identificador canónico ('urgencias', 'rehabilitacion', 'tratamiento_urgencia', 'otros').
    """
    limpio = _limpiar_texto(servicio)
    if limpio in SERVICIOS_CANONICOS:
        return SERVICIOS_CANONICOS[limpio]

    for clave, valor in SERVICIOS_CANONICOS.items():
        if clave in limpio:
            return valor

    return "otros"


def _determinar_alerta(
    prediccion: int, servicio_canonico: str
) -> Literal["verde", "amarillo", "rojo"]:
    """Determina el nivel de alerta según umbrales percentiles del servicio."""
    params = PARAMETROS_SERVICIO.get(servicio_canonico, PARAMETROS_SERVICIO["otros"])
    if prediccion > params["umbral_p90"]:
        return "rojo"
    if prediccion >= params["umbral_p75"]:
        return "amarillo"
    return "verde"


def predecir(
    fecha: date,
    servicio: str,
    *,
    modelos_cuantiles: dict[float, Any] | None = None,
    modelo_explicador: Any | None = None,
    X_fecha: pd.DataFrame | None = None,
    columnas: list[str] | None = None,
) -> dict[str, Any]:
    """Devuelve la predicción de llegadas para un servicio en una fecha.

    Cumple estrictamente con el contrato modelo–web estipulado en AI.md sección 6.
    Por defecto, ejecuta el modelo LightGBM por cuantiles (p10, p50, p90) entrenado con
    datos reales del hospital y calcula los aportes SHAP con `TreeExplainer`.

    Args:
        fecha: Fecha objetivo para la cual se pronostica la demanda.
        servicio: Nombre del servicio o visit_concept_id.
        modelos_cuantiles: Diccionario opcional de modelos entrenados para p10, p50 y p90.
        modelo_explicador: Modelo opcional para descomposición SHAP de la fecha.
        X_fecha: DataFrame opcional con features de la fecha a predecir.
        columnas: Columnas requeridas por los modelos opcionales.

    Returns:
        Diccionario con la siguiente estructura:
            - prediccion (int): Mediana pronosticada (p50).
            - min (int): Límite inferior del intervalo de confianza (p10).
            - max (int): Límite superior del intervalo de confianza (p90).
            - alerta (str): Nivel de saturación ('verde' | 'amarillo' | 'rojo').
            - factores (list[tuple[str, float]]): Aportes de variables ordenados por magnitud.
    """
    servicio_canonico = normalizar_servicio(servicio)
    params = PARAMETROS_SERVICIO[servicio_canonico]
    base = params["media_diaria"]

    # Modo 1 Custom: Si el llamador provee explícitamente modelos y fila de features
    if modelos_cuantiles is not None and X_fecha is not None and columnas is not None:
        df_int = predecir_intervalos(modelos_cuantiles, X_fecha, columnas)
        p10_raw = float(df_int["pred_p10"].iloc[0])
        p50_raw = float(df_int["pred_p50"].iloc[0])
        p90_raw = float(df_int["pred_p90"].iloc[0])

        p10_c, p50_c, p90_c = corregir_cuantiles_cruzados(p10_raw, p50_raw, p90_raw)
        p10_val = max(0, int(round(float(p10_c[0] if hasattr(p10_c, "__len__") else p10_c))))
        p50_val = max(0, int(round(float(p50_c[0] if hasattr(p50_c, "__len__") else p50_c))))
        p90_val = max(0, int(round(float(p90_c[0] if hasattr(p90_c, "__len__") else p90_c))))

        p10_val = min(p10_val, p50_val)
        p90_val = max(p90_val, p50_val)

        factores: list[tuple[str, float]] = []
        if modelo_explicador is not None:
            exps = explicar_prediccion_shap(
                modelo_explicador, X_fecha, columnas, top_k=5, excluir_servicio=True
            )
            if exps:
                factores = exps[0]

        alerta = _determinar_alerta(p50_val, servicio_canonico)
        return {
            "prediccion": p50_val,
            "min": p10_val,
            "max": p90_val,
            "alerta": alerta,
            "factores": factores,
        }

    # Modo 1 Bundle Real: Utilizar LightGBM cuantiles y SHAP entrenados con datos reales
    bundle = _obtener_bundle_modelo()
    if bundle is not None:
        try:
            s_id = CANONICO_A_SERIE.get(servicio_canonico, -1)
            row_df = _construir_fila_fecha(fecha, s_id, bundle)
            cols = bundle["cols"]

            preds = predecir_intervalos(bundle["modelos_q"], row_df, cols)
            p10_raw = float(preds["pred_p10"].iloc[0])
            p50_raw = float(preds["pred_p50"].iloc[0])
            p90_raw = float(preds["pred_p90"].iloc[0])

            p10_c, p50_c, p90_c = corregir_cuantiles_cruzados(p10_raw, p50_raw, p90_raw)
            p10_val = max(0, int(round(float(p10_c[0] if hasattr(p10_c, "__len__") else p10_c))))
            p50_val = max(0, int(round(float(p50_c[0] if hasattr(p50_c, "__len__") else p50_c))))
            p90_val = max(0, int(round(float(p90_c[0] if hasattr(p90_c, "__len__") else p90_c))))

            p10_val = min(p10_val, p50_val)
            p90_val = max(p90_val, p50_val)

            exps = explicar_prediccion_shap(
                bundle["modelo_p50"], row_df, cols, top_k=5, excluir_servicio=True
            )
            factores_shap = exps[0] if exps else []

            alerta = _determinar_alerta(p50_val, servicio_canonico)
            return {
                "prediccion": p50_val,
                "min": p10_val,
                "max": p90_val,
                "alerta": alerta,
                "factores": factores_shap,
            }
        except Exception as exc:
            log.warning("Fallo en predicción con bundle real: %s. Aplicando Modo 2...", exc)

    # Modo 2 Fallback: Estimación enriquecida con calendario y factores externos
    ext_df = _obtener_externos_cache()
    fila_ext = ext_df.loc[fecha] if (ext_df is not None and fecha in ext_df.index) else None

    dia_semana = fecha.weekday()  # 0=Lunes, 6=Domingo

    if fila_ext is not None:
        es_festivo = int(fila_ext.get("es_festivo", 0))
        es_vacaciones = int(fila_ext.get("es_vacaciones_escolares", 0))
        es_navidad = int(fila_ext.get("temporada_navidad", 0))
        es_carnaval = int(fila_ext.get("es_carnaval", 0))
        es_semana_santa = int(fila_ext.get("es_semana_santa", 0))
        es_dia_pago = int(fila_ext.get("es_dia_pago", 0))
    else:
        co_h = holidays.Colombia(years=[fecha.year])
        es_festivo = int(fecha in co_h)
        es_vacaciones = int(fecha.month in (6, 7, 12))
        es_navidad = int(
            (fecha.month == 12 and fecha.day >= 7) or (fecha.month == 1 and fecha.day <= 6)
        )
        es_carnaval = 0
        es_semana_santa = 0
        es_dia_pago = int(fecha.day in (15, 30, 31))

    factores_dict: dict[str, float] = {}

    if servicio_canonico == "urgencias":
        if dia_semana == 0:
            factores_dict["Día de la semana"] = round(base * 0.08, 1)
        elif dia_semana in (5, 6):
            factores_dict["Día de la semana"] = round(base * 0.05, 1)
        if es_festivo:
            factores_dict["Festivo"] = round(base * 0.06, 1)
        if es_vacaciones or es_navidad:
            factores_dict["Vacaciones y Navidad"] = round(base * 0.04, 1)
        if es_carnaval or es_semana_santa:
            factores_dict["Carnaval y Semana Santa"] = round(base * 0.10, 1)
        if es_dia_pago:
            factores_dict["Quincena"] = round(base * 0.04, 1)

    elif servicio_canonico == "rehabilitacion":
        if dia_semana == 6:
            factores_dict["Día de la semana"] = -round(base * 0.85, 1)
        elif dia_semana == 5:
            factores_dict["Día de la semana"] = -round(base * 0.40, 1)
        if es_festivo:
            factores_dict["Festivo"] = -round(base * 0.85, 1)
        if es_vacaciones or es_navidad:
            factores_dict["Vacaciones y Navidad"] = -round(base * 0.08, 1)
        if es_dia_pago:
            factores_dict["Quincena"] = round(base * 0.02, 1)

    elif servicio_canonico == "tratamiento_urgencia":
        if dia_semana in (5, 6):
            factores_dict["Día de la semana"] = round(base * 0.05, 1)
        if es_festivo:
            factores_dict["Festivo"] = round(base * 0.05, 1)
        if es_dia_pago:
            factores_dict["Quincena"] = round(base * 0.04, 1)

    else:
        if es_dia_pago:
            factores_dict["Quincena"] = round(base * 0.04, 1)

    ajuste_total = sum(factores_dict.values())
    pred_val_raw = max(0.0, float(base + ajuste_total))
    p10_raw = float(pred_val_raw * params["p10_ratio"])
    p90_raw = float(pred_val_raw * params["p90_ratio"])

    p10_c, p50_c, p90_c = corregir_cuantiles_cruzados(p10_raw, pred_val_raw, p90_raw)

    p10_int = max(0, int(round(float(p10_c[0] if hasattr(p10_c, "__len__") else p10_c))))
    p50_int = max(0, int(round(float(p50_c[0] if hasattr(p50_c, "__len__") else p50_c))))
    p90_int = max(0, int(round(float(p90_c[0] if hasattr(p90_c, "__len__") else p90_c))))

    p10_int = min(p10_int, p50_int)
    p90_int = max(p90_int, p50_int)

    factores_tuplas = [(k, v) for k, v in factores_dict.items() if round(v, 1) != 0.0]
    factores_ordenados = sorted(factores_tuplas, key=lambda x: abs(x[1]), reverse=True)

    alerta = _determinar_alerta(p50_int, servicio_canonico)

    return {
        "prediccion": p50_int,
        "min": p10_int,
        "max": p90_int,
        "alerta": alerta,
        "factores": factores_ordenados,
    }


def predecir_rango(fecha_inicio: date, fecha_fin: date, servicio: str) -> list[dict[str, Any]]:
    """Genera predicciones diarias consecutivas dentro de un intervalo de fechas.

    Args:
        fecha_inicio: Fecha inicial del rango.
        fecha_fin: Fecha final del rango (inclusive).
        servicio: Nombre o identificador del servicio.

    Returns:
        Lista de diccionarios, cada uno con los campos del contrato más el campo 'fecha'.
    """
    resultado: list[dict[str, Any]] = []
    cursor = fecha_inicio
    while cursor <= fecha_fin:
        pred = predecir(cursor, servicio)
        pred_con_fecha = {"fecha": cursor, **pred}
        resultado.append(pred_con_fecha)
        cursor += timedelta(days=1)

    return resultado


def obtener_llegadas_reales(fecha: date, servicio: str) -> int | None:
    """Devuelve las llegadas observadas reales en `fecha` para `servicio` (o None si no existe).

    Args:
        fecha: Fecha calendario de la observación.
        servicio: Nombre o identificador del servicio.

    Returns:
        Entero con el conteo real observado de pacientes, o None si la fecha está fuera de rango.
    """
    sid = normalizar_servicio(servicio)
    s_id = CANONICO_A_SERIE.get(sid, -1)
    bundle = _obtener_bundle_modelo()
    if bundle is not None and "lookup_y" in bundle:
        return bundle["lookup_y"].get((s_id, fecha))
    return None


def obtener_turnos_reales(servicio: str) -> dict[str, Any]:
    """Calcula la matriz de afluencia por franja horaria y día de semana con datos reales.

    Args:
        servicio: Nombre o identificador del servicio.

    Returns:
        Diccionario con claves 'servicio', 'franjas', 'dias' y 'matriz' (4x7 celdas).
    """
    sid = normalizar_servicio(servicio)
    bundle = _obtener_bundle_modelo()
    if bundle is not None and "turnos" in bundle and sid in bundle["turnos"]:
        return bundle["turnos"][sid]

    # Fallback si no está disponible el bundle de datos
    params = PARAMETROS_SERVICIO.get(sid, PARAMETROS_SERVICIO["urgencias"])
    media = params["media_diaria"]

    franjas = ["Mañana (06-12h)", "Tarde (12-18h)", "Noche (18-24h)", "Madrugada (00-06h)"]
    dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    if sid == "rehabilitacion":
        pesos_franja = [0.55, 0.45, 0.0, 0.0]
        factor_dia = [1.15, 1.15, 1.15, 1.15, 1.05, 0.20, 0.0]
    elif sid == "tratamiento_urgencia":
        pesos_franja = [0.32, 0.40, 0.22, 0.06]
        factor_dia = [1.1, 1.0, 0.95, 0.95, 1.05, 1.15, 1.1]
    else:
        pesos_franja = [0.34, 0.38, 0.20, 0.08]
        factor_dia = [1.15, 1.0, 0.95, 0.95, 1.05, 1.15, 1.05]

    matriz = []
    for f_idx, franja in enumerate(franjas):
        fila = []
        for d_idx, dia in enumerate(dias):
            estimado = max(0, int(round(media * factor_dia[d_idx] * pesos_franja[f_idx])))
            ratio = float(round(estimado / max(1, (media / 4)), 2))
            if ratio > 1.25:
                nivel = "rojo"
            elif ratio >= 0.85:
                nivel = "amarillo"
            else:
                nivel = "verde"
            fila.append(
                {
                    "dia": dia,
                    "franja": franja,
                    "estimado": estimado,
                    "ratio": ratio,
                    "nivel": nivel,
                }
            )
        matriz.append(fila)

    return {"servicio": sid, "franjas": franjas, "dias": dias, "matriz": matriz}


def obtener_ocupacion_real() -> list[dict[str, Any]]:
    """Calcula la comparativa de ocupación y presión hospitalaria usando datos reales observados.

    Returns:
        Lista de diccionarios con métricas reales:
        mediaDiaria, p75, p90, ocupacion, alertaPct, estado.
    """
    bundle = _obtener_bundle_modelo()
    if bundle is not None and "ocupacion" in bundle:
        return bundle["ocupacion"]

    # Fallback si no está disponible el bundle de datos
    nombres_visibles = {
        "urgencias": ("Urgencias", "Urgencias", "OMOP 9203"),
        "rehabilitacion": ("Rehabilitación Ambulatoria", "Rehabilitación", "OMOP 581479"),
        "tratamiento_urgencia": ("Tratamiento Urgencias", "Tratamiento Urg.", "OMOP 3045729"),
    }

    resultado = []
    for sid, (nombre_completo, nombre_corto, codigo) in nombres_visibles.items():
        params = PARAMETROS_SERVICIO[sid]
        media = params["media_diaria"]
        p75 = params["umbral_p75"]
        p90 = params["umbral_p90"]

        ocupacion_pct = int(round((media / max(1, p90)) * 100))
        alerta_pct = int(round((p75 / max(1, p90)) * 100))
        estado = "rojo" if media > p90 else ("amarillo" if media >= p75 else "verde")

        resultado.append(
            {
                "id": sid,
                "nombreCompleto": nombre_completo,
                "nombreCorto": nombre_corto,
                "codigo": codigo,
                "mediaDiaria": media,
                "p75": p75,
                "p90": p90,
                "ocupacion": ocupacion_pct,
                "alertaPct": alerta_pct,
                "estado": estado,
            }
        )

    return resultado
