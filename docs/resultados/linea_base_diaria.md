# Resultados · Línea base

_Generado automáticamente por `python -m hun.models.linea_base` el 2026-11-03 15:05. Solo métricas agregadas._

- **Datos:** `entradas_por_hora.parquet` · frecuencia `D`
- **Validación:** walk-forward, 26 pliegues, origen 2025-07-25 → 2026-07-10, horizonte 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.

## Cuántas semanas promediar

| Variante | WAPE | MAE | RMSE | Sesgo |
|---|---|---|---|---|
| media de 1 semana | 22.0% | 70.65 | 207.29 | -4.19 |
| media de 4 semanas | 20.3% | 65.29 | 174.88 | +1.47 |
| media de 8 semanas | 19.6% | 62.82 | 171.50 | +4.80 |
| mediana de 8 semanas | 18.0% | 57.77 | 174.37 | +16.08 |

**Línea base elegida:** mediana de 8 semanas. Es la referencia que el modelo debe superar.

## Por tipo de visita

| Serie | WAPE | MAE | Promedio real |
|---|---|---|---|
| Ambulatory Rehabilitation Visit | 21.4% | 177.21 | 826.54 |
| Emergency Room Visit | 10.7% | 47.49 | 443.16 |
| Treatment urgency {Diagnosis} | 42.0% | 6.37 | 15.17 |
| Otros (< 1 llegadas/día, agrupados) | 100.0% | 0.01 | 0.01 |

## Por día del horizonte

| Día | WAPE | MAE |
|---|---|---|
| 1 | 18.7% | 72.54 |
| 2 | 16.3% | 19.74 |
| 3 | 10.3% | 9.13 |
| 4 | 39.6% | 133.58 |
| 5 | 12.4% | 53.99 |
| 6 | 12.8% | 57.32 |
| 7 | 13.5% | 58.10 |

## Estabilidad entre pliegues

| Pliegue | Origen | WAPE |
|---|---|---|
| 0 | 2025-07-25 | 7.8% |
| 1 | 2025-08-08 | 8.9% |
| 2 | 2025-08-22 | 8.2% |
| 3 | 2025-09-05 | 9.5% |
| 4 | 2025-09-19 | 6.8% |
| 5 | 2025-10-03 | 8.4% |
| 6 | 2025-10-17 | 6.3% |
| 7 | 2025-10-31 | 25.2% |
| 8 | 2025-11-14 | 22.7% |
| 9 | 2025-11-28 | 9.8% |
| 10 | 2025-12-12 | 11.5% |
| 11 | 2025-12-26 | 137.9% |
| 12 | 2026-01-09 | 28.9% |
| 13 | 2026-01-23 | 13.0% |
| 14 | 2026-02-06 | 12.5% |
| 15 | 2026-02-20 | 15.0% |
| 16 | 2026-03-06 | 7.0% |
| 17 | 2026-03-20 | 23.9% |
| 18 | 2026-04-03 | 23.8% |
| 19 | 2026-04-17 | 33.0% |
| 20 | 2026-05-01 | 24.1% |
| 21 | 2026-05-15 | 21.7% |
| 22 | 2026-05-29 | 7.4% |
| 23 | 2026-06-12 | 26.8% |
| 24 | 2026-06-26 | 27.2% |
| 25 | 2026-07-10 | 17.5% |
