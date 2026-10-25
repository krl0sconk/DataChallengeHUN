-- Tamaño aproximado de cada tabla del esquema OMOP (estimación del catálogo, no recorre las tablas).
-- Sirve para decidir qué se puede bajar completo y qué se agrega dentro del SQL.
SELECT
    c.relname AS tabla,
    c.reltuples::BIGINT AS filas_estimadas,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS tamano
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = '{esquema}'
  AND c.relkind IN ('r', 'p', 'v', 'm')
ORDER BY c.reltuples DESC
