-- Llegadas por día, tipo de visita, sexo y grupo de edad, en una ventana [:desde, :hasta).
-- Alimenta el dashboard (perfil de quién llega) y el modelo de demanda. Solo conteos.
-- Grupos: 'sin dato' (sin año de nacimiento), 'invalida' (edad imposible), 0-17, 18-39, 40-64, 65+.
SELECT
    v.visit_start_datetime::DATE AS fecha,
    v.visit_concept_id,
    p.gender_concept_id,
    CASE
        WHEN p.year_of_birth IS NULL THEN 'sin dato'
        -- misma regla que 10_auditoria_personas.sql: visita antes de nacer o más de 110 años
        WHEN EXTRACT(YEAR FROM v.visit_start_datetime) < p.year_of_birth
          OR EXTRACT(YEAR FROM v.visit_start_datetime) - p.year_of_birth > 110 THEN 'invalida'
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
