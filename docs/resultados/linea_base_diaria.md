# Resultados · Línea base

_Generado automáticamente por `python -m hun.models.linea_base` el 2026-11-03 16:11. Solo métricas agregadas._

- **Datos:** `entradas_por_hora.parquet` · frecuencia `D`
- **Validación:** walk-forward, 26 pliegues, origen 2025-07-25 → 2026-07-10, horizonte 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|). Sesgo > 0 = sobreestima.

## Cuántas semanas promediar

| Variante | WAPE | MAE | RMSE | Sesgo |
|---|---|---|---|---|
| media de 1 semana | 21.5% | 54.46 | 165.15 | -5.41 |
| media de 4 semanas | 19.1% | 48.40 | 133.54 | +4.76 |
| media de 8 semanas | 19.3% | 48.89 | 135.68 | +12.18 |
| mediana de 8 semanas | 18.6% | 47.31 | 142.34 | +25.59 |

**Línea base elegida:** mediana de 8 semanas. Es la referencia que el modelo debe superar.

## Por tipo de visita

| Serie | WAPE | MAE | Promedio real |
|---|---|---|---|
| Ambulatory Rehabilitation Visit | 22.1% | 144.79 | 656.56 |
| Emergency Room Visit | 11.2% | 38.93 | 346.15 |
| Treatment urgency {Diagnosis} | 44.3% | 5.49 | 12.38 |
| Otros (< 1 llegadas/día, agrupados) | 100.0% | 0.01 | 0.01 |

## Por día del horizonte

| Día | WAPE | MAE |
|---|---|---|
| 1 | 18.9% | 58.64 |
| 2 | 16.5% | 15.59 |
| 3 | 11.4% | 7.98 |
| 4 | 38.5% | 104.65 |
| 5 | 13.6% | 46.20 |
| 6 | 13.9% | 48.94 |
| 7 | 14.6% | 49.13 |

## Estabilidad entre pliegues

| Pliegue | Origen | WAPE |
|---|---|---|
| 0 | 2025-07-25 | 8.4% |
| 1 | 2025-08-08 | 8.6% |
| 2 | 2025-08-22 | 7.7% |
| 3 | 2025-09-05 | 9.0% |
| 4 | 2025-09-19 | 7.5% |
| 5 | 2025-10-03 | 8.6% |
| 6 | 2025-10-17 | 6.1% |
| 7 | 2025-10-31 | 24.9% |
| 8 | 2025-11-14 | 22.8% |
| 9 | 2025-11-28 | 9.5% |
| 10 | 2025-12-12 | 11.7% |
| 11 | 2025-12-26 | 139.5% |
| 12 | 2026-01-09 | 27.4% |
| 13 | 2026-01-23 | 13.4% |
| 14 | 2026-02-06 | 12.7% |
| 15 | 2026-02-20 | 12.8% |
| 16 | 2026-03-06 | 8.1% |
| 17 | 2026-03-20 | 23.2% |
| 18 | 2026-04-03 | 28.3% |
| 19 | 2026-04-17 | 6.0% |
| 20 | 2026-05-01 | 82.6% |
| 21 | 2026-05-15 | 61.5% |
| 22 | 2026-05-29 | 16.3% |
| 23 | 2026-06-12 | 26.8% |
| 24 | 2026-06-26 | 27.3% |
| 25 | 2026-07-10 | 17.7% |
