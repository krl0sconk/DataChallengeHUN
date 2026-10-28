# Resultados · Saturación hospitalaria por etapa

_Generado automáticamente por `python -m hun.models.saturacion` el 2026-10-27 10:39. Solo métricas agregadas._

> [!NOTE]
> **TODO (PC con `data/raw/` y VPN):** Si aún no están extraídos los parquets de etapas en `data/raw/`, conectar la VPN (verificando que nadie más esté conectado) y correr:
> ```bash
> python -m hun.data.extraer etapas_entradas_por_hora etapas_salidas_por_hora duracion_etapas_percentiles
> ```
> Luego desconectar la VPN y generar este reporte con:
> ```bash
> python -m hun.models.saturacion
> ```

- **Fuentes:** `etapas_entradas_por_hora.parquet`, `etapas_salidas_por_hora.parquet`, `duracion_etapas_percentiles.parquet`
- **Reconstrucción del censo:** Entradas acumuladas − salidas acumuladas por etapa (`visit_detail_concept_id`).
- **Periodo de calentamiento:** `30D` (estrictamente superior al percentil 99 de duración).

## 1. Justificación del calentamiento del censo

Al reconstruir el censo horario como entradas acumuladas menos salidas acumuladas a partir del primer instante observado ($t_0$), las estancias que iniciaron antes de $t_0$ no cuentan con un registro de entrada dentro de la ventana de análisis. Al momento en que dichos pacientes egresan, se contabilizan únicamente como salidas, lo que genera una subestimación del censo o incluso valores negativos durante los primeros días de la serie.

Tras superar el percentil 99 de duración ($p_{99}$) de las etapas, más del 99 % de los pacientes hospitalizados al inicio de la ventana ya han egresado, y la totalidad de los pacientes activos ingresaron dentro del periodo observado. En consecuencia, el sesgo inicial desaparece por completo y el censo reconstruido converge a la ocupación real del hospital.

## 2. Duración de etapas y calentamiento determinado

Distribución histórica de duración por tipo de etapa (excluyendo registros sin fecha de egreso o con fin anterior al inicio):

| Etapa | Concept ID | Etapas observadas | p50 (h) | p90 (h) | p99 (h) | Máx (h) |
|---|---|---|---|---|---|---|
| TODO: completar con resultado real | TODO | TODO | TODO | TODO | TODO | TODO |

## 3. Umbrales históricos de saturación (entrenamiento)

Percentiles calculados exclusivamente con datos de entrenamiento ($t < \text{origen}$) para evitar fuga de información:

- **Verde (Normal):** $\text{censo} < p_{75}$
- **Amarillo (Alerta preventiva):** $p_{75} \le \text{censo} \le p_{90}$
- **Rojo (Saturación crítica):** $\text{censo} > p_{90}$

| Etapa | Concept ID | Mediana (p50) | Preventivo (p75) | Crítico (p90) | Máx histórico |
|---|---|---|---|---|---|
| TODO: completar con resultado real | TODO | TODO | TODO | TODO | TODO |

## 4. Resumen operativo diario de saturación

Comportamiento de la ocupación diaria agregada por etapa:

| Etapa | Concept ID | Días observados | Censo máx promedio | Horas/día amarillo | Horas/día rojo | % Días alerta roja |
|---|---|---|---|---|---|---|
| TODO: completar con resultado real | TODO | TODO | TODO | TODO | TODO | TODO |
