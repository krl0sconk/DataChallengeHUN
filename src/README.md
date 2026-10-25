# src/hun/

Paquete Python del proyecto (se instala con `pip install -e .`).

| Módulo | Responsabilidad |
|---|---|
| `config.py` | Rutas y parámetros leídos desde `.env` |
| `data/` | Conexión de solo lectura (`conexion.py`), consultas SQL (`sql/`), extracción (`extraer.py`) y series agregadas (`agregados.py`) |
| `external/` | Descarga de datos externos (clima, festivos, temporadas) |
| `features/` | Ingeniería de variables |
| `models/` | Validación walk-forward (`validacion.py`), línea base (`linea_base.py`), protocolo de factores externos (`evaluacion_factores.py`) |
| `visualization/` | Gráficas interactivas con Plotly |
