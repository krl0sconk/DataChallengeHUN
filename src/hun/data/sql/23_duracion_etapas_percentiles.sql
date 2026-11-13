-- Percentiles y máximo de duración de las etapas (visit_detail) por tipo de etapa.
-- Excluye etapas sin fin o con fin anterior al inicio (visit_detail_end_datetime >= visit_detail_start_datetime).
-- Sirve para determinar el periodo de calentamiento del censo (> horas_p99).
WITH d AS (
    SELECT
        visit_detail_concept_id,
        EXTRACT(EPOCH FROM (visit_detail_end_datetime - visit_detail_start_datetime)) / 3600.0
            AS horas
    FROM {esquema}.visit_detail
    WHERE visit_detail_start_datetime IS NOT NULL
      AND visit_detail_end_datetime IS NOT NULL
      AND visit_detail_end_datetime >= visit_detail_start_datetime
)
SELECT
    visit_detail_concept_id,
    COUNT(*) AS etapas,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY horas) AS horas_p50,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY horas) AS horas_p90,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY horas) AS horas_p99,
    MAX(horas) AS horas_max
FROM d
GROUP BY visit_detail_concept_id
ORDER BY etapas DESC
