-- Duración de las etapas según el día de la semana y la hora en que empiezan (toda la historia).
-- Responde "¿en qué franjas se demora más la atención?". Solo agregados.
SELECT
    d.visit_detail_concept_id,
    v.visit_concept_id,
    EXTRACT(ISODOW FROM d.visit_detail_start_datetime)::INT AS dia_semana,  -- 1 = lunes
    EXTRACT(HOUR FROM d.visit_detail_start_datetime)::INT AS hora,
    COUNT(*) AS etapas,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime))
    ) / 3600.0 AS horas_p50,
    PERCENTILE_CONT(0.9) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime))
    ) / 3600.0 AS horas_p90
FROM {esquema}.visit_detail AS d
JOIN {esquema}.visit_occurrence AS v ON v.visit_occurrence_id = d.visit_occurrence_id
WHERE d.visit_detail_end_datetime >= d.visit_detail_start_datetime
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4
