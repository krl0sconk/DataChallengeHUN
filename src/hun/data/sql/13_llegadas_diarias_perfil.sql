-- Llegadas por día, tipo de visita, sexo y grupo de edad, en una ventana [:desde, :hasta).
-- Alimenta el dashboard (perfil de quién llega) y el modelo de demanda. Solo conteos.
SELECT
    v.visit_start_datetime::DATE AS fecha,
    v.visit_concept_id,
    p.gender_concept_id,
    CASE
        WHEN p.year_of_birth IS NULL THEN 'sin dato'
        WHEN EXTRACT(YEAR FROM v.visit_start_datetime) - p.year_of_birth < 18 THEN '0-17'
        WHEN EXTRACT(YEAR FROM v.visit_start_datetime) - p.year_of_birth < 40 THEN '18-39'
        WHEN EXTRACT(YEAR FROM v.visit_start_datetime) - p.year_of_birth < 65 THEN '40-64'
        ELSE '65+'
    END AS grupo_edad,
    COUNT(*) AS visitas
FROM {esquema}.visit_occurrence AS v
LEFT JOIN {esquema}.person AS p ON p.person_id = v.person_id
WHERE v.visit_start_datetime >= :desde
  AND v.visit_start_datetime < :hasta
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4
