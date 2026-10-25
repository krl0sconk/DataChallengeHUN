-- Etapas que empiezan por día y tipo de etapa: misma prueba de fechas sobre visit_detail,
-- por si esa tabla se anonimizó con un corrimiento distinto al de visit_occurrence.
SELECT
    d.visit_detail_start_datetime::DATE AS fecha,
    d.visit_detail_concept_id,
    COUNT(*) AS etapas
FROM {esquema}.visit_detail AS d
GROUP BY 1, 2
ORDER BY 1, 2
