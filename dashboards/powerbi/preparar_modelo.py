"""Prepara el modelo estrella para Power BI a partir de las extracciones agregadas.

Lee `data/raw/*.parquet` (solo agregados, nunca filas de pacientes) y escribe tablas listas
para Power BI en `data/processed/powerbi/` (protegido por .gitignore, nunca se sube).

Uso:
    python dashboards/powerbi/preparar_modelo.py

Tablas que genera:
    dim_fecha, dim_hora, dim_etapa, dim_servicio, dim_sexo
    fact_censo_etapa_hora      censo horario por etapa + semáforo (p75 / p90)
    fact_llegadas_hora         llegadas por hora y servicio (demanda)
    fact_llegadas_perfil       llegadas diarias por servicio, sexo y grupo de edad
    fact_duracion_diaria       duración diaria de etapas (media, p50, p90)
    fact_duracion_franja       duración p50 / p90 por día de semana y hora de inicio
    fact_transiciones          paso entre etapas y espera p50 / p90 (cuellos de botella)
"""

from __future__ import annotations

import sys

import numpy as np
import pandas as pd

from hun import config
from hun.data.agregados import serie_censo_etapas, serie_llegadas
from hun.models.saturacion import calcular_calentamiento, calcular_umbrales_censo

RAW = config.RAW_DIR
OUT = config.PROCESSED_DIR / "powerbi"

DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
SEXO = {8507: "Masculino", 8532: "Femenino", 0: "Sin dato"}


def leer(nombre: str, obligatorio: bool = True) -> pd.DataFrame | None:
    ruta = RAW / f"{nombre}.parquet"
    if not ruta.exists():
        if obligatorio:
            sys.exit(f"Falta {ruta}. Corre primero: python -m hun.data.extraer <grupo>")
        print(f"  (aviso) no existe {ruta.name}; se omite")
        return None
    return pd.read_parquet(ruta)


def guardar(df: pd.DataFrame, nombre: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT / f"{nombre}.parquet", index=False)
    print(f"  {nombre}: {len(df):,} filas")


def franja(h: int) -> str:
    if h < 6:
        return "1 Madrugada (0-5)"
    if h < 12:
        return "2 Mañana (6-11)"
    if h < 18:
        return "3 Tarde (12-17)"
    return "4 Noche (18-23)"


def nombres_conceptos() -> dict[int, str]:
    nombres: dict[int, str] = {}
    for nombre in ("conceptos_visitas", "tipos_etapa", "tipos_visita"):
        df = leer(nombre, obligatorio=False)
        if df is None:
            continue
        col_n = next(
            (c for c in ("concept_name", "etapa", "tipo", "nombre") if c in df.columns), None
        )
        if col_n is None:
            continue
        for col_id in ("concept_id", "visit_detail_concept_id", "visit_concept_id"):
            if col_id in df.columns:
                for k, v in zip(df[col_id], df[col_n], strict=False):
                    if pd.notna(k) and pd.notna(v):
                        nombres.setdefault(int(k), str(v))
                break
    return nombres


