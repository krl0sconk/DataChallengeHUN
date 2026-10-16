-- Cobertura temporal: visitas por mes y tipo de visita.
-- Responde: fecha de corte, huecos, cambios bruscos de volumen (posible desplazamiento por anonimización).
SELECT
    DATE_TRUNC('month', v.visit_start_datetime)::DATE AS mes,
    v.visit_concept_id,
    COUNT(*) AS visitas,
    COUNT(*) FILTER (WHERE v.visit_end_datetime IS NULL) AS sin_fecha_fin,
    COUNT(*) FILTER (WHERE v.visit_end_datetime < v.visit_start_datetime) AS fin_antes_de_inicio
FROM {esquema}.visit_occurrence AS v
GROUP BY 1, 2
ORDER BY 1, 2
