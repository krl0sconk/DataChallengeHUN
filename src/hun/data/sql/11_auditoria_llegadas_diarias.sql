-- Llegadas únicas (paciente, servicio, inicio) por día y tipo de visita, para la prueba de desplazamiento de fechas
-- (¿los festivos y el Carnaval caen donde deben?). Unas pocas miles de filas.
SELECT
    v.visit_start_datetime::DATE AS fecha,
    v.visit_concept_id,
    COUNT(DISTINCT (v.person_id, v.visit_concept_id, v.visit_start_datetime)) AS visitas
FROM {esquema}.visit_occurrence AS v
GROUP BY 1, 2
ORDER BY 1, 2
