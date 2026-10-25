-- Auditoría: nulos por columna clave en las tablas que usa el proyecto.
-- Devuelve solo conteos (tabla, columna, filas, nulos). Ninguna fila de paciente.
SELECT 'visit_occurrence' AS tabla, x.columna, x.filas, x.nulos
FROM (
    SELECT COUNT(*) AS filas,
           COUNT(*) - COUNT(visit_occurrence_id) AS n_id,
           COUNT(*) - COUNT(person_id) AS n_persona,
           COUNT(*) - COUNT(visit_concept_id) AS n_tipo,
           COUNT(*) - COUNT(visit_start_datetime) AS n_inicio,
           COUNT(*) - COUNT(visit_end_datetime) AS n_fin,
           COUNT(*) - COUNT(provider_id) AS n_profesional
    FROM {esquema}.visit_occurrence
) AS t
CROSS JOIN LATERAL (VALUES
    ('visit_occurrence_id', t.filas, t.n_id),
    ('person_id', t.filas, t.n_persona),
    ('visit_concept_id', t.filas, t.n_tipo),
    ('visit_start_datetime', t.filas, t.n_inicio),
    ('visit_end_datetime', t.filas, t.n_fin),
    ('provider_id', t.filas, t.n_profesional)
) AS x (columna, filas, nulos)
UNION ALL
SELECT 'visit_detail', x.columna, x.filas, x.nulos
FROM (
    SELECT COUNT(*) AS filas,
           COUNT(*) - COUNT(visit_detail_id) AS n_id,
           COUNT(*) - COUNT(visit_occurrence_id) AS n_visita,
           COUNT(*) - COUNT(visit_detail_concept_id) AS n_tipo,
           COUNT(*) - COUNT(visit_detail_start_datetime) AS n_inicio,
           COUNT(*) - COUNT(visit_detail_end_datetime) AS n_fin,
           COUNT(*) - COUNT(provider_id) AS n_profesional
    FROM {esquema}.visit_detail
) AS t
CROSS JOIN LATERAL (VALUES
    ('visit_detail_id', t.filas, t.n_id),
    ('visit_occurrence_id', t.filas, t.n_visita),
    ('visit_detail_concept_id', t.filas, t.n_tipo),
    ('visit_detail_start_datetime', t.filas, t.n_inicio),
    ('visit_detail_end_datetime', t.filas, t.n_fin),
    ('provider_id', t.filas, t.n_profesional)
) AS x (columna, filas, nulos)
UNION ALL
SELECT 'person', x.columna, x.filas, x.nulos
FROM (
    SELECT COUNT(*) AS filas,
           COUNT(*) - COUNT(person_id) AS n_id,
           COUNT(*) - COUNT(gender_concept_id) AS n_sexo,
           COUNT(*) - COUNT(year_of_birth) AS n_nacimiento
    FROM {esquema}.person
) AS t
CROSS JOIN LATERAL (VALUES
    ('person_id', t.filas, t.n_id),
    ('gender_concept_id', t.filas, t.n_sexo),
    ('year_of_birth', t.filas, t.n_nacimiento)
) AS x (columna, filas, nulos)
