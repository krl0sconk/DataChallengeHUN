-- Paso de una etapa a la siguiente dentro de la misma visita, por mes de inicio de la visita,
-- para visitas que empiezan en [:desde, :hasta).
-- espera = inicio de la etapa siguiente − fin de la anterior. Negativa = se solapan.
-- Es la medida directa de las esperas entre etapas. Solo agregados por par de etapas.
-- Las etapas con fechas inválidas se excluyen ANTES de ordenar: la etapa siguiente es la
-- siguiente válida (ver docs/calidad_datos.md, Reglas de limpieza).
WITH ordenadas AS (
    SELECT
        v.visit_concept_id,
        DATE_TRUNC('month', v.visit_start_datetime)::DATE AS mes,
        d.visit_detail_concept_id AS etapa,
        d.visit_detail_end_datetime AS fin,
        LEAD(d.visit_detail_concept_id) OVER w AS etapa_siguiente,
        LEAD(d.visit_detail_start_datetime) OVER w AS inicio_siguiente
    FROM {esquema}.visit_detail AS d
    JOIN {esquema}.visit_occurrence AS v ON v.visit_occurrence_id = d.visit_occurrence_id
    WHERE v.visit_start_datetime >= :desde
      AND v.visit_start_datetime < :hasta
      -- misma regla que 16 y 17: fuera las etapas sin fin o con fin antes del inicio
      -- (con esas fechas la espera hacia la siguiente etapa saldría inventada)
      AND d.visit_detail_end_datetime IS NOT NULL
      AND d.visit_detail_end_datetime >= d.visit_detail_start_datetime
    WINDOW w AS (
        PARTITION BY d.visit_occurrence_id
        ORDER BY d.visit_detail_start_datetime, d.visit_detail_id
    )
)
SELECT
    mes,
    visit_concept_id,
    etapa,
    COALESCE(etapa_siguiente, -1) AS etapa_siguiente,  -- -1 = fin de la visita
    COUNT(*) AS pasos,
    COUNT(*) FILTER (WHERE inicio_siguiente < fin) AS solapadas,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (inicio_siguiente - fin))
    ) / 3600.0 AS espera_h_p50,
    PERCENTILE_CONT(0.9) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (inicio_siguiente - fin))
    ) / 3600.0 AS espera_h_p90
FROM ordenadas
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, pasos DESC
