# Objetivo de predicción

- **Estado:** Cerrado (2026-10-15, con el inventario de la base; ver *Resultado del inventario*).
- **Responsable:** Krlos · se comparte con Daniel (web y validación) y Juan (análisis).
- **Fecha:** 2026-10-15 · Sprint 1

## Qué predecimos

### 1. Demanda: llegadas por servicio

| | Definición |
|---|---|
| **Variable** | Número de visitas que **empiezan** (`visit_start_datetime`) por tipo de visita (`visit_concept_id`) |
| **Unidad principal** | Por **día** |
| **Unidad secundaria** | Por **hora**: las horas de urgencias son reales (ver inventario); en rehabilitación son citas programadas |
| **Horizonte** | 1 a 7 días desde el momento de la predicción |
| **Salida** | Valor esperado + intervalo p10–p90 ("entre 40 y 55 pacientes") |

Por qué el día como unidad principal: los factores externos (clima, festivos, Carnaval, epidemiología)
son diarios, las series diarias son más estables, y es la escala en que se planean turnos. La hora sirve
para el perfil dentro del día ("el pico es de 6 a 11 pm"), y se puede sacar del día con la distribución
horaria histórica de ese día de la semana si el modelo horario no supera a la línea base.

### 2. Ocupación: censo por servicio (base de la saturación)

| | Definición |
|---|---|
| **Variable** | Pacientes **adentro** al final de cada hora por tipo de visita (entradas acumuladas − salidas acumuladas) |
| **Resumen diario** | Censo máximo del día y horas por encima del umbral |
| **Saturación** | Semáforo según percentiles históricos del propio servicio: verde < p75, amarillo p75–p90, rojo > p90 |
| **Horizonte** | 1 a 7 días |

Como la base no trae camas ni capacidad instalada, la saturación es **relativa a la historia** del servicio.
Si el hospital comparte capacidades, el umbral pasa a ser "% de ocupación" sin cambiar el resto.

### 3. Tiempos: duración de la visita (Sprint 2+)

Duración `visit_end_datetime − visit_start_datetime` por tipo de visita, según perfil del paciente
(edad, sexo, diagnósticos, procedimientos) y la carga del hospital en ese momento. Alimenta el censo
futuro (cuánto se quedan los que llegan) y el análisis de cuellos de botella con las etapas de
`visit_detail`.

## Cómo se evalúa

- **Validación walk-forward** (`src/hun/models/validacion.py`): orígenes cada 14 días durante el último año
  de datos, entrenamiento con todo lo anterior al origen, prueba en los 7 días siguientes.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Se reporta también MAE, sesgo y, para los intervalos,
  la cobertura real del p10–p90 (debe rondar el 80 %).
- **Referencia:** la línea base (`src/hun/models/linea_base.py`, promedio del mismo día y hora en semanas
  anteriores). Un modelo que no la supere no se usa.
- **Factores externos:** solo entran si pasan el protocolo (`docs/protocolo_factores_externos.md`).

### Clima en la evaluación vs. en producción

En la evaluación histórica se usa el clima **observado** de cada día, que es mejor que el pronóstico que
tendría el hospital en la vida real. Para no sobrevender el modelo: (a) se reporta el error con y sin
clima, y (b) en la web, el clima futuro sale del pronóstico de Open-Meteo (hasta 16 días).

## Predecir el futuro real

Depende de la **fecha de corte** de la base:

- Si los datos llegan hasta hace pocas semanas, la web predice los próximos 7 días reales con el
  calendario, el pronóstico del clima y los rezagos disponibles.
