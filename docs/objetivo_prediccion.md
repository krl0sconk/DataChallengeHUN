# Objetivo de predicción

- **Estado:** borrador. Se cierra con la primera sesión de base de datos (sección *Pendiente de los datos*).
- **Responsable:** Krlos · se comparte con Daniel (web y validación) y Juan (análisis).
- **Fecha:** 2026-10-15 · Sprint 1

## Qué predecimos

### 1. Demanda: llegadas por servicio

| | Definición |
|---|---|
| **Variable** | Número de visitas que **empiezan** (`visit_start_datetime`) por tipo de visita (`visit_concept_id`) |
| **Unidad principal** | Por **día** |
| **Unidad secundaria** | Por **hora**, solo si las horas de la base son reales (ver pendientes) |
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

## Pendiente de los datos (cierra esta tarea)

Se resuelve con `python -m hun.data.extraer inventario` (una sesión corta de VPN):

- [ ] Fecha de inicio y de corte de `visit_occurrence` → decide si se predice el futuro real.
- [ ] Tipos de visita que existen y su volumen → qué series se modelan (las de muy poco volumen se agrupan).
- [ ] Si las horas son reales (`precision_horas`) → si existe el modelo horario.
- [ ] Huecos o cambios bruscos por mes → qué periodo se usa para entrenar.
- [ ] Duración p50 / p90 por tipo → calentamiento del censo y si el censo tiene sentido por servicio.
- [ ] Si `visit_detail` trae etapas finas → si hay censo por etapa (triage, observación…).
