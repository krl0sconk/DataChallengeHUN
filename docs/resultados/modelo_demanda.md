# Resultados · Modelo de Demanda (Llegadas Diarias)

_Generado automáticamente por `python -m hun.models.demanda` el 2026-11-18 19:22. Solo métricas agregadas._

- **Datos:** `entradas_por_hora.parquet` · frecuencia diaria (`D`)
- **Validación:** walk-forward, 26 pliegues, origen 2025-07-25 → 2026-07-10, horizonte 1 a 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.

## 1. Comparación de la Escalera de Modelos

Cada escalón incorpora mayor capacidad predictiva sobre los mismos pliegues temporales.

| Modelo | WAPE | MAE | RMSE | Sesgo | Mejora vs. Base |
|---|---|---|---|---|---|
| 1. Línea base (mediana 8 semanas) | 18.0% | 77.02 | 201.34 | +21.44 | Referencia |
| 2. Poisson con calendario | 15.6% | 66.86 | 125.91 | +6.41 | +13.2% |
| 3. LightGBM con nivel local (todos los externos) | 10.5% | 44.84 | 83.82 | -6.00 | +41.8% |
| 4. LightGBM con nivel local (grupos aceptados) | 10.5% | 44.94 | 83.67 | -5.70 | +41.6% |

**Modelo principal seleccionado:** `lgbm_final`.

## 2. Desempeño por Servicio

| Servicio | WAPE | MAE | Sesgo | Promedio Real |
|---|---|---|---|---|
| Ambulatory Rehabilitation Visit | 11.0% | 91.22 | -10.12 | 826.54 |
| Emergency Room Visit | 8.4% | 37.02 | -7.83 | 443.16 |
| Treatment urgency {Diagnosis} | 43.5% | 6.59 | +0.86 | 15.17 |

## 3. Desempeño por Día del Horizonte (1 a 7)

| Día | WAPE | MAE | Sesgo |
|---|---|---|---|
| 1 | 10.3% | 53.34 | -4.20 |
| 2 | 17.0% | 27.39 | -4.86 |
| 3 | 10.2% | 12.11 | -2.47 |
| 4 | 12.4% | 55.73 | -3.97 |
| 5 | 9.5% | 55.28 | -6.59 |
| 6 | 9.6% | 57.04 | -9.71 |
| 7 | 9.4% | 53.73 | -8.06 |

### 3.1 Exactitud por servicio y día del horizonte

Exactitud = 1 − WAPE. Meta: ≥ 80% (⚠️ marca lo que no la alcanza). El horizonte siempre arranca el mismo día de la semana, por eso cada día del horizonte es siempre el mismo día de la semana.

| Servicio | 1 (vie) | 2 (sáb) | 3 (dom) | 4 (lun) | 5 (mar) | 6 (mié) | 7 (jue) | Total |
|---|---|---|---|---|---|---|---|---|
| Emergency Room Visit | 91.7% | 91.9% | 91.6% | 91.7% | 91.3% | 92.4% | 90.9% | 91.6% |
| Ambulatory Rehabilitation Visit | 89.4% | 51.3% ⚠️ | 15.6% ⚠️ | 85.6% | 90.6% | 90.0% | 90.9% | 89.0% |
| Treatment urgency {Diagnosis} | 56.8% ⚠️ | 48.1% ⚠️ | 44.2% ⚠️ | 63.0% ⚠️ | 54.6% ⚠️ | 68.5% ⚠️ | 56.8% ⚠️ | 56.5% ⚠️ |

Llegadas diarias promedio en cada día del horizonte (para leer la tabla anterior: un día con pocas llegadas casi no se puede acertar en porcentaje):

| Servicio | 1 (vie) | 2 (sáb) | 3 (dom) | 4 (lun) | 5 (mar) | 6 (mié) | 7 (jue) |
|---|---|---|---|---|---|---|---|
| Emergency Room Visit | 441.5 | 379.8 | 344.2 | 496.8 | 504.7 | 469.0 | 466.0 |
| Ambulatory Rehabilitation Visit | 1095.3 | 87.1 | 2.2 | 835.7 | 1219.5 | 1306.2 | 1239.8 |
| Treatment urgency {Diagnosis} | 15.8 | 17.4 | 10.0 | 15.1 | 17.0 | 16.3 | 14.4 |

