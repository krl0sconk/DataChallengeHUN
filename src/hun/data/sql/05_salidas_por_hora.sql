-- Salidas (fin de visita) por hora y tipo de visita, en una ventana [:desde, :hasta).
-- Con entradas y salidas acumuladas se reconstruye el censo (pacientes adentro) por hora,
-- que es la medida directa de saturación, sin bajar visitas individuales.
SELECT
    DATE_TRUNC('hour', v.visit_end_datetime) AS hora,
    v.visit_concept_id,
    COUNT(*) AS salidas
FROM {esquema}.visit_occurrence AS v
WHERE v.visit_end_datetime >= :desde
  AND v.visit_end_datetime < :hasta
  AND v.visit_end_datetime >= v.visit_start_datetime
GROUP BY 1, 2
ORDER BY 1, 2