- Si la base termina hace meses, los rezagos semanales ya no existen para hoy. Entonces la web muestra la
  predicción para cualquier fecha dentro del rango de los datos (re-simulando "qué habría dicho el modelo
  ese día") y el simulador "¿qué pasa si?" para fechas futuras con valores que el usuario elige.

## Resultado del inventario (resuelto el 2026-10-15)

Cifras agregadas de `python -m hun.data.extraer inventario` y `flujo_horario`.

- [x] **Inicio y corte.** `visit_occurrence` va del 2023-01-01 al **2026-07-17** (último día a medias; último
  día completo 2026-07-16): unos 3,5 años. Después hay unas pocas visitas sueltas hasta 2026-08-13 que se
  descartan (`fecha_corte` en `src/hun/data/agregados.py`), o se leerían como semanas de ceros.
  Como la base termina ~3 meses antes de hoy, **la web no predice el futuro real con rezagos**: aplica la
  segunda opción de *Predecir el futuro real* (re-simulación dentro del rango + simulador "¿qué pasa si?").
- [x] **Tipos de visita y volumen.**

  | Tipo | Visitas | Por día | Decisión |
  |---|---|---|---|
  | 581479 Ambulatory Rehabilitation Visit | 1 089 461 | ~827 | Se modela |
  | 9203 Emergency Room Visit | 598 088 | ~443 | Se modela |
  | 3045729 Treatment urgency {Diagnosis} | 17 858 | ~15 | Se modela por día; por hora es muy ruidoso |
  | 9201 Inpatient Visit | 592 | ~0,5 | Se agrupa en "Otros", no se evalúa |
  | 0 No matching concept | 2 | ~0 | Se agrupa en "Otros" |

  "Otros" son los tipos con menos de 1 llegada al día (`agrupar_bajo_volumen`). Su WAPE no tiene sentido
  (el real es casi siempre 0) y no entra al promedio de decisión.
- [x] **¿Horas reales?** En urgencias sí: 0,0003 % de inicios a medianoche y 1,7 % en minuto 0 (lo esperado
  por azar, 1,7 %), con el perfil de un servicio de urgencias (pico 8–11 h, mínimo 3–4 h). En rehabilitación
  el 34 % empieza en minuto 0: son citas programadas, la hora es real pero cuadriculada. **Existe el modelo
  horario** (urgencias), con el día como unidad principal.
- [x] **Huecos y cambios por mes.** No hay meses vacíos entre 2023-01 y 2026-06; julio de 2026 está
  incompleto (corte el 17). Hospitalización (9201) tuvo entre 6 y 52 visitas al mes hasta 2025-01 y casi ninguna
  desde 2025-02. Las fechas no parecen desplazadas: urgencias tiene 11 % de visitas en domingo y
  rehabilitación 0,08 %. Se entrena con todo el rango.
- [x] **Duración p50 / p90 por tipo.** En `visit_occurrence` **la mediana y el p90 son 0 h en todos los
  tipos y no hay registros sin fin**: `visit_end_datetime` es igual a `visit_start_datetime`. Las salidas por
  hora coinciden con las entradas en todas las horas, así que **el censo reconstruido con `visit_occurrence`
  vale 0 siempre y no sirve para saturación**. Las duraciones reales están en `visit_detail`: mediana de
  ~16 h (hospitalización dentro de visitas de hospitalización) a ~46 h (dentro de urgencias), ~1,3 h en
  la etapa de urgencia-tratamiento de urgencias y ~3 min en la etapa de urgencias.
- [x] **¿`visit_detail` trae etapas finas?** Solo 4 conceptos, los mismos 4 tipos de visita
  (urgencias, urgencia-tratamiento, hospitalización, rehabilitación): no hay triage ni observación.
  Sí permite el censo "por etapa" (cuánto tiempo está un paciente en cada tipo de etapa dentro de una visita).

### Ajustes al objetivo

1. **Demanda:** sin cambios. Día como unidad principal; modelo horario evaluado para urgencias.
2. **Ocupación:** el censo ya no se reconstruye desde `visit_occurrence`. Se implementó exitosamente con las etapas de `visit_detail` (inicio y fin de cada etapa extraídas con `14_etapas_duracion_por_visita.sql`), con warm-up de 24 días para estabilizar el censo. Los resultados de saturación y capacidad relativa están documentados en `docs/resultados/saturacion.md`.
3. **Tiempos:** la duración de la visita completa tiene `end = start`; se analiza y modela la duración real de cada sub-etapa clínica (urgencias, urgencia-tratamiento y hospitalización/observación).
