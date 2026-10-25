-- Los 500 conceptos más frecuentes de mediciones (measurement_concept_id), con su nombre.
-- measurement es la tabla más grande: si se pasa del tiempo límite, subir HUN_DB_TIMEOUT_S en .env.
-- Se omiten los conceptos con menos de 10 registros (celdas pequeñas: pueden identificar a alguien).
WITH usos AS (
    SELECT measurement_concept_id AS concept_id, COUNT(*) AS registros
    FROM {esquema}.measurement
    GROUP BY 1
    HAVING COUNT(*) >= 10
    ORDER BY registros DESC
    LIMIT 500
)
SELECT 'measurement_concept_id' AS columna, u.concept_id, c.concept_name, c.domain_id, c.vocabulary_id, u.registros
FROM usos AS u
LEFT JOIN {esquema}.concept AS c ON c.concept_id = u.concept_id
ORDER BY u.registros DESC
