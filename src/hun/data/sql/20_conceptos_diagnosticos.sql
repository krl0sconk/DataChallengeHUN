-- Los 1000 conceptos más frecuentes de diagnósticos (condition_concept_id), con su nombre.
-- Se omiten los conceptos con menos de 10 registros (celdas pequeñas: pueden identificar a alguien).
WITH usos AS (
    SELECT condition_concept_id AS concept_id, COUNT(*) AS registros
    FROM {esquema}.condition_occurrence
    GROUP BY 1
    HAVING COUNT(*) >= 10
    ORDER BY registros DESC
    LIMIT 1000
)
SELECT 'condition_concept_id' AS columna, u.concept_id, c.concept_name, c.domain_id, c.vocabulary_id, u.registros
FROM usos AS u
LEFT JOIN {esquema}.concept AS c ON c.concept_id = u.concept_id
ORDER BY u.registros DESC
