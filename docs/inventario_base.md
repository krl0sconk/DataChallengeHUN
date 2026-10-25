# Inventario de la base

- **Tarea:** #17 Inventario de la base · Sprint 1
- **Responsable:** Juan (las extracciones y el análisis los corrió Krlos el 2026-10-15)
- **Fuente:** `python -m hun.data.extraer inventario` (consultas `00`, `01`, `02`, `03` y `06` de
  `src/hun/data/sql/`). Solo agregados.
- **Detalle y decisiones:** [objetivo_prediccion.md](objetivo_prediccion.md) (*Resultado del inventario*)
  y DEC-002 en [decisiones.md](decisiones.md). Si algo no coincide, mandan esos dos documentos.

## Resumen

| Pregunta | Respuesta |
|---|---|
| Rango de fechas | 2023-01-01 a 2026-07-17 (último día a medias; último día completo 2026-07-16) |
| Fecha de corte y actualización | La base termina ~3 meses antes de hoy y no se actualiza: no se predicen días futuros reales con rezagos (la web re-simula dentro del rango) |
| Registros sueltos después del corte | Hasta 2026-08-13; se descartan con `fecha_corte` (`src/hun/data/agregados.py`) |
| Huecos | Ningún mes vacío entre 2023-01 y 2026-06 |
| Servicios (`visit_concept_id`) | Rehabilitación ambulatoria, urgencias y urgencia-tratamiento se modelan; hospitalización y "sin concepto" se agrupan en "Otros" |
| Etapas (`visit_detail_concept_id`) | 4 conceptos, los mismos 4 tipos de visita; no hay triage ni observación |
| ¿Horas reales? | Sí en urgencias; en rehabilitación son citas programadas (34 % en minuto 0) |
| Duración en `visit_occurrence` | 0 h siempre (`visit_end_datetime` = `visit_start_datetime`): tiempos y censo salen de `visit_detail` |
| Tamaño de cada tabla | TODO: completar con `data/raw/tablas_tamano.parquet` |

## Volumen por tipo de visita

| Tipo | Visitas | Por día | Decisión |
|---|---|---|---|
| 581479 Ambulatory Rehabilitation Visit | 1 089 461 | ~827 | Se modela |
| 9203 Emergency Room Visit | 598 088 | ~443 | Se modela |
| 3045729 Treatment urgency {Diagnosis} | 17 858 | ~15 | Se modela por día |
| 9201 Inpatient Visit | 592 | ~0,5 | "Otros" |
| 0 No matching concept | 2 | ~0 | "Otros" |

## Qué se baja completo y qué agregado

Nada se baja a nivel de fila. Todo sale agregado dentro del SQL:

- Visitas y etapas: conteos por hora o día (`04`, `05`, `13`–`18`).
- `measurement`, `condition_occurrence` y `procedure_occurrence`: solo frecuencias por concepto
  (`20`–`22`), con conceptos de menos de 10 registros omitidos. Cualquier uso adicional se agrega en SQL.

## Pendiente

- TODO: completar el tamaño de cada tabla.
- La calidad de los datos y la prueba de fechas corridas siguen en [calidad_datos.md](calidad_datos.md) (#12).
