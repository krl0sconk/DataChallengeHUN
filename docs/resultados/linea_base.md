# Resultados · Línea base

_Generado automáticamente por `python -m hun.models.linea_base` el 2026-11-03 15:05. Solo métricas agregadas._

- **Datos:** `entradas_por_hora.parquet` · frecuencia `h`
- **Validación:** walk-forward, 26 pliegues, origen 2025-07-25 → 2026-07-10, horizonte 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.

## Cuántas semanas promediar

| Variante | WAPE | MAE | RMSE | Sesgo |
|---|---|---|---|---|
| media de 1 semana | 36.4% | 4.87 | 15.30 | -0.17 |
| media de 4 semanas | 31.6% | 4.23 | 12.79 | +0.06 |
| media de 8 semanas | 30.6% | 4.10 | 12.57 | +0.20 |
| mediana de 8 semanas | 29.4% | 3.94 | 12.70 | +0.36 |

**Línea base elegida:** mediana de 8 semanas. Es la referencia que el modelo debe superar.

## Por tipo de visita

| Serie | WAPE | MAE | Promedio real |
|---|---|---|---|
| Ambulatory Rehabilitation Visit | 27.9% | 9.60 | 34.44 |
| Emergency Room Visit | 29.7% | 5.48 | 18.46 |
| Treatment urgency {Diagnosis} | 108.3% | 0.68 | 0.63 |
| Otros (< 1 llegadas/día, agrupados) | 100.0% | 0.00 | 0.00 |

## Por día del horizonte

| Día | WAPE | MAE |
|---|---|---|
| 1 | 29.8% | 4.83 |
| 2 | 39.4% | 1.99 |
| 3 | 34.9% | 1.30 |
| 4 | 49.2% | 6.90 |
| 5 | 22.5% | 4.08 |
| 6 | 22.9% | 4.27 |
| 7 | 23.6% | 4.22 |

## Estabilidad entre pliegues

| Pliegue | Origen | WAPE |
|---|---|---|
| 0 | 2025-07-25 | 20.1% |
| 1 | 2025-08-08 | 21.3% |
| 2 | 2025-08-22 | 18.1% |
| 3 | 2025-09-05 | 20.3% |
| 4 | 2025-09-19 | 18.0% |
| 5 | 2025-10-03 | 22.0% |
| 6 | 2025-10-17 | 18.7% |
| 7 | 2025-10-31 | 34.7% |
| 8 | 2025-11-14 | 32.0% |
| 9 | 2025-11-28 | 22.0% |
| 10 | 2025-12-12 | 22.3% |
| 11 | 2025-12-26 | 144.6% |
| 12 | 2026-01-09 | 38.1% |
| 13 | 2026-01-23 | 25.4% |
| 14 | 2026-02-06 | 24.2% |
| 15 | 2026-02-20 | 25.2% |
| 16 | 2026-03-06 | 22.1% |
| 17 | 2026-03-20 | 35.9% |
| 18 | 2026-04-03 | 36.7% |
| 19 | 2026-04-17 | 37.3% |
| 20 | 2026-05-01 | 37.4% |
| 21 | 2026-05-15 | 37.5% |
| 22 | 2026-05-29 | 21.4% |
| 23 | 2026-06-12 | 41.5% |
| 24 | 2026-06-26 | 39.4% |
| 25 | 2026-07-10 | 29.2% |
