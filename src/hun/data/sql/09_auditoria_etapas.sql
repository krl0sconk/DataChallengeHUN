-- Auditoría de las etapas (visit_detail) por tipo de etapa y tipo de visita padre.
-- Es la tabla que reemplaza a visit_occurrence para tiempos y censo, así que se revisa a fondo:
-- fechas imposibles, etapas fuera de su visita, huérfanas y la distribución de duraciones.
-- Solo conteos y percentiles agregados.
WITH d AS (
    SELECT
        d.visit_detail_concept_id,
        v.visit_concept_id,
        v.visit_occurrence_id IS NULL AS huerfana,
        d.visit_detail_start_datetime AS inicio,
        d.visit_detail_end_datetime AS fin,
        v.visit_start_datetime AS inicio_visita,
        EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime)) / 3600.0
            AS horas
    FROM {esquema}.visit_detail AS d
    LEFT JOIN {esquema}.visit_occurrence AS v ON v.visit_occurrence_id = d.visit_occurrence_id
)
SELECT
    visit_detail_concept_id,
    visit_concept_id,
    COUNT(*) AS etapas,
    COUNT(*) FILTER (WHERE huerfana) AS huerfanas,
    COUNT(*) FILTER (WHERE fin IS NULL) AS sin_fin,
    COUNT(*) FILTER (WHERE horas < 0) AS fin_antes_de_inicio,
    COUNT(*) FILTER (WHERE horas = 0) AS duracion_cero,
    COUNT(*) FILTER (WHERE horas > 0 AND horas < 5.0 / 60) AS menos_5_min,
    COUNT(*) FILTER (WHERE horas >= 5.0 / 60 AND horas < 1) AS de_5_min_a_1_h,
    COUNT(*) FILTER (WHERE horas >= 1 AND horas < 6) AS de_1_a_6_h,
    COUNT(*) FILTER (WHERE horas >= 6 AND horas < 24) AS de_6_a_24_h,
    COUNT(*) FILTER (WHERE horas >= 24 AND horas < 72) AS de_1_a_3_d,
    COUNT(*) FILTER (WHERE horas >= 72 AND horas < 168) AS de_3_a_7_d,
    COUNT(*) FILTER (WHERE horas >= 168 AND horas < 720) AS de_7_a_30_d,
    COUNT(*) FILTER (WHERE horas >= 720) AS mas_30_d,
    -- la etapa empieza antes que su visita (más de 1 h de diferencia, para tolerar redondeos)
    COUNT(*) FILTER (WHERE inicio < inicio_visita - INTERVAL '1 hour') AS antes_de_la_visita,
    COUNT(*) FILTER (WHERE inicio::TIME = TIME '00:00:00') AS inicio_medianoche,
    COUNT(*) FILTER (WHERE fin::TIME = TIME '00:00:00') AS fin_medianoche,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY horas) FILTER (WHERE horas >= 0) AS horas_p50,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY horas) FILTER (WHERE horas >= 0) AS horas_p90,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY horas) FILTER (WHERE horas >= 0) AS horas_p99,
    MIN(inicio)::DATE AS primer_dia,
    MAX(inicio)::DATE AS ultimo_dia
FROM d
GROUP BY 1, 2
ORDER BY etapas DESC
