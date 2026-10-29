# data/

Directorio para almacenamiento de datos del proyecto (estructurado en capas Medallion / ETL).

> [!CAUTION]
> **Privacidad y confidencialidad hospitalaria:** Los datos del HUN están protegidos bajo secreto profesional y acuerdos de confidencialidad médica. Ningún archivo con datos crudos, agregados de pacientes o modelos derivados se versiona en GitHub (exclusivamente este `README.md`, `.gitkeep` y archivos de referencia pública como `external/manual/vacaciones_escolares.csv`).

## Estructura de directorios

| Carpeta | Contenido | Generador / Fuente |
|---|---|---|
| `raw/` | 24 extracciones agregadas particionadas desde PostgreSQL OMOP en formato Parquet. Solo lectura. | `python -m hun.data.extraer`, `hun.data.auditoria`, `hun.data.agregados` |
| `external/` | Variables externas (clima histórico, calendario de festivos, calendarios escolares y SIVIGILA). | `src/external/build.py`, `external/manual/vacaciones_escolares.csv` |
| `interim/` | Tablas intermedias de depuración y consolidación. | Notebooks y scripts de transformación |
| `processed/` | Diccionario de conceptos resueltos (`conceptos.parquet`) y bundle del modelo (`modelos_web_bundle.joblib`). | `hun.data.conceptos`, `hun.models.demanda` |
| `externos.parquet` | Dataset unificado diario de factores externos (2023–2026). | `src/external/build.py` |

## Inventario de archivos en `data/raw/`

1. **Inventario básico:**
   - `01_cobertura_temporal.parquet`: Fechas extremas por tabla OMOP.
   - `02_flujo_horario_urgencias.parquet`: Perfil horario global de urgencias.
   - `03_tamano_tablas.parquet`: Conteo de registros por tabla física.
   - `04_tipos_visita.parquet`: Distribución de `visit_concept_id`.
   - `05_tipos_etapa.parquet`: Distribución de `visit_detail_concept_id`.
   - `06_precision_horas.parquet`: Frecuencia de minutos para verificación de redondeo horario.
2. **Flujo horario:**
   - `08_flujo_mensual_urgencias.parquet`: Entradas y salidas por hora para urgencias (44 ventanas mensuales).
   - `09_flujo_mensual_rehabilitacion.parquet`: Entradas y salidas para rehabilitación.
   - `10_flujo_mensual_otros.parquet`: Entradas y salidas para servicios de bajo volumen.
3. **Demografía y estancia:**
   - `07_distribucion_edad_sexo.parquet`: Distribución por grupos de edad y género.
   - `14_etapas_duracion_por_visita.parquet`: Duración de etapas clínicas en urgencias.
   - `23_duracion_etapas_percentiles.parquet`: Percentiles p25, p50, p75, p90 de duración.
   - `11_conceptos_mas_frecuentes.parquet`: Conceptos clínicos prevalentes.
4. **Auditoría de calidad (`hun.data.auditoria`):**
   - `15_solapamiento_visitas.parquet`: Pacientes con visitas simultáneas.
   - `16_solapamiento_etapas.parquet`: Pacientes con etapas clínicas superpuestas.
   - `17_edades_extremas.parquet`: Registros con edades imposibles (<0 o >120 años).
   - `18_completitud_columnas.parquet`: Porcentaje de nulos por columna crítica.
   - `19_inconsistencias_fechas.parquet`: Casos con `fecha_fin < fecha_inicio`.
   - `20_duplicados_aproximados.parquet`: Duplicados exactos en visitas y etapas.
5. **Agregados para modelado y dashboard (`hun.data.agregados`):**
   - `21_perfil_llegadas_dia_hora.parquet`: Llegadas agregadas por fecha, franja y servicio.
   - `22_censo_etapas_horario.parquet`: Reconstrucción horaria de pacientes concurrentes por etapa.
   - `24_esperas_entre_etapas.parquet`: Tiempos de transición entre etapas consecutivas.

## Buenas prácticas

- Todo dataset de `processed/` debe poder reconstruirse de forma determinista mediante scripts en `src/`.
- Rutas resueltas siempre dinámicamente mediante `hun.config` (`RAW_DIR`, `PROCESSED_DIR`, etc.).
