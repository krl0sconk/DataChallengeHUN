# Diccionario de datos · resumen y consecuencias para el proyecto

> El diccionario oficial (enviado por los organizadores el 2026-10-09) está tal cual en
> [`diccionario_datos/Diccionario_datos.md`](diccionario_datos/Diccionario_datos.md). Es lo único del
> hospital que se versiona. Este archivo resume lo que importa para el modelo; si algo no coincide,
> mandan el oficial y la base.

## Conexión

- **Motor:** PostgreSQL, por VPN (FortiClient), base de datos de **solo consulta**.
- **Base:** `uhn_i` · **Esquema:** `uninorte_omop` (lo confirma el diccionario oficial; el correo dice
  `uninorte_omo`, que parece un error de tipeo). `python -m hun.data.conexion` lista las tablas del
  esquema configurado en `.env` (`HUN_DB_SCHEMA`) para verificarlo.
- **Credenciales:** servidor, puerto, base, usuario y contraseña solo en `.env` (ver `.env.example`).
- **Una persona conectada a la vez.** Avisar en el grupo antes y después.

## Tablas y columnas disponibles

| Tabla | Columnas |
|---|---|
| `person` | `person_id`, `gender_concept_id`, `year_of_birth`, `race_concept_id`, `ethnicity_concept_id` |
| `visit_occurrence` | `visit_occurrence_id`, `person_id`, `visit_concept_id`, `visit_start_datetime`, `visit_end_datetime`, `visit_type_concept_id`, `provider_id` |
| `visit_detail` | `visit_detail_id`, `visit_occurrence_id`, `visit_detail_concept_id`, `visit_detail_start_datetime`, `visit_detail_end_datetime`, `provider_id` |
| `condition_occurrence` | `condition_occurrence_id`, `person_id`, `visit_occurrence_id`, `condition_concept_id`, `condition_start_datetime` |
| `procedure_occurrence` | `procedure_occurrence_id`, `person_id`, `visit_occurrence_id`, `procedure_concept_id`, `procedure_datetime`, `procedure_type_concept_id` |
| `measurement` | `measurement_id`, `person_id`, `visit_occurrence_id`, `measurement_concept_id`, `measurement_datetime`, `value_as_number`, `unit_concept_id`, `measurement_type_concept_id` |
| `concept` | `concept_id`, `concept_name`, `domain_id`, `vocabulary_id` |

Todas las columnas `*_concept_id` se traducen uniendo con `concept.concept_id` → `concept_name`.

## Diferencias con las bases del reto

| Lo que decían las bases | Lo que hay | Qué hacemos |
|---|---|---|
| `visit_occurrence.preceding_visit_occurrence_id` | No existe | La visita previa se reconstruye ordenando las visitas de cada `person_id` por fecha (reingresos, visitas frecuentes). |
| `condition_occurrence.condition_type_concept_id` | No existe | No afecta el modelo de demanda. |
| `visit_detail.person_id` | No existe | Se obtiene uniendo con `visit_occurrence`. |

## Consecuencias para el modelo

1. **El "servicio" es `visit_concept_id`.** No hay columna de servicio, sala ni cama. Si los tipos de visita
   son solo los estándar de OMOP (urgencias, hospitalización, consulta externa), el modelo predice por esos
   grupos; si `visit_detail_concept_id` trae etapas más finas (triage, observación, UCI), se usan para el
   análisis de cuellos de botella y el censo por etapa. Se confirma con `tipos_visita` y `tipos_etapa`.
2. **La saturación se mide con el censo.** Con `visit_start_datetime` y `visit_end_datetime` se reconstruye
   cuántos pacientes hay adentro cada hora (entradas acumuladas − salidas acumuladas), sin bajar filas de
   pacientes. Ver `src/hun/data/agregados.py`.
3. **No hay capacidad instalada (camas, sillas).** La saturación se expresa relativa a la historia
   (por ejemplo, censo por encima del percentil 90 de ese servicio), salvo que el hospital nos dé capacidades.
4. **Hay que verificar que las horas sean reales.** Si muchas visitas empiezan a las 00:00 o siempre en
   minuto 0, el modelo horario no sirve y se trabaja por día. Lo mide `06_precision_horas.sql`.
5. **Posible desplazamiento de fechas por anonimización.** Si las fechas están corridas, los factores
   externos (clima, festivos) no se alinearían con nada. Señales: pocos domingos, Carnaval o diciembre sin
   cambios. Lo revisan `cobertura_mensual` y `precision_horas`, y la auditoría de Juan.
6. **`measurement` probablemente es la tabla más grande.** Se agrega dentro del SQL (por ejemplo, primeros
   signos vitales de cada visita), nunca se baja completa.
7. **Edad** = año de la visita − `year_of_birth` (no hay fecha de nacimiento exacta).

## Extracciones versionadas

Las consultas están en `src/hun/data/sql/` y se corren con `python -m hun.data.extraer`. Todas devuelven
agregados; ninguna trae filas de pacientes.

| Archivo | Extracción | Para qué |
|---|---|---|
| `00_tablas_tamano.sql` | `tablas_tamano` | Tamaño de cada tabla (estimado del catálogo) |
| `01_cobertura_mensual.sql` | `cobertura_mensual` | Rango de fechas, huecos, fecha de corte |
| `02_tipos_visita.sql` | `tipos_visita` | Servicios disponibles, volumen y duración |
| `03_tipos_etapa.sql` | `tipos_etapa` | Etapas de `visit_detail` por tipo de visita |
| `06_precision_horas.sql` | `precision_horas` | Si las horas son reales y si las fechas parecen desplazadas |
| `04_entradas_por_hora.sql` | `entradas_por_hora` | Llegadas por hora y tipo de visita (modelo de demanda) |
| `05_salidas_por_hora.sql` | `salidas_por_hora` | Salidas por hora (censo / saturación) |
