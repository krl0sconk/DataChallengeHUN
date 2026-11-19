-- Duración de las etapas por día de inicio, tipo de etapa y tipo de visita, en [:desde, :hasta).
-- Muestra si los tiempos se alargan en ciertos días (cuellos de botella). Solo agregados.
-- Se excluyen etapas sin fin o con fin antes del inicio (ver docs/calidad_datos.md)
-- y duraciones extremas por encima de p99.9 por tipo de etapa (alineado con 14 y 15).
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
    d.visit_detail_start_datetime::DATE AS fecha,
    d.visit_detail_concept_id,
    v.visit_concept_id,
    COUNT(*) AS etapas,
    AVG(EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime)) / 3600.0)
        AS horas_media,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime))
    ) / 3600.0 AS horas_p50,
    PERCENTILE_CONT(0.9) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime))
    ) / 3600.0 AS horas_p90
FROM {esquema}.visit_detail AS d
JOIN umbrales_p999 AS u
  ON u.visit_detail_concept_id = d.visit_detail_concept_id
LEFT JOIN {esquema}.visit_occurrence AS v
  ON v.visit_occurrence_id = d.visit_occurrence_id
WHERE d.visit_detail_start_datetime >= :desde
  AND d.visit_detail_start_datetime < :hasta
  AND d.visit_detail_end_datetime IS NOT NULL
  AND d.visit_detail_end_datetime >= d.visit_detail_start_datetime
  AND EXTRACT(EPOCH FROM (d.visit_detail_end_datetime - d.visit_detail_start_datetime)) / 3600.0
      <= u.max_horas_p999
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3
