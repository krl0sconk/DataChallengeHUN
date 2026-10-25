"""Conexión de solo lectura a la base del hospital (PostgreSQL, esquema OMOP).

Es la ÚNICA forma permitida de conectarse desde el código del proyecto.

Protecciones:
- La sesión se abre con `default_transaction_read_only=on`: la base rechaza
  cualquier escritura aunque alguien la intente.
- `statement_timeout` corta consultas largas para no saturar la base.
- `consultar()` además rechaza en Python todo lo que no sea `SELECT` / `WITH`.
- Las credenciales se leen SOLO de `.env` (nunca se escriben en el código).

Recordatorio: solo una persona del equipo puede estar conectada a la vez.
Avisa en el grupo antes de conectarte y cierra la conexión al terminar.

Uso:
    from hun.data.conexion import consultar, probar_conexion

    probar_conexion()
    df = consultar("SELECT COUNT(*) AS n FROM {esquema}.person")
"""

from __future__ import annotations

import os
import re
from contextlib import contextmanager
from pathlib import Path

import pandas as pd

from hun import config  # noqa: F401  (carga el .env de la raíz del repo)

VARIABLES = ("HUN_DB_HOST", "HUN_DB_PORT", "HUN_DB_NAME", "HUN_DB_USER", "HUN_DB_PASSWORD")
ESQUEMA_POR_DEFECTO = "uninorte_omop"
TIMEOUT_POR_DEFECTO_S = 120

_INICIO_PERMITIDO = re.compile(r"^\s*(select|with)\b", re.IGNORECASE)
_PALABRAS_PROHIBIDAS = re.compile(
    r"\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|"
    r"vacuum|analyze|comment|call|do|lock|refresh|reindex|cluster|set\s+role)\b",
    re.IGNORECASE,
)


def esquema() -> str:
    """Esquema OMOP configurado en `.env` (por defecto `uninorte_omop`)."""
    valor = os.getenv("HUN_DB_SCHEMA", ESQUEMA_POR_DEFECTO).strip()
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", valor):
        raise ValueError(f"Nombre de esquema inválido: {valor!r}")
    return valor


def _quitar_comentarios_y_literales(sql: str) -> str:
    sql = re.sub(r"--[^\n]*", " ", sql)
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
    return re.sub(r"'(?:[^']|'')*'", "''", sql)


def validar_solo_lectura(sql: str) -> None:
    """Lanza `ValueError` si la consulta no es una única sentencia de lectura."""
    limpio = _quitar_comentarios_y_literales(sql).strip().rstrip(";").strip()
    if not limpio:
        raise ValueError("La consulta está vacía.")
    if ";" in limpio:
        raise ValueError("Solo se permite una sentencia por consulta.")
    if not _INICIO_PERMITIDO.match(limpio):
        raise ValueError("Solo se permiten consultas SELECT o WITH ... SELECT.")
    encontrada = _PALABRAS_PROHIBIDAS.search(limpio)
    if encontrada:
        raise ValueError(f"Palabra no permitida en una consulta de solo lectura: {encontrada[0]!r}")


def _url():
    from sqlalchemy.engine import URL

    faltantes = [v for v in VARIABLES if not os.getenv(v)]
    if faltantes:
        raise RuntimeError(
            "Faltan variables de conexión en .env: "
            + ", ".join(faltantes)
            + ". Copia .env.example a .env y complétalo (el .env nunca se sube)."
        )
    return URL.create(
        "postgresql+psycopg",
        username=os.environ["HUN_DB_USER"],
        password=os.environ["HUN_DB_PASSWORD"],
        host=os.environ["HUN_DB_HOST"],
        port=int(os.environ["HUN_DB_PORT"]),
        database=os.environ["HUN_DB_NAME"],
    )


def crear_engine(timeout_s: int | None = None):
    """Engine de SQLAlchemy en solo lectura, sin pool (una conexión a la vez)."""
    from sqlalchemy import create_engine
    from sqlalchemy.pool import NullPool

    timeout_s = timeout_s or int(os.getenv("HUN_DB_TIMEOUT_S", TIMEOUT_POR_DEFECTO_S))
    opciones = (
        "-c default_transaction_read_only=on "
        f"-c statement_timeout={timeout_s * 1000} "
        "-c idle_in_transaction_session_timeout=60000"
    )
    return create_engine(
        _url(),
        poolclass=NullPool,
        connect_args={"options": opciones, "application_name": "mediflow_hun"},
    )


@contextmanager
def conexion(timeout_s: int | None = None):
    """Abre una conexión y la cierra siempre al salir del bloque."""
    engine = crear_engine(timeout_s)
    try:
        with engine.connect() as con:
            yield con
    finally:
        engine.dispose()


def consultar(sql: str, params: dict | None = None, timeout_s: int | None = None) -> pd.DataFrame:
    """Ejecuta una consulta de lectura y devuelve un DataFrame.

    `{esquema}` en el texto se reemplaza por el esquema configurado.
    Los valores variables van en `params` (`:nombre` en el SQL), nunca concatenados.
    """
    from sqlalchemy import text

    sql = sql.replace("{esquema}", esquema())
    validar_solo_lectura(sql)
    with conexion(timeout_s) as con:
        return pd.read_sql_query(text(sql), con, params=params or {})


def leer_sql(ruta: str | Path) -> str:
    """Lee un archivo .sql de `src/hun/data/sql/` (o una ruta explícita)."""
    ruta = Path(ruta)
    if not ruta.is_absolute() and not ruta.exists():
        ruta = Path(__file__).parent / "sql" / ruta
    return ruta.read_text(encoding="utf-8")


def probar_conexion() -> dict:
    """Prueba mínima: versión del servidor, modo solo lectura y tablas OMOP visibles."""
    info = (
        consultar(
            "SELECT version() AS version, "
            "current_setting('default_transaction_read_only') AS solo_lectura, "
            "current_database() AS base"
        )
        .iloc[0]
        .to_dict()
    )
    tablas = consultar(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = :esquema ORDER BY table_name",
        {"esquema": esquema()},
    )["table_name"].tolist()
    info["esquema"] = esquema()
    info["tablas"] = tablas
    return info


if __name__ == "__main__":
    resultado = probar_conexion()
    print(f"Base: {resultado['base']} · esquema: {resultado['esquema']}")
    print(f"Solo lectura: {resultado['solo_lectura']}")
    print(f"Servidor: {resultado['version'].split(',')[0]}")
    print(f"Tablas visibles ({len(resultado['tablas'])}): {', '.join(resultado['tablas'])}")
