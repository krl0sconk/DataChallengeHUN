# Resultados · Modelo de Demanda (Llegadas Diarias)

_Generado automáticamente por `python -m hun.models.demanda` el 2026-11-03 15:11. Solo métricas agregadas._

- **Datos:** `entradas_por_hora.parquet` · frecuencia diaria (`D`)
- **Validación:** walk-forward, 26 pliegues, origen 2025-07-25 → 2026-07-10, horizonte 1 a 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.

## 1. Comparación de la Escalera de Modelos

Cada escalón incorpora mayor capacidad predictiva sobre los mismos pliegues temporales.

| Modelo | WAPE | MAE | RMSE | Sesgo | Mejora vs. Base |
|---|---|---|---|---|---|
| 1. Línea base (mediana 8 semanas) | 18.0% | 57.77 | 174.37 | +16.08 | Referencia |
| 2. Poisson con calendario | 31.3% | 100.56 | 164.29 | +4.84 | -74.1% |
| 3. LightGBM (todos los externos) | 10.7% | 34.34 | 72.69 | +0.68 | +40.6% |
| 4. LightGBM (grupos aceptados) | 16.4% | 52.76 | 142.00 | +4.05 | +8.7% |

**Modelo principal seleccionado:** `lgbm_final`.

## 2. Desempeño por Servicio

| Servicio | WAPE | MAE | Sesgo | Promedio Real |
|---|---|---|---|---|
| Ambulatory Rehabilitation Visit | 18.9% | 156.33 | +10.78 | 826.54 |
| Emergency Room Visit | 10.2% | 45.11 | +0.76 | 443.16 |
| Treatment urgency {Diagnosis} | 44.0% | 6.67 | +1.75 | 15.17 |
| Otros (< 1 llegadas/día, agrupados) | 26638.4% | 2.93 | +2.93 | 0.01 |

## 3. Desempeño por Día del Horizonte (1 a 7)

| Día | WAPE | MAE | Sesgo |
|---|---|---|---|
| 1 | 15.5% | 60.21 | +14.26 |
| 2 | 17.9% | 21.72 | -0.47 |
| 3 | 13.5% | 11.99 | +4.39 |
| 4 | 39.1% | 131.57 | +38.86 |
| 5 | 9.8% | 42.52 | -8.09 |
| 6 | 10.5% | 47.05 | -8.97 |
| 7 | 12.6% | 54.27 | -11.60 |

## 4. Días Festivos vs. Normales

Comparación de la capacidad de adaptación ante caídas o picos operacionales.

| Tipo de Día | Modelo | WAPE | MAE | Sesgo |
|---|---|---|---|---|
| Día Normal | 1. Línea base (mediana 8 semanas) | 12.4% | 41.72 | -2.59 |
| Día Normal | 4. LightGBM (grupos aceptados) | 12.1% | 40.65 | -11.15 |
| Día Festivo | 1. Línea base (mediana 8 semanas) | 317.8% | 307.23 | +306.27 |
| Día Festivo | 4. LightGBM (grupos aceptados) | 249.4% | 241.04 | +240.37 |

## 5. Estabilidad Temporal entre Pliegues

| Pliegue | Origen | WAPE Línea Base | WAPE LightGBM Final |
|---|---|---|---|
| 0 | 2025-07-25 | 7.8% | 9.0% |
| 1 | 2025-08-08 | 8.9% | 10.1% |
| 2 | 2025-08-22 | 8.2% | 16.4% |
| 3 | 2025-09-05 | 9.5% | 12.9% |
| 4 | 2025-09-19 | 6.8% | 10.6% |
| 5 | 2025-10-03 | 8.4% | 8.1% |
| 6 | 2025-10-17 | 6.3% | 12.6% |
| 7 | 2025-10-31 | 25.2% | 21.8% |
| 8 | 2025-11-14 | 22.7% | 25.8% |
| 9 | 2025-11-28 | 9.8% | 10.1% |
| 10 | 2025-12-12 | 11.5% | 10.6% |
| 11 | 2025-12-26 | 137.9% | 39.6% |
| 12 | 2026-01-09 | 28.9% | 28.4% |
| 13 | 2026-01-23 | 13.0% | 9.4% |
| 14 | 2026-02-06 | 12.5% | 11.5% |
| 15 | 2026-02-20 | 15.0% | 8.1% |
| 16 | 2026-03-06 | 7.0% | 6.9% |
| 17 | 2026-03-20 | 23.9% | 25.6% |
| 18 | 2026-04-03 | 23.8% | 12.5% |
| 19 | 2026-04-17 | 33.0% | 31.3% |
| 20 | 2026-05-01 | 24.1% | 32.4% |
| 21 | 2026-05-15 | 21.7% | 20.5% |
| 22 | 2026-05-29 | 7.4% | 10.4% |
| 23 | 2026-06-12 | 26.8% | 22.0% |
| 24 | 2026-06-26 | 27.2% | 19.7% |
| 25 | 2026-07-10 | 17.5% | 18.9% |
