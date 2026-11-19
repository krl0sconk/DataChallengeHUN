# Resultados · Saturación hospitalaria por etapa

_Generado automáticamente por `python -m hun.models.saturacion` el 2026-11-03 16:19. Solo métricas agregadas._

- **Fuentes:** `etapas_entradas_por_hora.parquet`, `etapas_salidas_por_hora.parquet`, `duracion_etapas_percentiles.parquet`
- **Reconstrucción del censo:** Entradas acumuladas − salidas acumuladas por etapa (`visit_detail_concept_id`).
- **Periodo de calentamiento:** `24D` (estrictamente superior al percentil 99 de duración).

## 1. Justificación del calentamiento del censo

Al reconstruir el censo horario como entradas acumuladas menos salidas acumuladas a partir del primer instante observado ($t_0$), las estancias que iniciaron antes de $t_0$ no cuentan con un registro de entrada dentro de la ventana de análisis. Al momento en que dichos pacientes egresan, se contabilizan únicamente como salidas, lo que genera una subestimación del censo o incluso valores negativos durante los primeros días de la serie.

Superar el percentil 99 de duración ($p_{99}$) reduce el efecto de las estancias iniciadas antes de la ventana, pero no garantiza eliminarlo: las estancias de la cola extrema pueden exceder el calentamiento. El censo reconstruido es una estimación histórica, no una medición de capacidad instalada.

## 2. Duración de etapas y calentamiento determinado

Distribución histórica de duración por tipo de etapa (excluyendo registros sin fecha de egreso o con fin anterior al inicio):

| Etapa | Concept ID | Etapas observadas | p50 (h) | p90 (h) | p99 (h) | Máx (h) |
|---|---|---|---|---|---|---|
| Ambulatory Rehabilitation Visit | 581479.0 | 1,539,340 | 0.0 | 0.0 | 0.0 | 0.0 |
| Treatment urgency {Diagnosis} | 3045729.0 | 1,152,191 | 1.2 | 12.6 | 76.4 | 28070.3 |
| Emergency Room Visit | 9203.0 | 481,481 | 0.1 | 0.1 | 0.2 | 20730.3 |
| Inpatient Visit | 9201.0 | 108,601 | 46.0 | 188.2 | 550.9 | 11213.6 |

### Nota sobre estancias extremas (`> p99.9`)

El extracto vigente conserva estancias de hasta **28,070.3 h** en `Treatment urgency` (`3045729`) y **11,213.6 h** en `Inpatient Visit` (`9201`). No se han eliminado silenciosamente ni se presentan las tablas anteriores como depuradas. Las consultas `14_etapas_entradas_por_hora.sql`, `15_etapas_salidas_por_hora.sql` y `23_duracion_etapas_percentiles.sql` ya implementan el filtro por `p99.9` para una nueva extracción cuando exista acceso VPN/BD; la reextracción está pendiente.

Como contraste independiente, la [Ley de Little](optimizacion.md#ley-de-little-y-altas-matutinas) estima **284.29** pacientes frente a una mediana observada de **288.0**, consistente con el nivel global del censo. Esta concordancia no demuestra ausencia de sesgo en la cola: deben recalcularse censo, umbrales y escenarios con el nuevo extracto antes de decisiones asistenciales.

## 3. Umbrales históricos de saturación (entrenamiento)

Percentiles calculados exclusivamente con datos de entrenamiento ($t < \text{origen}$) para evitar fuga de información:

- **Verde (Normal):** $\text{censo} < p_{75}$
- **Amarillo (Alerta preventiva):** $p_{75} \le \text{censo} \le p_{90}$
- **Rojo (Saturación crítica):** $\text{censo} > p_{90}$

| Etapa | Concept ID | Mediana (p50) | Preventivo (p75) | Crítico (p90) | Máx histórico |
|---|---|---|---|---|---|
| Inpatient Visit | 9201.0 | 288.0 | 306.0 | 319.0 | 378.0 |
| Emergency Room Visit | 9203.0 | 6.0 | 7.0 | 10.0 | 308.0 |
| Ambulatory Rehabilitation Visit | 581479.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Treatment urgency {Diagnosis} | 3045729.0 | 219.0 | 260.0 | 300.0 | 639.0 |

## 4. Resumen operativo diario de saturación

Comportamiento de la ocupación diaria agregada por etapa:

| Etapa | Concept ID | Días observados | Censo máx promedio | Horas/día amarillo | Horas/día rojo | % Días alerta roja |
|---|---|---|---|---|---|---|
| Inpatient Visit | 9201 | 1271 | 295.8 | 3.7 | 2.3 | 18.9% |
| Emergency Room Visit | 9203 | 1271 | 12.6 | 7.8 | 2.2 | 24.9% |
| Ambulatory Rehabilitation Visit | 581479 | 1271 | 0.0 | 24.0 | 0.0 | 0.0% |
| Treatment urgency {Diagnosis} | 3045729 | 1271 | 276.5 | 3.7 | 2.4 | 30.7% |
