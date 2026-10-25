-- Auditoría de edades y sexo, en grupos amplios (décadas) para no exponer a nadie.
--   edad_imposible: la visita es anterior al año de nacimiento o la edad pasa de 110 años.
SELECT
    p.gender_concept_id,
    (FLOOR((EXTRACT(YEAR FROM v.visit_start_datetime) - p.year_of_birth) / 10) * 10)::INT
        AS decada_edad,
    COUNT(*) AS visitas,
    COUNT(DISTINCT v.person_id) AS pacientes,
    COUNT(*) FILTER (
        WHERE EXTRACT(YEAR FROM v.visit_start_datetime) < p.year_of_birth
           OR EXTRACT(YEAR FROM v.visit_start_datetime) - p.year_of_birth > 110
    ) AS edad_imposible
FROM {esquema}.visit_occurrence AS v
LEFT JOIN {esquema}.person AS p ON p.person_id = v.person_id
GROUP BY 1, 2
ORDER BY 1, 2