Días bajo la meta con pocas llegadas (atiende poco o a ratos, y el nivel cambia mucho de una semana a otra; en porcentaje casi no se pueden acertar): Ambulatory Rehabilitation Visit el sáb (día 2, 87 llegadas/día); Ambulatory Rehabilitation Visit el dom (día 3, 2 llegadas/día); Treatment urgency {Diagnosis} el vie (día 1, 16 llegadas/día); Treatment urgency {Diagnosis} el sáb (día 2, 17 llegadas/día); Treatment urgency {Diagnosis} el dom (día 3, 10 llegadas/día); Treatment urgency {Diagnosis} el lun (día 4, 15 llegadas/día); Treatment urgency {Diagnosis} el mar (día 5, 17 llegadas/día); Treatment urgency {Diagnosis} el mié (día 6, 16 llegadas/día); Treatment urgency {Diagnosis} el jue (día 7, 14 llegadas/día). Para estos días mira el error en visitas (MAE) de la sección 3, no el porcentaje.

### 3.2 Treatment urgency {Diagnosis}: reporte por semana y techo

Promedio real: 15.2 llegadas por día. Con tan pocas llegadas el número de un día es en buena parte azar de conteo (Poisson): aunque el modelo conociera la tasa exacta, fallaría. Ese es el *techo*.

| Medida | Exactitud |
|---|---|
| Techo por azar, un día | 79.5% |
| Modelo, un día | 56.5% |
| Techo por azar, semana completa (suma de 7 días) | 92.3% |
| Modelo, semana completa (26 semanas) | 77.0% |

El techo es un tope optimista: supone que la tasa verdadera de cada día es conocida y que el conteo es Poisson puro. En la práctica la tasa también cambia de una semana a otra, por eso el modelo queda por debajo.

## 4. Días Festivos vs. Normales

Comparación de la capacidad de adaptación ante caídas o picos operacionales.

| Tipo de Día | Modelo | WAPE | MAE | Sesgo |
|---|---|---|---|---|
| Día Normal | 1. Línea base (mediana 8 semanas) | 12.4% | 55.63 | -3.45 |
| Día Normal | 4. LightGBM con nivel local (grupos aceptados) | 10.3% | 45.97 | -6.96 |
| Día Festivo | 1. Línea base (mediana 8 semanas) | 317.8% | 409.64 | +408.36 |
| Día Festivo | 4. LightGBM con nivel local (grupos aceptados) | 22.5% | 29.03 | +13.89 |

## 5. Estabilidad Temporal entre Pliegues

| Pliegue | Origen | WAPE Línea Base | WAPE LightGBM Final |
|---|---|---|---|
| 0 | 2025-07-25 | 7.8% | 8.2% |
| 1 | 2025-08-08 | 8.9% | 8.4% |
| 2 | 2025-08-22 | 8.2% | 8.5% |
| 3 | 2025-09-05 | 9.5% | 8.8% |
| 4 | 2025-09-19 | 6.8% | 9.9% |
| 5 | 2025-10-03 | 8.4% | 7.5% |
| 6 | 2025-10-17 | 6.3% | 6.4% |
| 7 | 2025-10-31 | 25.2% | 8.2% |
| 8 | 2025-11-14 | 22.7% | 5.8% |
| 9 | 2025-11-28 | 9.8% | 11.0% |
| 10 | 2025-12-12 | 11.5% | 9.2% |
| 11 | 2025-12-26 | 137.9% | 28.0% |
| 12 | 2026-01-09 | 28.9% | 17.6% |
| 13 | 2026-01-23 | 13.0% | 12.0% |
| 14 | 2026-02-06 | 12.5% | 10.0% |
| 15 | 2026-02-20 | 15.0% | 9.2% |
| 16 | 2026-03-06 | 7.0% | 6.4% |
| 17 | 2026-03-20 | 23.9% | 5.4% |
| 18 | 2026-04-03 | 23.8% | 11.5% |
| 19 | 2026-04-17 | 33.0% | 27.6% |
| 20 | 2026-05-01 | 24.1% | 12.6% |
| 21 | 2026-05-15 | 21.7% | 7.0% |
| 22 | 2026-05-29 | 7.4% | 7.5% |
| 23 | 2026-06-12 | 26.8% | 8.9% |
| 24 | 2026-06-26 | 27.2% | 10.3% |
| 25 | 2026-07-10 | 17.5% | 11.2% |
