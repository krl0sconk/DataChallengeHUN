# Resultados · Modelo de Demanda (Llegadas Diarias)

_Generado automáticamente por `python -m hun.models.demanda` el 2026-11-03 20:45. Solo métricas agregadas._

- **Datos:** `entradas_por_hora.parquet` · frecuencia diaria (`D`)
- **Validación:** walk-forward, 26 pliegues, origen 2025-07-25 → 2026-07-10, horizonte 1 a 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.

## 1. Comparación de la Escalera de Modelos

Cada escalón incorpora mayor capacidad predictiva sobre los mismos pliegues temporales.

| Modelo | WAPE | MAE | RMSE | Sesgo | Mejora vs. Base |
|---|---|---|---|---|---|
| 1. Línea base (mediana 8 semanas) | 18.6% | 63.07 | 164.36 | +34.13 | Referencia |
| 2. Poisson con calendario | 41.6% | 140.91 | 200.60 | +47.82 | -123.4% |
| 3. LightGBM con nivel local (todos los externos) | 10.9% | 36.81 | 69.48 | +4.94 | +41.6% |
| 4. LightGBM con nivel local (grupos aceptados) | 11.5% | 38.85 | 73.57 | +7.79 | +38.4% |

**Modelo principal seleccionado:** `lgbm_final`.

## 2. Desempeño por Servicio

| Servicio | WAPE | MAE | Sesgo | Promedio Real |
|---|---|---|---|---|
| Ambulatory Rehabilitation Visit | 12.3% | 80.61 | +14.82 | 656.56 |
| Emergency Room Visit | 8.8% | 30.38 | +7.58 | 346.15 |
| Treatment urgency {Diagnosis} | 44.9% | 5.56 | +0.96 | 12.38 |

## 3. Desempeño por Día del Horizonte (1 a 7)

| Día | WAPE | MAE | Sesgo |
|---|---|---|---|
| 1 | 9.4% | 38.95 | +5.54 |
| 2 | 16.7% | 21.03 | +0.30 |
| 3 | 10.2% | 9.56 | +0.90 |
| 4 | 15.3% | 55.34 | +9.77 |
| 5 | 10.7% | 48.54 | +15.76 |
| 6 | 10.7% | 50.26 | +8.59 |
| 7 | 10.7% | 48.29 | +13.64 |

### 3.1 Exactitud por servicio y día del horizonte

Exactitud = 1 − WAPE. Meta: ≥ 80% (⚠️ marca lo que no la alcanza). El horizonte siempre arranca el mismo día de la semana, por eso cada día del horizonte es siempre el mismo día de la semana.

| Servicio | 1 (vie) | 2 (sáb) | 3 (dom) | 4 (lun) | 5 (mar) | 6 (mié) | 7 (jue) | Total |
|---|---|---|---|---|---|---|---|---|
| Emergency Room Visit | 92.0% | 91.9% | 91.6% | 90.8% | 91.2% | 91.0% | 90.3% | 91.2% |
| Ambulatory Rehabilitation Visit | 90.5% | 52.8% ⚠️ | 20.2% ⚠️ | 81.7% | 89.1% | 89.0% | 89.3% | 87.7% |
| Treatment urgency {Diagnosis} | 57.2% ⚠️ | 51.2% ⚠️ | 43.9% ⚠️ | 59.3% ⚠️ | 51.6% ⚠️ | 67.7% ⚠️ | 51.0% ⚠️ | 55.1% ⚠️ |

Llegadas diarias promedio en cada día del horizonte (para leer la tabla anterior: un día con pocas llegadas casi no se puede acertar en porcentaje):

| Servicio | 1 (vie) | 2 (sáb) | 3 (dom) | 4 (lun) | 5 (mar) | 6 (mié) | 7 (jue) |
|---|---|---|---|---|---|---|---|
| Emergency Room Visit | 348.8 | 295.0 | 270.5 | 394.3 | 390.8 | 362.0 | 361.6 |
| Ambulatory Rehabilitation Visit | 877.6 | 68.3 | 1.6 | 679.9 | 958.7 | 1033.2 | 976.8 |
| Treatment urgency {Diagnosis} | 12.6 | 14.5 | 8.5 | 12.5 | 13.5 | 13.2 | 12.0 |

