-- Duración de las etapas por día de inicio, tipo de etapa y tipo de visita, en [:desde, :hasta).
-- Muestra si los tiempos se alargan en ciertos días (cuellos de botella). Solo agregados.
-- Se excluyen etapas sin fin o con fin antes del inicio (ver docs/calidad_datos.md).
SELECT
    d.visit_detail_start_datetime::DATE AS fecha,
    d.visit_detail_concept_id,
    v.visit_concept_id,
    COUNT(*) AS etapas,
    AVG(EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime)) / 3600.0)
        AS horas_media,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime))
    ) / 3600.0 AS horas_p50,
    PERCENTILE_CONT(0.9) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime))
    ) / 3600.0 AS horas_p90
FROM {esquema}.visit_detail AS d
JOIN {esquema}.visit_occurrence AS v ON v.visit_occurrence_id = d.visit_occurrence_id
WHERE d.visit_detail_start_datetime >= :desde
  AND d.visit_detail_start_datetime < :hasta
  AND d.visit_detail_end_datetime >= d.visit_detail_start_datetime
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3
