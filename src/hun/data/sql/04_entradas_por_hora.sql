-- Llegadas (inicio de visita) por hora y tipo de visita, en una ventana [:desde, :hasta).
-- Base del modelo de demanda y de la línea base. Se extrae por meses para no cargar la base.
SELECT
    DATE_TRUNC('hour', v.visit_start_datetime) AS hora,
    v.visit_concept_id,
    COUNT(*) AS entradas,
    -- solo visitas con salida válida: son las que entran al cálculo del censo
    COUNT(*) FILTER (
        WHERE v.visit_end_datetime IS NOT NULL
          AND v.visit_end_datetime >= v.visit_start_datetime
    ) AS entradas_con_salida
FROM {esquema}.visit_occurrence AS v
WHERE v.visit_start_datetime >= :desde
  AND v.visit_start_datetime < :hasta
GROUP BY 1, 2
ORDER BY 1, 2
