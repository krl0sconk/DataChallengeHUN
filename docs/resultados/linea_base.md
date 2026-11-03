# Resultados · Línea base

_Generado automáticamente por `python -m hun.models.linea_base` el 2026-11-03 16:11. Solo métricas agregadas._

- **Datos:** `entradas_por_hora.parquet` · frecuencia `h`
- **Validación:** walk-forward, 26 pliegues, origen 2025-07-25 → 2026-07-10, horizonte 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.

## Cuántas semanas promediar

| Variante | WAPE | MAE | RMSE | Sesgo |
|---|---|---|---|---|
| media de 1 semana | 36.3% | 3.84 | 12.23 | -0.23 |
| media de 4 semanas | 31.1% | 3.29 | 9.93 | +0.20 |
| media de 8 semanas | 30.8% | 3.26 | 10.04 | +0.51 |
| mediana de 8 semanas | 30.0% | 3.17 | 10.33 | +0.72 |

**Línea base elegida:** mediana de 8 semanas. Es la referencia que el modelo debe superar.

## Por tipo de visita

| Serie | WAPE | MAE | Promedio real |
|---|---|---|---|
| Ambulatory Rehabilitation Visit | 28.4% | 7.77 | 27.36 |
| Emergency Room Visit | 30.2% | 4.35 | 14.42 |
| Treatment urgency {Diagnosis} | 108.5% | 0.56 | 0.52 |
| Otros (< 1 llegadas/día, agrupados) | 100.0% | 0.00 | 0.00 |

## Por día del horizonte

| Día | WAPE | MAE |
|---|---|---|
| 1 | 30.3% | 3.91 |
| 2 | 39.8% | 1.57 |
| 3 | 35.9% | 1.05 |
| 4 | 47.4% | 5.36 |
| 5 | 23.3% | 3.31 |
| 6 | 24.1% | 3.54 |
| 7 | 24.5% | 3.44 |

## Estabilidad entre pliegues

| Pliegue | Origen | WAPE |
|---|---|---|
| 0 | 2025-07-25 | 21.0% |
| 1 | 2025-08-08 | 21.7% |
| 2 | 2025-08-22 | 18.5% |
| 3 | 2025-09-05 | 21.2% |
| 4 | 2025-09-19 | 18.7% |
| 5 | 2025-10-03 | 22.2% |
| 6 | 2025-10-17 | 19.0% |
| 7 | 2025-10-31 | 34.9% |
| 8 | 2025-11-14 | 32.5% |
| 9 | 2025-11-28 | 22.0% |
| 10 | 2025-12-12 | 22.8% |
| 11 | 2025-12-26 | 147.1% |
| 12 | 2026-01-09 | 38.1% |
| 13 | 2026-01-23 | 26.1% |
| 14 | 2026-02-06 | 24.5% |
| 15 | 2026-02-20 | 24.1% |
| 16 | 2026-03-06 | 22.7% |
| 17 | 2026-03-20 | 37.4% |
| 18 | 2026-04-03 | 38.1% |
| 19 | 2026-04-17 | 19.1% |
| 20 | 2026-05-01 | 80.3% |
| 21 | 2026-05-15 | 61.9% |
| 22 | 2026-05-29 | 24.7% |
| 23 | 2026-06-12 | 41.5% |
| 24 | 2026-06-26 | 39.4% |
| 25 | 2026-07-10 | 28.9% |
