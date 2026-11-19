# Optimización operacional

## Erlang C

1/mu es un supuesto operativo paramétrico (15, 20 o 30 min), no una duración clínica observada. OMOP no contiene tabla de dotación (AI.md). Servidores = equipos activos equivalentes; no se conoce la plantilla actual. M/M/c supone llegadas Poisson, servicios exponenciales, cola única, estacionariedad y ausencia de abandono.

### Urgencias

Fuente: llegadas observadas por día y franja / 6 h (grilla con ceros).

| Franja | λ normal/h | λ p75/h | λ p90/h | c normal | c p75 | c p90 | Espera p90 (min) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Mañana (06-12h) | 29.250 | 35.333 | 39.667 | 12 | 14 | 15 | 6.094 |
| Tarde (12-18h) | 25.593 | 30.333 | 34.333 | 10 | 12 | 13 | 7.265 |
| Noche (18-24h) | 15.392 | 17.667 | 20.367 | 7 | 8 | 9 | 3.062 |
| Madrugada (00-06h) | 5.236 | 6.333 | 7.500 | 3 | 4 | 4 | 4.265 |

| 1/mu (min) | Franja pico | c normal | c p75 | c p90 | Δ p90 |
|---:|---|---:|---:|---:|---:|
| 15 | Mañana (06-12h) | 9 | 10 | 12 | 3 |
| 20 | Mañana (06-12h) | 12 | 14 | 15 | 3 |
| 30 | Mañana (06-12h) | 17 | 20 | 22 | 5 |

### Rehabilitacion

Fuente: llegadas observadas por día y franja / 6 h (grilla con ceros).

| Franja | λ normal/h | λ p75/h | λ p90/h | c normal | c p75 | c p90 | Espera p90 (min) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Mañana (06-12h) | 77.584 | 118.667 | 133.333 | 42 | 62 | 70 | 5.303 |
| Tarde (12-18h) | 58.174 | 95.667 | 108.000 | 32 | 51 | 57 | 5.905 |
| Noche (18-24h) | 1.442 | 2.333 | 3.333 | 2 | 3 | 3 | 6.745 |
| Madrugada (00-06h) | 0.255 | 0.333 | 0.667 | 1 | 1 | 2 | 0.857 |

| 1/mu (min) | Franja pico | c normal | c p75 | c p90 | Δ p90 |
|---:|---|---:|---:|---:|---:|
| 15 | Mañana (06-12h) | 21 | 31 | 35 | 14 |
| 20 | Mañana (06-12h) | 28 | 42 | 47 | 19 |
| 30 | Mañana (06-12h) | 42 | 62 | 70 | 28 |

### Tratamiento urgencia

Fuente: llegadas observadas por día y franja / 6 h (grilla con ceros).

| Franja | λ normal/h | λ p75/h | λ p90/h | c normal | c p75 | c p90 | Espera p90 (min) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Mañana (06-12h) | 0.415 | 0.667 | 1.000 | 1 | 1 | 2 | 0.571 |
| Tarde (12-18h) | 0.682 | 1.000 | 1.333 | 1 | 2 | 2 | 1.039 |
| Noche (18-24h) | 0.819 | 1.000 | 1.667 | 1 | 2 | 2 | 1.672 |
| Madrugada (00-06h) | 0.338 | 0.667 | 1.000 | 1 | 1 | 2 | 0.571 |

| 1/mu (min) | Franja pico | c normal | c p75 | c p90 | Δ p90 |
|---:|---|---:|---:|---:|---:|
| 15 | Noche (18-24h) | 1 | 1 | 2 | 1 |
| 20 | Noche (18-24h) | 1 | 2 | 2 | 1 |
| 30 | Noche (18-24h) | 2 | 2 | 2 | 0 |

## Ley de Little y altas matutinas

Ingresos cerrados, consistentes con el censo reconstruido; media de estancia ponderada por etapas. Ventanas semiabiertas [14,20) y [08,12), mismo día. Altas fraccionales distribuidas uniformemente: escenario agregado, no agenda individual; no garantiza factibilidad clínica ni causalidad. Umbral p90 fijo. Las series etapas_entradas_por_hora y etapas_salidas_por_hora ya excluyen estancias superiores al percentil p99.9 por etapa (14/15_etapas_*.sql).

