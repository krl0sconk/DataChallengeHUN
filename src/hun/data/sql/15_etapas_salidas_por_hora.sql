-- Salidas de cada etapa (visit_detail) por hora, en una ventana [:desde, :hasta).
-- Aplica el mismo recorte de duraciones extremas (> p99.9 por etapa) que 14_etapas_entradas_por_hora.sql
-- para mantener conservado el balance entradas - salidas en la reconstrucción del censo.
WITH umbrales_p999 AS (
    SELECT
        visit_detail_concept_id,
        PERCENTILE_CONT(0.999) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (visit_detail_end_datetime - visit_detail_start_datetime)) / 3600.0
        ) AS max_horas_p999
    FROM {esquema}.visit_detail
    WHERE visit_detail_start_datetime IS NOT NULL
      AND visit_detail_end_datetime IS NOT NULL
      AND visit_detail_end_datetime >= visit_detail_start_datetime
    GROUP BY visit_detail_concept_id
)
SELECT
    DATE_TRUNC('hour', d.visit_detail_end_datetime) AS hora,
    d.visit_detail_concept_id,
    COUNT(*) AS salidas
FROM {esquema}.visit_detail AS d
JOIN umbrales_p999 AS u
  ON u.visit_detail_concept_id = d.visit_detail_concept_id
WHERE d.visit_detail_end_datetime >= :desde
  AND d.visit_detail_end_datetime < :hasta
  AND d.visit_detail_end_datetime >= d.visit_detail_start_datetime
  AND EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime)) / 3600.0
      <= u.max_horas_p999
GROUP BY 1, 2
ORDER BY 1, 2
