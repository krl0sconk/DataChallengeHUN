# Hallazgos del flujo de pacientes

- **Tarea:** #13 Exploración inicial del flujo · Sprint 1 (sigue en el Sprint 2 con el análisis de cuellos de botella)
- **Responsable:** Juan
- **Fuente:** `notebooks/01_exploracion/01_exploracion_jn_flujo.ipynb` · figuras en `reports/figures/exploracion/`

Solo agregados. Cada hallazgo dice de qué gráfica sale. Sirven de base empírica para la formulación del modelo y análisis de cuellos de botella del Sprint 2.

## Cuándo llegan los pacientes

- **Patrón semanal y horario (`01_llegadas_dia_hora.png`):**
  - **Urgencias (9203):** Marcado pico matutino entre las 08:00 y las 14:00 (con máximo entre las 10:00 y las 11:00 de ~25–30 ingresos/hora). Disminuye de forma continua durante la noche y madrugada. Por día de la semana, el lunes es el día de mayor afluencia (16,49 % del volumen semanal), decreciendo progresivamente hasta el domingo (11,11 %).
  - **Rehabilitación ambulatoria (581479):** Actividad 100 % diurna concentrada de lunes a viernes de 07:00 a 17:00 (pico entre 08:00 y 10:00). Los sábados registran actividad reducida matutina (3,66 %) y los domingos es prácticamente nula (0,08 %).
  - **Urgencias - tratamiento (3045729):** Sigue un patrón diurno similar a urgencias, con volumen sostenido hasta horas de la tarde.
- **Evolución y estacionalidad anual (`02_tendencia.png`):**
  - Volumen histórico sostenido entre 2023 y 2026.
  - Valles estacionales consistentes y pronunciados en Semana Santa, Carnaval de Barranquilla (lunes y martes) y festividades de fin de año (24–25 dic y 31 dic–1 ene).
  - Crecimiento tendencial progresivo en el volumen de consultas de rehabilitación ambulatoria a partir de 2024.

## Quién llega

- **Diferencias demográficas por servicio (`llegadas_diarias_perfil`):**
  - **Urgencias:** Mayor volumen en mujeres jóvenes de 18–39 años (23,9 % del total del servicio) y hombres de 18–39 años (15,7 %). La población pediátrica (0–17 años) representa un notable 26,0 % combinado (13,6 % niños, 12,4 % niñas). Adultos de 40–64 años suman 22,9 % y mayores de 65+ suman 11,6 %.
  - **Hospitalización:** Marcado predominio femenino en edad adulta (40–64 años: 24,7 % mujeres vs. 13,7 % hombres; 18–39 años: 14,2 % mujeres vs. 11,1 % hombres). En adultos mayores (65+), las mujeres representan 10,6 % vs. 7,4 % hombres.
  - **Rehabilitación ambulatoria:** Alta participación pediátrica (0–17 años: 15,3 % niños, 11,3 % niñas = 26,6 % total). En adultos predomina el sexo femenino (18–39 años: 18,9 % F vs. 12,1 % M; 40–64 años: 18,3 % F vs. 11,4 % M).
  - **Urgencias - tratamiento:** Fuerte concentración pediátrica: el grupo de 0–17 años representa el **41,6 %** de todos los pacientes atendidos en esta área (22,0 % niños, 19,6 % niñas).

## Dónde se demora la atención

- **Duración de etapas según franja horaria (`03_duracion_etapas_franja.png`):**
   - En **Hospitalización (9201)**, el reporte consolidado registra p50 46.0 h y p90 188.2 h. Las diferencias por franja motivan evaluar rondas de alta y trámites de egreso, sin atribuir causalidad. La [simulación horaria de altas tempranas](resultados/optimizacion.md#ley-de-little-y-altas-matutinas) cuantifica esta hipótesis: adelantar el 35% de las altas elegibles de 14–20 h a 08–12 h reduce las horas rojas de 9.79% a 6.89%, sin reducir el pico histórico de 378 pacientes.
  - En **Urgencia - tratamiento (3045729)**, la estancia en observación se alarga en pacientes que ingresan en la tarde/noche (el p90 se eleva de 1,2 h hasta más de 12–15 h).
- **Esperas y cuellos de botella en transiciones (`transiciones_etapas`):**
   - La transición **Treatment urgency (3045729) → Inpatient Visit (9201)** registra **47.670 pasos**, mediana ponderada mensual 0.0 h y **p90 mensual ponderado 24.45 h** (24.5 h a una decimal). `espera_h = start_siguiente - end_anterior` en OMOP: puede incluir solapamientos negativos y no mide necesariamente asignación de cama ni boarding clínico. El p90 es un promedio de percentiles mensuales ponderado por pasos, no el percentil exacto de todos los registros. La correlación mensual con censo es **r = -0.30**, por lo que no respalda atribuir estas demoras a saturación. Véanse el [análisis empírico](resultados/optimizacion.md#urgencias--hospitalización) y la [simulación de rondas de alta](resultados/optimizacion.md#ley-de-little-y-altas-matutinas).
  - La transición **Urgencias → Urgencias - tratamiento** es inmediata (mediana 0,0 h, p90 0,0 h), confirmando que el paso a sala de observación o hidratación post-triaje no sufre cuellos de botella iniciales.

## Dónde parece haber saturación

- **Separación entre mediana y p90 del censo (`04_censo_etapas.png`):**
   - **Urgencia - tratamiento (3045729):** El [censo consolidado](resultados/saturacion.md) tiene mediana **219.0**, p75 **260.0** y p90 **300.0** pacientes concurrentes. Reemplaza las estimaciones preliminares de la exploración; no identifica por sí solo las causas clínicas de permanencia.
   - **Hospitalización (9201):** Mediana **288.0**, p75 **306.0** y p90 **319.0** pacientes concurrentes. La Ley de Little aporta un contraste independiente: **83.93 ingresos/día × 81.30 h / 24 ≈ 284.29 pacientes**, calculado con tasas sin redondear. La coincidencia respalda el nivel global, sin eliminar el posible sesgo de estancias extremas ni equivaler a capacidad instalada.
  - **Urgencias (9203):** Mantiene una rotación rápida (estancia p50 de ~6 minutos), pero registra sobrecarga puntual del censo entre las 10:00 y las 14:00 horas.

## Contraste con la visita al hospital

- La observación directa en instalaciones del HUN corrobora los hallazgos: la sala de observación de urgencias (especialmente el área pediátrica y de rehidratación) experimenta saturación vespertina por acumulación de ingresos matutinos aún no dados de alta.
- La consulta de rehabilitación opera con agenda previa de citas programadas, por lo que su flujo es predecible entre semana y altamente sensible a la declaración de días festivos y festejos de Carnaval.

## Preguntas para el Sprint 2

- ¿Cuáles son los diagnósticos (`condition_concept_id`) y procedimientos (`procedure_concept_id`) con mayor correlación con estancias prolongadas (> 24 h en urgencia-tratamiento y > 7 días en hospitalización)?
- ¿Cómo impacta la predicción de llegadas con horizonte de 7 días en la anticipación de días con semáforo rojo en censo hospitalario?
- ¿Se puede construir una métrica de alerta temprana en el dashboard combinando el modelo de demanda diaria con los umbrales de saturación p75 y p90?
