# Resultados · Saturación hospitalaria por etapa

_Generado automáticamente por `python -m hun.models.saturacion` el 2026-11-18 20:07. Solo métricas agregadas._

- **Fuentes:** `etapas_entradas_por_hora.parquet`, `etapas_salidas_por_hora.parquet`, `duracion_etapas_percentiles.parquet`
- **Reconstrucción del censo:** Entradas acumuladas − salidas acumuladas por etapa (`visit_detail_concept_id`).
- **Periodo de calentamiento:** `24D` (estrictamente superior al percentil 99 de duración).

## 1. Justificación del calentamiento del censo

Al reconstruir el censo horario como entradas acumuladas menos salidas acumuladas a partir del primer instante observado ($t_0$), las estancias que iniciaron antes de $t_0$ no cuentan con un registro de entrada dentro de la ventana de análisis. Al momento en que dichos pacientes egresan, se contabilizan únicamente como salidas, lo que genera una subestimación del censo o incluso valores negativos durante los primeros días de la serie.

Tras superar el percentil 99 de duración ($p_{99}$) de las etapas, más del 99 % de los pacientes hospitalizados al inicio de la ventana ya han egresado, y la totalidad de los pacientes activos ingresaron dentro del periodo observado. En consecuencia, el sesgo inicial desaparece por completo y el censo reconstruido converge a la ocupación real del hospital.

## 2. Duración de etapas y calentamiento determinado

Distribución histórica de duración por tipo de etapa (excluyendo registros sin fecha de egreso o con fin anterior al inicio):

| Etapa | Concept ID | Etapas observadas | p50 (h) | p90 (h) | p99 (h) | Máx (h) |
|---|---|---|---|---|---|---|
| Ambulatory Rehabilitation Visit | 581479.0 | 1,539,340 | 0.0 | 0.0 | 0.0 | 0.0 |
| Treatment urgency {Diagnosis} | 3045729.0 | 1,152,191 | 1.2 | 12.6 | 76.4 | 28070.3 |
| Emergency Room Visit | 9203.0 | 481,481 | 0.1 | 0.1 | 0.2 | 20730.3 |
| Inpatient Visit | 9201.0 | 108,601 | 46.0 | 188.2 | 550.9 | 11213.6 |

## 3. Umbrales históricos de saturación (entrenamiento)

Percentiles calculados exclusivamente con datos de entrenamiento ($t < \text{origen}$) para evitar fuga de información:

- **Verde (Normal):** $\text{censo} < p_{75}$
- **Amarillo (Alerta preventiva):** $p_{75} \le \text{censo} \le p_{90}$
- **Rojo (Saturación crítica):** $\text{censo} > p_{90}$

| Etapa | Concept ID | Mediana (p50) | Preventivo (p75) | Crítico (p90) | Máx histórico |
|---|---|---|---|---|---|
| Inpatient Visit | 9201.0 | 283.0 | 297.0 | 309.0 | 359.0 |
| Emergency Room Visit | 9203.0 | 0.0 | 1.0 | 3.0 | 162.0 |
| Ambulatory Rehabilitation Visit | 581479.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Treatment urgency {Diagnosis} | 3045729.0 | 201.0 | 239.0 | 272.0 | 518.0 |

## 4. Resumen operativo diario de saturación

Comportamiento de la ocupación diaria agregada por etapa:

| Etapa | Concept ID | Días observados | Censo máx promedio | Horas/día amarillo | Horas/día rojo | % Días alerta roja |
|---|---|---|---|---|---|---|
| Inpatient Visit | 9201 | 1271 | 288.8 | 4.0 | 2.2 | 19.2% |
| Emergency Room Visit | 9203 | 1271 | 4.1 | 9.0 | 1.0 | 57.0% |
| Ambulatory Rehabilitation Visit | 581479 | 1271 | 0.0 | 24.0 | 0.0 | 0.0% |
| Treatment urgency {Diagnosis} | 3045729 | 1271 | 254.0 | 3.6 | 2.4 | 37.9% |

## Nota metodológica: depuración de estancias extremas (`p99.9`)

Las consultas SQL `14_etapas_entradas_por_hora.sql`, `15_etapas_salidas_por_hora.sql` y `23_duracion_etapas_percentiles.sql` aplican el percentil `p99.9` por tipo de etapa (`horas_p999` en `duracion_etapas_percentiles.parquet`) como tope superior para el extracto horario:

- **Inpatient Visit (`9201`):** `p99.9 = 1,176.3 h`
- **Treatment urgency {Diagnosis} (`3045729`):** `p99.9 = 283.7 h`
- **Emergency Room Visit (`9203`):** `p99.9 = 17.5 h`
- **Ambulatory Rehabilitation Visit (`581479`):** `p99.9 = 0.0 h`

Los máximos crudos de la sección 2 (**28,070.3 h** en Treatment urgency, **20,730.3 h** en Emergency Room Visit y **11,213.6 h** en Inpatient Visit) provienen de la auditoría completa sin recorte de `duracion_etapas_percentiles.parquet`. En cambio, la reconstrucción del censo, los umbrales y las métricas diarias de las secciones 3 y 4 se calculan sobre `etapas_entradas_por_hora` y `etapas_salidas_por_hora` ya filtradas por `p99.9`, evitando estancias fantasma y colas administrativas extremas.
