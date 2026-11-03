# Resultados · Modelo de Demanda (Llegadas Diarias)

_Generado automáticamente por `python -m hun.models.demanda` el 2026-11-03 16:19. Solo métricas agregadas._

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
| 4. LightGBM (grupos aceptados) | 13.1% | 33.14 | 68.79 | +11.28 | +29.9% |

**Modelo principal seleccionado:** `lgbm_final`.

## 2. Desempeño por Servicio

| Servicio | WAPE | MAE | Sesgo | Promedio Real |
|---|---|---|---|---|
| Ambulatory Rehabilitation Visit | 13.5% | 88.53 | +22.45 | 656.56 |
| Emergency Room Visit | 10.1% | 34.85 | +17.45 | 346.15 |
| Treatment urgency {Diagnosis} | 53.7% | 6.64 | +2.68 | 12.38 |
| Otros (< 1 llegadas/día, agrupados) | 22972.3% | 2.52 | +2.52 | 0.01 |

## 3. Desempeño por Día del Horizonte (1 a 7)

| Día | WAPE | MAE | Sesgo |
|---|---|---|---|
| 1 | 11.4% | 35.27 | +13.90 |
| 2 | 16.3% | 15.42 | +5.38 |
| 3 | 14.5% | 10.16 | +5.07 |
| 4 | 14.2% | 38.54 | +13.84 |
| 5 | 12.1% | 41.34 | +19.24 |
| 6 | 12.8% | 45.22 | +5.80 |
| 7 | 13.6% | 46.02 | +15.70 |

## 4. Días Festivos vs. Normales

Comparación de la capacidad de adaptación ante caídas o picos operacionales.

| Tipo de Día | Modelo | WAPE | MAE | Sesgo |
|---|---|---|---|---|
| Día Normal | 1. Línea base (mediana 8 semanas) | 13.2% | 35.04 | +11.99 |
| Día Normal | 4. LightGBM (grupos aceptados) | 12.5% | 33.23 | +10.35 |
| Día Festivo | 1. Línea base (mediana 8 semanas) | 349.6% | 238.06 | +237.10 |
| Día Festivo | 4. LightGBM (grupos aceptados) | 46.6% | 31.70 | +25.60 |

## 5. Estabilidad Temporal entre Pliegues

| Pliegue | Origen | WAPE Línea Base | WAPE LightGBM Final |
|---|---|---|---|
| 0 | 2025-07-25 | 8.4% | 8.3% |
| 1 | 2025-08-08 | 8.6% | 8.9% |
| 2 | 2025-08-22 | 7.7% | 7.8% |
| 3 | 2025-09-05 | 9.0% | 8.7% |
| 4 | 2025-09-19 | 7.5% | 9.0% |
| 5 | 2025-10-03 | 8.6% | 5.0% |
| 6 | 2025-10-17 | 6.1% | 6.6% |
| 7 | 2025-10-31 | 24.9% | 9.5% |
| 8 | 2025-11-14 | 22.8% | 8.9% |
| 9 | 2025-11-28 | 9.5% | 10.9% |
| 10 | 2025-12-12 | 11.7% | 8.4% |
| 11 | 2025-12-26 | 139.5% | 20.9% |
| 12 | 2026-01-09 | 27.4% | 13.9% |
| 13 | 2026-01-23 | 13.4% | 9.8% |
| 14 | 2026-02-06 | 12.7% | 12.8% |
| 15 | 2026-02-20 | 12.8% | 19.9% |
| 16 | 2026-03-06 | 8.1% | 8.4% |
| 17 | 2026-03-20 | 23.2% | 10.0% |
| 18 | 2026-04-03 | 28.3% | 14.6% |
| 19 | 2026-04-17 | 6.0% | 11.0% |
| 20 | 2026-05-01 | 82.6% | 62.3% |
| 21 | 2026-05-15 | 61.5% | 46.5% |
| 22 | 2026-05-29 | 16.3% | 36.6% |
| 23 | 2026-06-12 | 26.8% | 15.7% |
| 24 | 2026-06-26 | 27.3% | 22.7% |
| 25 | 2026-07-10 | 17.7% | 14.2% |