def main() -> None:
    print("Preparando modelo Power BI desde", RAW)
    nombres = nombres_conceptos()

    # --- Censo por etapa + semáforo -----------------------------------------------------
    ent = leer("etapas_entradas_por_hora")
    sal = leer("etapas_salidas_por_hora")
    dur = leer("duracion_etapas_percentiles")
    calent = calcular_calentamiento(dur)
    censo = serie_censo_etapas(ent, sal, calentamiento=calent)
    umb = calcular_umbrales_censo(censo)

    e = ent.rename(columns={"hora": "ts", "visit_detail_concept_id": "serie"})
    s = sal.rename(columns={"hora": "ts", "visit_detail_concept_id": "serie"})
    e["ts"], s["ts"] = pd.to_datetime(e["ts"]), pd.to_datetime(s["ts"])
    col_sal = "salidas" if "salidas" in s.columns else s.columns[-1]
    fc = (
        censo.merge(e[["ts", "serie", "entradas"]], on=["ts", "serie"], how="left")
        .merge(
            s[["ts", "serie", col_sal]].rename(columns={col_sal: "salidas"}),
            on=["ts", "serie"],
            how="left",
        )
        .merge(umb[["serie", "p75", "p90"]], on="serie", how="left")
        .fillna({"entradas": 0, "salidas": 0})
        .rename(columns={"serie": "etapa_id", "y": "censo", "ts": "fecha_hora"})
    )
    fc["etapa_id"] = fc["etapa_id"].astype("int64")
    fc["fecha"] = fc["fecha_hora"].dt.normalize()
    fc["hora"] = fc["fecha_hora"].dt.hour.astype("int64")
    fc["semaforo"] = np.select(
        [fc["censo"] > fc["p90"], fc["censo"] >= fc["p75"]], ["3 Rojo", "2 Amarillo"], "1 Verde"
    )
    fc = fc[
        [
            "fecha_hora",
            "fecha",
            "hora",
            "etapa_id",
            "entradas",
            "salidas",
            "censo",
            "p75",
            "p90",
            "semaforo",
        ]
    ]
    guardar(fc, "fact_censo_etapa_hora")

    # --- dim_etapa ----------------------------------------------------------------------
    de = dur.rename(columns={"visit_detail_concept_id": "etapa_id"}).copy()
    de["etapa_id"] = de["etapa_id"].astype("int64")
    de = de.merge(
        umb.rename(
            columns={
                "serie": "etapa_id",
                "p50": "censo_p50",
                "p75": "censo_p75",
                "p90": "censo_p90",
                "max": "censo_max",
            }
        ).astype({"etapa_id": "int64"}),
        on="etapa_id",
        how="left",
    )
    de["etapa"] = de["etapa_id"].map(nombres).fillna(de["etapa_id"].astype(str))
    guardar(de, "dim_etapa")

    # --- Demanda: llegadas por hora -----------------------------------------------------
    ids_servicio: set[int] = set()
    llh = leer("entradas_por_hora", obligatorio=False)
    if llh is not None:
        sl = serie_llegadas(llh, freq="h").rename(
            columns={"ts": "fecha_hora", "serie": "servicio_id", "y": "llegadas"}
        )
        sl["fecha_hora"] = pd.to_datetime(sl["fecha_hora"])
        sl["fecha"] = sl["fecha_hora"].dt.normalize()
        sl["hora"] = sl["fecha_hora"].dt.hour.astype("int64")
        sl["servicio_id"] = sl["servicio_id"].astype("int64")
        sl = sl[
            sl["llegadas"] > 0
        ]  # Power BI no necesita los ceros; las medidas promedian por días
        ids_servicio |= set(sl["servicio_id"])
        guardar(
            sl[["fecha_hora", "fecha", "hora", "servicio_id", "llegadas"]], "fact_llegadas_hora"
        )

    perfil = leer("llegadas_diarias_perfil", obligatorio=False)
    if perfil is not None:
        p = perfil.rename(
            columns={"visit_concept_id": "servicio_id", "gender_concept_id": "sexo_id"}
        )
        p["fecha"] = pd.to_datetime(p["fecha"])
        p["servicio_id"] = p["servicio_id"].astype("int64")
        p["sexo_id"] = p["sexo_id"].fillna(0).astype("int64")
        ids_servicio |= set(p["servicio_id"])
        guardar(p, "fact_llegadas_perfil")

    # --- Duraciones / esperas -----------------------------------------------------------
    dd = leer("duracion_etapas_diaria", obligatorio=False)
    if dd is not None:
        dd = dd.rename(
            columns={"visit_detail_concept_id": "etapa_id", "visit_concept_id": "servicio_id"}
        )
        dd["fecha"] = pd.to_datetime(dd["fecha"])
        dd["horas_total"] = dd["horas_media"] * dd["etapas"]  # para promedios ponderados en DAX
        dd = dd.astype({"etapa_id": "int64", "servicio_id": "int64"})
        ids_servicio |= set(dd["servicio_id"])
        guardar(dd, "fact_duracion_diaria")

    df_ = leer("duracion_etapas_por_franja", obligatorio=False)
    if df_ is not None:
        df_ = df_.rename(
            columns={"visit_detail_concept_id": "etapa_id", "visit_concept_id": "servicio_id"}
        )
        df_ = df_.astype(
            {"etapa_id": "int64", "servicio_id": "int64", "dia_semana": "int64", "hora": "int64"}
        )
        df_["dia_nombre"] = df_["dia_semana"].map(lambda d: f"{d} {DIAS[d - 1]}")
        guardar(df_, "fact_duracion_franja")

    tr = leer("transiciones_etapas", obligatorio=False)
    if tr is not None:
        tr = tr.rename(
            columns={
                "visit_concept_id": "servicio_id",
                "etapa": "etapa_id",
                "etapa_siguiente": "etapa_siguiente_id",
            }
        )
        tr["mes"] = pd.to_datetime(tr["mes"])
        tr = tr.astype({"etapa_id": "int64", "etapa_siguiente_id": "int64", "servicio_id": "int64"})
        tr["etapa_siguiente"] = tr["etapa_siguiente_id"].map(nombres)
        tr.loc[tr["etapa_siguiente_id"] == -1, "etapa_siguiente"] = "Fin de la visita"
        tr["etapa_siguiente"] = tr["etapa_siguiente"].fillna(tr["etapa_siguiente_id"].astype(str))
        tr["espera_h_p90_x_pasos"] = tr["espera_h_p90"] * tr["pasos"]
        tr["espera_h_p50_x_pasos"] = tr["espera_h_p50"] * tr["pasos"]
        guardar(tr, "fact_transiciones")

    # --- Dimensiones --------------------------------------------------------------------
    ids_servicio = sorted(i for i in ids_servicio if i >= 0) + ([-1] if -1 in ids_servicio else [])
    ds = pd.DataFrame({"servicio_id": ids_servicio})
    ds["servicio"] = ds["servicio_id"].map(nombres).fillna(ds["servicio_id"].astype(str))
    ds.loc[ds["servicio_id"] == -1, "servicio"] = "Otros (bajo volumen)"
    guardar(ds, "dim_servicio")

    fechas = [fc["fecha"].min(), fc["fecha"].max()]
    for nombre, col in (
        ("fact_llegadas_hora", "fecha"),
        ("fact_llegadas_perfil", "fecha"),
        ("fact_duracion_diaria", "fecha"),
        ("fact_transiciones", "mes"),
    ):
        ruta = OUT / f"{nombre}.parquet"
        if ruta.exists():
            serie = pd.read_parquet(ruta, columns=[col])[col]
            fechas += [serie.min(), serie.max()]
    f = pd.DataFrame({"fecha": pd.date_range(min(fechas), max(fechas), freq="D")})
    f["anio"] = f["fecha"].dt.year
    f["mes_num"] = f["fecha"].dt.month
    f["mes"] = f["mes_num"].map(lambda m: MESES[m - 1])
    f["anio_mes"] = f["fecha"].dt.strftime("%Y-%m")
    f["trimestre"] = "T" + f["fecha"].dt.quarter.astype(str)
    f["dia_semana_num"] = f["fecha"].dt.day_of_week + 1
    f["dia_semana"] = f["dia_semana_num"].map(lambda d: DIAS[d - 1])
    f["es_fin_de_semana"] = f["dia_semana_num"] >= 6
    guardar(f, "dim_fecha")

    h = pd.DataFrame({"hora": range(24)})
    h["hora_texto"] = h["hora"].map(lambda x: f"{x:02d}:00")
    h["franja"] = h["hora"].map(franja)
    guardar(h, "dim_hora")

    guardar(pd.DataFrame({"sexo_id": list(SEXO), "sexo": list(SEXO.values())}), "dim_sexo")
    print(f"Listo. Calentamiento del censo: {calent}. Archivos en {OUT}")


if __name__ == "__main__":
    main()
