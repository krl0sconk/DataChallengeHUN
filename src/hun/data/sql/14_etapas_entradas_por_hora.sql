-- Entradas a cada etapa (visit_detail) por hora, en una ventana [:desde, :hasta).
-- Con las salidas (15) se reconstruye el censo por etapa: pacientes adentro de cada área.
-- visit_occurrence no sirve para el censo porque su fin es igual a su inicio.
SELECT
    DATE_TRUNC('hour', d.visit_detail_start_datetime) AS hora,
    d.visit_detail_concept_id,
    COUNT(*) AS entradas,
    COUNT(*) FILTER (
        WHERE d.visit_detail_end_datetime IS NOT NULL
          AND d.visit_detail_end_datetime >= d.visit_detail_start_datetime
    ) AS entradas_con_salida
FROM {esquema}.visit_detail AS d
WHERE d.visit_detail_start_datetime >= :desde
  AND d.visit_detail_start_datetime < :hasta
GROUP BY 1, 2
ORDER BY 1, 2
