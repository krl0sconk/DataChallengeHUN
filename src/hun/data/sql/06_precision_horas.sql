-- ¿Las fechas traen hora real? Si muchas visitas empiezan a las 00:00:00 o en minuto 0,
-- la hora puede ser de relleno o redondeada, y el modelo horario no tendría sentido.
-- También muestra la distribución por día de la semana (detecta fechas desplazadas por anonimización).
SELECT
    v.visit_concept_id,
    COUNT(*) AS visitas,
    AVG((v.visit_start_datetime::TIME = TIME '00:00:00')::INT) AS pct_inicio_medianoche,
    AVG((EXTRACT(MINUTE FROM v.visit_start_datetime) = 0)::INT) AS pct_inicio_minuto_cero,
    AVG((v.visit_end_datetime::TIME = TIME '00:00:00')::INT) AS pct_fin_medianoche,
    AVG((EXTRACT(ISODOW FROM v.visit_start_datetime) = 1)::INT) AS pct_lunes,
    AVG((EXTRACT(ISODOW FROM v.visit_start_datetime) = 7)::INT) AS pct_domingo
FROM {esquema}.visit_occurrence AS v
GROUP BY 1
ORDER BY visitas DESC
