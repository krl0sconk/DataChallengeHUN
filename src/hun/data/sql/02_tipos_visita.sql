-- Tipos de visita (servicios) con su nombre, volumen y duración agregada.
SELECT
    v.visit_concept_id,
    c.concept_name,
    COUNT(*) AS visitas,
    MIN(v.visit_start_datetime) AS primera,
    MAX(v.visit_start_datetime) AS ultima,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (v.visit_end_datetime - v.visit_start_datetime)) / 3600.0
    ) AS duracion_mediana_h,
    PERCENTILE_CONT(0.9) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (v.visit_end_datetime - v.visit_start_datetime)) / 3600.0
    ) AS duracion_p90_h,
    AVG((v.visit_end_datetime IS NULL)::INT) AS pct_sin_fin,
    COUNT(DISTINCT v.person_id) AS pacientes
FROM {esquema}.visit_occurrence AS v
LEFT JOIN {esquema}.concept AS c ON c.concept_id = v.visit_concept_id
GROUP BY 1, 2
ORDER BY visitas DESC
