-- Etapas (visit_detail) por tipo de visita: qué subprocesos existen y cuánto duran.
SELECT
    v.visit_concept_id,
    d.visit_detail_concept_id,
    c.concept_name AS etapa,
    COUNT(*) AS registros,
    COUNT(DISTINCT d.visit_occurrence_id) AS visitas,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime)) / 3600.0
    ) AS duracion_mediana_h,
    AVG((d.visit_detail_end_datetime IS NULL)::INT) AS pct_sin_fin
FROM {esquema}.visit_detail AS d
JOIN {esquema}.visit_occurrence AS v ON v.visit_occurrence_id = d.visit_occurrence_id
LEFT JOIN {esquema}.concept AS c ON c.concept_id = d.visit_detail_concept_id
GROUP BY 1, 2, 3
ORDER BY 1, registros DESC
