-- Salidas de cada etapa (visit_detail) por hora, en una ventana [:desde, :hasta).
SELECT
    DATE_TRUNC('hour', d.visit_detail_end_datetime) AS hora,
    d.visit_detail_concept_id,
    COUNT(*) AS salidas
FROM {esquema}.visit_detail AS d
WHERE d.visit_detail_end_datetime >= :desde
  AND d.visit_detail_end_datetime < :hasta
  AND d.visit_detail_end_datetime >= d.visit_detail_start_datetime
GROUP BY 1, 2
ORDER BY 1, 2
