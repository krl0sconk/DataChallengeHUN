-- Auditoría: duplicados en visitas y etapas. Solo conteos.
--   ids_repetidos: identificadores que aparecen más de una vez (no debería pasar).
--   registros_repetidos: filas idénticas en sus campos clave (misma persona/visita, tipo e inicio),
--   contadas como "copias sobrantes" (si un registro aparece 3 veces, suma 2).
WITH v_ids AS (
    SELECT visit_occurrence_id, COUNT(*) AS n
    FROM {esquema}.visit_occurrence
    GROUP BY 1
    HAVING COUNT(*) > 1
),
v_reg AS (
    SELECT person_id, visit_concept_id, visit_start_datetime, COUNT(*) AS n
    FROM {esquema}.visit_occurrence
    GROUP BY 1, 2, 3
    HAVING COUNT(*) > 1
),
d_ids AS (
    SELECT visit_detail_id, COUNT(*) AS n
    FROM {esquema}.visit_detail
    GROUP BY 1
    HAVING COUNT(*) > 1
),
d_reg AS (
    SELECT visit_occurrence_id, visit_detail_concept_id, visit_detail_start_datetime,
           visit_detail_end_datetime, COUNT(*) AS n
    FROM {esquema}.visit_detail
    GROUP BY 1, 2, 3, 4
    HAVING COUNT(*) > 1
)
SELECT 'visit_occurrence' AS tabla, 'ids_repetidos' AS chequeo,
       COUNT(*) AS grupos, COALESCE(SUM(n - 1), 0) AS copias_sobrantes
FROM v_ids
UNION ALL
SELECT 'visit_occurrence', 'registros_repetidos', COUNT(*), COALESCE(SUM(n - 1), 0) FROM v_reg
UNION ALL
SELECT 'visit_detail', 'ids_repetidos', COUNT(*), COALESCE(SUM(n - 1), 0) FROM d_ids
UNION ALL
SELECT 'visit_detail', 'registros_repetidos', COUNT(*), COALESCE(SUM(n - 1), 0) FROM d_reg