- ingresos_dia_promedio: 83.8439
- estancia_media_horas: 81.2971
- estancia_mediana_horas: 45.9611
- censo_teorico_little: 284.0111
- censo_mediana_observada: 283.0000
- umbral_p75: 297.0000
- umbral_p90: 309.0000
- pct_horas_rojo_base: 9.3199

L = ingresos/día × estancia media (horas) / 24. No equivale a camas físicas ni a capacidad instalada.

| Reducción (h) | Nueva media (h) | Camas medias liberadas | Reducción (%) |
|---:|---:|---:|---:|
| 2 | 79.297 | 6.987 | 2.460 |
| 4 | 77.297 | 13.974 | 4.920 |
| 6 | 75.297 | 20.961 | 7.380 |
| 8 | 73.297 | 27.948 | 9.840 |

| Altas adelantadas (%) | Pico base | Pico simulado | Camas pico liberadas | Horas rojas base (%) | Horas rojas simuladas (%) | Reducción roja relativa (%) |
|---:|---:|---:|---:|---:|---:|---:|
| 20.000 | 359.000 | 359.000 | 0.000 | 9.320 | 7.119 | 23.618 |
| 35.000 | 359.000 | 359.000 | 0.000 | 9.320 | 6.259 | 32.841 |
| 50.000 | 359.000 | 359.000 | 0.000 | 9.320 | 5.902 | 36.677 |

## Urgencias → Hospitalización

espera_h mide start_siguiente - end_anterior en OMOP; puede incluir solapamientos negativos, no equivale necesariamente a boarding clínico. El p90 conjunto es un promedio de p90 mensuales ponderado por pasos, no un percentil agrupado exacto. El mes corresponde al inicio de la visita; correlación ecológica, no causal.

- origen: Treatment urgency (3045729)
- destino: Inpatient Visit (9201)
- pasos_totales: 47670
- espera_p50_horas: 0.0
- espera_p90_horas: 24.445646390695302
- correlacion_censo_espera_p90: -0.48144688358007354
- espera_p90_censo_normal_horas: 25.132693036302754
- espera_p90_censo_alto_horas: 23.699617268555

## Recomendaciones cuantificadas

### REC-01: Planificar Mañana (06-12h)

Validar tiempos de atención y disponibilidad real antes de asignar equipos.

Demanda p90 39.67/h: 15 equipos frente a 12 en régimen normal; espera media 6.09 min. No es dotación adicional observada.

Horizonte: Planificación de turnos.

### REC-02: Planificar Mañana (06-12h)

Validar tiempos de atención y disponibilidad real antes de asignar equipos.

Demanda p90 133.33/h: 70 equipos frente a 42 en régimen normal; espera media 5.30 min. No es dotación adicional observada.

Horizonte: Planificación de turnos.

### REC-03: Evaluar reducción segura de estancia

Revisar demoras evitables, sin modificar criterios clínicos.

Reducir 4 h libera teóricamente 13.97 camas medias (4.92%).

Horizonte: Piloto y seguimiento.

### REC-04: Pilotar altas matutinas

Adelantar a 08–12 h el 35% de altas de 14–20 h clínicamente elegibles.

Pico 359.00 → 359.00; horas rojas 9.32% → 6.26% (umbral fijo).

Horizonte: Piloto intradía.

### REC-05: Auditar transiciones demoradas

Coordinar disponibilidad de cama y revisar marcas temporales OMOP.

47670 pasos; p90 mensual ponderado 24.45 h. No se atribuye una reducción causal.

Horizonte: Seguimiento mensual.

## Decisión de principio a fin con pronóstico acoplado (Etapa 1)

