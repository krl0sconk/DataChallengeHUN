# Resultados · Modelo de Demanda (Llegadas Diarias)

_Generado automáticamente por `python -m hun.models.demanda` el 2026-11-03 16:43. Solo métricas agregadas._

- **Datos:** `entradas_por_hora.parquet` · frecuencia diaria (`D`)
- **Validación:** walk-forward, 26 pliegues, origen 2025-07-25 → 2026-07-10, horizonte 1 a 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.

## 1. Comparación de la Escalera de Modelos

Cada escalón incorpora mayor capacidad predictiva sobre los mismos pliegues temporales.

| Modelo | WAPE | MAE | RMSE | Sesgo | Mejora vs. Base |
|---|---|---|---|---|---|
| 1. Línea base (mediana 8 semanas) | 18.6% | 47.31 | 142.34 | +25.59 | Referencia |
| 2. Poisson con calendario | 41.7% | 105.81 | 173.72 | +35.98 | -123.7% |
| 3. LightGBM (todos los externos) | 11.1% | 28.24 | 56.34 | +7.96 | +40.3% |
| 4. LightGBM (grupos aceptados) | 13.2% | 33.40 | 69.37 | +11.19 | +29.4% |

**Modelo principal seleccionado:** `lgbm_final`.

## 2. Desempeño por Servicio

| Servicio | WAPE | MAE | Sesgo | Promedio Real |
|---|---|---|---|---|
| Ambulatory Rehabilitation Visit | 13.6% | 89.22 | +22.78 | 656.56 |
| Emergency Room Visit | 10.2% | 35.23 | +16.79 | 346.15 |
| Treatment urgency {Diagnosis} | 53.4% | 6.62 | +2.68 | 12.38 |
| Otros (< 1 llegadas/día, agrupados) | 22962.8% | 2.52 | +2.52 | 0.01 |

## 3. Desempeño por Día del Horizonte (1 a 7)

| Día | WAPE | MAE | Sesgo |
|---|---|---|---|
| 1 | 11.4% | 35.17 | +13.66 |
| 2 | 16.3% | 15.39 | +4.94 |
| 3 | 14.4% | 10.09 | +4.62 |
| 4 | 14.1% | 38.38 | +14.26 |
| 5 | 12.3% | 42.02 | +19.34 |
| 6 | 13.2% | 46.44 | +6.25 |
| 7 | 13.7% | 46.30 | +15.29 |

## 4. Días Festivos vs. Normales

Comparación de la capacidad de adaptación ante caídas o picos operacionales.

| Tipo de Día | Modelo | WAPE | MAE | Sesgo |
|---|---|---|---|---|
| Día Normal | 1. Línea base (mediana 8 semanas) | 13.2% | 35.04 | +11.99 |
| Día Normal | 4. LightGBM (grupos aceptados) | 12.6% | 33.49 | +10.27 |
| Día Festivo | 1. Línea base (mediana 8 semanas) | 349.6% | 238.06 | +237.10 |
| Día Festivo | 4. LightGBM (grupos aceptados) | 46.9% | 31.93 | +25.50 |

## 5. Estabilidad Temporal entre Pliegues

| Pliegue | Origen | WAPE Línea Base | WAPE LightGBM Final |
|---|---|---|---|
| 0 | 2025-07-25 | 8.4% | 8.4% |
| 1 | 2025-08-08 | 8.6% | 9.3% |
| 2 | 2025-08-22 | 7.7% | 7.7% |
| 3 | 2025-09-05 | 9.0% | 8.7% |
| 4 | 2025-09-19 | 7.5% | 9.0% |
| 5 | 2025-10-03 | 8.6% | 4.9% |
| 6 | 2025-10-17 | 6.1% | 6.7% |
| 7 | 2025-10-31 | 24.9% | 9.4% |
| 8 | 2025-11-14 | 22.8% | 9.0% |
| 9 | 2025-11-28 | 9.5% | 10.8% |
| 10 | 2025-12-12 | 11.7% | 9.0% |
| 11 | 2025-12-26 | 139.5% | 21.8% |
| 12 | 2026-01-09 | 27.4% | 14.3% |
| 13 | 2026-01-23 | 13.4% | 9.5% |
| 14 | 2026-02-06 | 12.7% | 13.8% |
| 15 | 2026-02-20 | 12.8% | 20.2% |
| 16 | 2026-03-06 | 8.1% | 8.4% |
| 17 | 2026-03-20 | 23.2% | 9.8% |
| 18 | 2026-04-03 | 28.3% | 14.3% |
| 19 | 2026-04-17 | 6.0% | 11.0% |
| 20 | 2026-05-01 | 82.6% | 62.5% |
| 21 | 2026-05-15 | 61.5% | 46.7% |
| 22 | 2026-05-29 | 16.3% | 36.8% |
| 23 | 2026-06-12 | 26.8% | 15.5% |
| 24 | 2026-06-26 | 27.3% | 22.6% |
| 25 | 2026-07-10 | 17.7% | 14.3% |
