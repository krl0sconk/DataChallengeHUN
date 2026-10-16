# Guía · sesión de base de datos

Paso a paso para conectarse a la base del hospital y bajar los agregados. Sirve igual si lo haces a mano o
con un agente de IA desde la terminal.

## Una sola vez

1. Instalar la VPN FortiClient con el manual que enviaron los organizadores (correo del 2026-10-09).
2. `pip install -r requirements.txt && pip install -e .` (incluye `sqlalchemy` y `psycopg`).
3. Copiar `.env.example` a `.env` y llenar `HUN_DB_*` con los datos de los correos de los organizadores.
   El `.env` nunca se sube ni se manda por chat.

## Cada sesión

1. Avisar en el grupo: **"me conecto a la BD"**. Solo puede haber una persona conectada.
2. Conectar la VPN.
3. Probar: `python -m hun.data.conexion`. Debe decir `Solo lectura: on` y listar las tablas del esquema.
   Si la lista sale vacía, cambiar `HUN_DB_SCHEMA` (`uninorte_omop` ↔ `uninorte_omo`).
4. Extraer lo que necesites:
   ```bash
   python -m hun.data.extraer inventario       # liviano: tamaños, cobertura, tipos, precisión de horas
   python -m hun.data.extraer flujo_horario    # entradas y salidas por hora, mes a mes
   ```
   Los resultados quedan en `data/raw/` (no se suben). Si se corta, vuelve a correr el mismo comando:
   los meses ya bajados se saltan.
5. Desconectar la VPN y avisar **"libre"**.

## Reglas

- Solo `SELECT`. La conexión ya está en solo lectura y `consultar()` rechaza cualquier otra cosa.
- Consultas nuevas: un archivo en `src/hun/data/sql/` y una entrada en `src/hun/data/extraer.py`.
  Nada de exportar CSV a mano desde DBeaver para usarlo en el proyecto.
- Nunca copiar filas de pacientes a código, documentación, commits, PRs o chats.
- Al terminar el reto se borran todos los datos descargados (`data/raw/`, `data/interim/`, `data/processed/`).