Comparación paramétrica: la dotación habitual y la alternativa son supuestos del usuario o derivados del régimen histórico base, no plantilla real observada en OMOP. La demanda diaria (p10/p50/p90) se reparte entre las 4 franjas de 6 h según pesos históricos del día de semana (suma = 1.0) y se convierte a tasa horaria (λ = Demanda × peso / 6). Cuando ρ ≥ 1 la espera se reporta como None (cola inestable). Cualquier valor en llegadas_reales_observadas es solo contraste retrospectivo y no alimenta el pronóstico.

- jornada_demostrada: 2026-07-06 (Lun)
- servicio: urgencias
- tipo_comparacion: parametrica
- pronostico_diario_p10_p50_p90: 418 / 488 / 600
- llegadas_reales_observadas_contraste: 526
- franja_critica: Mañana (06-12h)

| Franja | Peso | λ prevista p10/p50/p90 (/h) | c req p10/p50/p90 | Brecha inc. | Dot. habitual → alt. | Espera hab. p50 / p90 (min) | Espera alt. p50 / p90 (min) |
|---|---:|---|---:|---:|---:|---|---|
| Mañana (06-12h) | 38.8% | 27.00 / 31.52 / 38.76 | 11 / 12 / 15 | 4 | 12 → 15 | 7.58 / inestable (ρ≥1) | 0.63 / 4.61 |
| Tarde (12-18h) | 33.9% | 23.62 / 27.58 / 33.91 | 10 / 11 / 13 | 3 | 12 → 13 | 2.12 / 22.42 | 0.94 / 6.28 |
| Noche (18-24h) | 20.4% | 14.21 / 16.59 / 20.39 | 6 / 7 / 9 | 3 | 12 → 9 | 0.04 / 0.20 | 0.77 / 3.09 |
| Madrugada (00-06h) | 6.9% | 4.83 / 5.64 / 6.94 | 3 / 3 / 4 | 1 | 12 → 4 | 0.00 / 0.00 | 1.38 / 3.08 |

**Decisión recomendada del turno:** Franja crítica Mañana (06-12h) (38.8 llegadas/h en p90; demanda diaria p50=488, rango p10–p90=418–600). Comparación paramétrica: 12 equipos habituales (cola inestable (ρ ≥ 1)) frente a 15 en alternativa (4.6 min); sensibilidad por incertidumbre de 4 equipos. Coordinar traslados tempranos y adelantar altas elegibles en Hospitalización.

### Hoja de ruta de decisión anticipada (Urgencias → Hospitalización)

| Etapa | Qué construir | Qué demostrar | Estado en MediFlow |
|---|---|---|---|
| 1. Pronóstico que alimenta decisiones | Reutilizar el LightGBM existente. Repartir la demanda diaria prevista por franjas con perfiles históricos y pasar escenarios de demanda típica y alta al dimensionamiento. | Cuándo cambia el requerimiento de equipos y qué tan sensible es a la incertidumbre del pronóstico. | Implementado (`dimensionar_jornada_con_pronostico`, `POST /api/optimizacion/simular`, UI y chat) |
| 2. Simulador del recorrido | Incorporar capacidad habilitada, dotación, tiempos de atención y marcas de decisión y traslado. Reconstruir el censo con stock inicial y comparar escenarios con restricciones reales. | Qué alternativa reduce la espera de traslado o las horas de presión, a qué costo y bajo qué supuestos. | Diseño paramétrico; requiere 3 marcas HIS (`hora_decision_hospitalizar`, `hora_asignacion_cama`, `hora_traslado_efectivo`) |
| 3. Piloto prospectivo | Ejecutar MediFlow en paralelo con la operación habitual. Registrar alertas, recomendaciones y resultados observados antes de probar una intervención supervisada. | Si las alertas llegan con suficiente anticipación, si el equipo puede actuar y si el beneficio estimado se sostiene en la práctica. | Propuesto para validación operativa en sombra en el HUN |

## Alcance

Resultados históricos agregados, no promesas de impacto. El simulador mantiene tasas fijas y usa interpolación explícita para porcentajes de altas no precalculados. Las series horarias etapas_entradas_por_hora y etapas_salidas_por_hora ya excluyen estancias superiores al percentil p99.9 por etapa (14/15_etapas_*.sql). Validar con datos clínicos y capacidad real antes de decidir dotaciones.