Días bajo la meta con pocas llegadas (atiende poco o a ratos, y el nivel cambia mucho de una semana a otra; en porcentaje casi no se pueden acertar): Ambulatory Rehabilitation Visit el sáb (día 2, 68 llegadas/día); Ambulatory Rehabilitation Visit el dom (día 3, 2 llegadas/día); Treatment urgency {Diagnosis} el vie (día 1, 13 llegadas/día); Treatment urgency {Diagnosis} el sáb (día 2, 14 llegadas/día); Treatment urgency {Diagnosis} el dom (día 3, 8 llegadas/día); Treatment urgency {Diagnosis} el lun (día 4, 12 llegadas/día); Treatment urgency {Diagnosis} el mar (día 5, 13 llegadas/día); Treatment urgency {Diagnosis} el mié (día 6, 13 llegadas/día); Treatment urgency {Diagnosis} el jue (día 7, 12 llegadas/día). Para estos días mira el error en visitas (MAE) de la sección 3, no el porcentaje.

### 3.2 Treatment urgency {Diagnosis}: reporte por semana y techo

Promedio real: 12.4 llegadas por día. Con tan pocas llegadas el número de un día es en buena parte azar de conteo (Poisson): aunque el modelo conociera la tasa exacta, fallaría. Ese es el *techo*.

| Medida | Exactitud |
|---|---|
| Techo por azar, un día | 77.3% |
| Modelo, un día | 55.1% |
| Techo por azar, semana completa (suma de 7 días) | 91.4% |
| Modelo, semana completa (26 semanas) | 72.6% |

El techo es un tope optimista: supone que la tasa verdadera de cada día es conocida y que el conteo es Poisson puro. En la práctica la tasa también cambia de una semana a otra, por eso el modelo queda por debajo.

## 4. Días Festivos vs. Normales

Comparación de la capacidad de adaptación ante caídas o picos operacionales.

| Tipo de Día | Modelo | WAPE | MAE | Sesgo |
|---|---|---|---|---|
| Día Normal | 1. Línea base (mediana 8 semanas) | 13.2% | 46.71 | +15.99 |
| Día Normal | 4. LightGBM con nivel local (grupos aceptados) | 11.2% | 39.63 | +7.20 |
| Día Festivo | 1. Línea base (mediana 8 semanas) | 349.6% | 317.41 | +316.14 |
| Día Festivo | 4. LightGBM con nivel local (grupos aceptados) | 29.4% | 26.70 | +16.82 |

## 5. Estabilidad Temporal entre Pliegues

| Pliegue | Origen | WAPE Línea Base | WAPE LightGBM Final |
|---|---|---|---|
| 0 | 2025-07-25 | 8.4% | 9.7% |
| 1 | 2025-08-08 | 8.6% | 8.7% |
| 2 | 2025-08-22 | 7.7% | 7.9% |
| 3 | 2025-09-05 | 9.0% | 8.5% |
| 4 | 2025-09-19 | 7.5% | 10.7% |
| 5 | 2025-10-03 | 8.6% | 6.7% |
| 6 | 2025-10-17 | 6.1% | 7.3% |
| 7 | 2025-10-31 | 24.9% | 8.1% |
| 8 | 2025-11-14 | 22.8% | 5.4% |
| 9 | 2025-11-28 | 9.5% | 11.4% |
| 10 | 2025-12-12 | 11.7% | 8.8% |
| 11 | 2025-12-26 | 139.5% | 29.8% |
| 12 | 2026-01-09 | 27.4% | 17.4% |
| 13 | 2026-01-23 | 13.4% | 13.4% |
| 14 | 2026-02-06 | 12.7% | 10.3% |
| 15 | 2026-02-20 | 12.8% | 12.8% |
| 16 | 2026-03-06 | 8.1% | 6.5% |
| 17 | 2026-03-20 | 23.2% | 7.0% |
| 18 | 2026-04-03 | 28.3% | 13.3% |
| 19 | 2026-04-17 | 6.0% | 6.9% |
| 20 | 2026-05-01 | 82.6% | 55.9% |
| 21 | 2026-05-15 | 61.5% | 31.5% |
| 22 | 2026-05-29 | 16.3% | 15.4% |
| 23 | 2026-06-12 | 26.8% | 10.7% |
| 24 | 2026-06-26 | 27.3% | 10.2% |
| 25 | 2026-07-10 | 17.7% | 11.2% |
