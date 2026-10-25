-- Nombres de los conceptos de visitas, etapas y datos demográficos, con su frecuencia.
-- Los conceptos son el vocabulario OMOP (no son datos de pacientes). Alimenta src/hun/data/conceptos.py.
WITH usos AS (
    SELECT 'visit_concept_id' AS columna, visit_concept_id AS concept_id, COUNT(*) AS registros
    FROM {esquema}.visit_occurrence GROUP BY 2
    UNION ALL
    SELECT 'visit_detail_concept_id', visit_detail_concept_id, COUNT(*)
    FROM {esquema}.visit_detail GROUP BY 2
    UNION ALL
    SELECT 'gender_concept_id', gender_concept_id, COUNT(*) FROM {esquema}.person GROUP BY 2
    UNION ALL
    SELECT 'race_concept_id', race_concept_id, COUNT(*) FROM {esquema}.person GROUP BY 2
    UNION ALL
    SELECT 'ethnicity_concept_id', ethnicity_concept_id, COUNT(*) FROM {esquema}.person GROUP BY 2
)
SELECT u.columna, u.concept_id, c.concept_name, c.domain_id, c.vocabulary_id, u.registros
FROM usos AS u
LEFT JOIN {esquema}.concept AS c ON c.concept_id = u.concept_id
ORDER BY u.columna, u.registros DESC
