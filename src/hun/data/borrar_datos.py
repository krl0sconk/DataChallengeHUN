"""Borra los datos del hospital y las credenciales al cierre del reto (tarea #21).

Lo exige el acuerdo de confidencialidad. Cada integrante lo corre en SU computador.

Por defecto solo MUESTRA lo que borraría. Para borrar de verdad:
    python -m hun.data.borrar_datos            # simulación: lista archivos y tamaños
    python -m hun.data.borrar_datos --confirmar

Qué borra:
- El contenido de data/raw, data/interim y data/processed (extracciones y tablas derivadas).
- Los modelos entrenados en models/ (se entrenaron con datos del hospital).
- El archivo .env (credenciales de la base y la VPN).
Conserva los .gitkeep y README.md (son parte del repo) y no toca data/external
(datos públicos: clima, calendario, epidemiología).

Lo que este script NO puede borrar está en docs/cierre_datos.md (copias en Descargas,
el .pbix de Power BI, la papelera, la configuración de la VPN, etc.).
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from hun import config

CONSERVAR = {".gitkeep", "README.md"}


def objetivos() -> list[Path]:
    """Carpetas cuyo contenido se borra y archivos sueltos a borrar."""
    return [
        config.RAW_DIR,
        config.INTERIM_DIR,
        config.PROCESSED_DIR,
        config.MODELS_DIR,
        config.ROOT_DIR / ".env",
    ]


def a_borrar(rutas: list[Path] | None = None) -> list[Path]:
    """Lista lo que se borraría, sin borrar nada.

    Por seguridad, con las rutas por defecto solo se consideran carpetas DENTRO del repositorio:
    si una variable del .env apunta a otra parte (por ejemplo, tu carpeta personal), se avisa y
    se salta, y esa carpeta se limpia a mano.
    """
    salida: list[Path] = []
    if rutas is None:
        rutas = []
        for r in objetivos():
            if r.resolve().is_relative_to(config.ROOT_DIR.resolve()):
                rutas.append(r)
            else:
                print(f"AVISO: {r} está fuera del repositorio; límpiala a mano.")
    for ruta in rutas:
        if ruta.is_file():
            salida.append(ruta)
        elif ruta.is_dir():
            salida += sorted(p for p in ruta.iterdir() if p.name not in CONSERVAR)
    return salida


def _tamano(p: Path) -> int:
    if p.is_file():
        return p.stat().st_size
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file())


def borrar(rutas: list[Path] | None = None, confirmar: bool = False) -> list[Path]:
    """Borra (si `confirmar`) y devuelve la lista de lo borrado o por borrar."""
    lista = a_borrar(rutas)
    if confirmar:
        for p in lista:
            shutil.rmtree(p) if p.is_dir() and not p.is_symlink() else p.unlink()
    return lista


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--confirmar", action="store_true", help="borra de verdad")
    args = parser.parse_args()

    lista = a_borrar()
    if not lista:
        print("No hay datos del hospital ni credenciales en este repositorio.")
        return
    total = sum(_tamano(p) for p in lista)
    for p in lista:
        print(f"  {p.relative_to(config.ROOT_DIR) if p.is_relative_to(config.ROOT_DIR) else p}")
    print(f"{len(lista)} elementos, {total / 1e6:.1f} MB")
    if not args.confirmar:
        print("Simulación: no se borró nada. Repite con --confirmar para borrar.")
        return
    borrar(confirmar=True)
    print("Borrado. Revisa ahora la lista de docs/cierre_datos.md.")


if __name__ == "__main__":
    main()
