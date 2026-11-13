# Resultados · Modelo de Largo Plazo (Horizonte 4 Meses / 120 Días)

_Generado automáticamente por `python -m hun.models.largo_plazo` el 2026-11-03 21:02. Solo métricas agregadas._

- **Por qué hace falta:** la base termina el `2026-07-16` y el modelo operativo de 7 días depende de llegadas de semanas recientes (`llegadas_lag_7..56`). A 120 días esos rezagos no existen.
- **Variables usadas (sin rezagos cortos):** calendario, grupo aceptado `festivos_y_puentes`, tendencia secular ponderada por recencia (vida media 180 días) y clima típico del día del año (mediana histórica de temperatura, lluvia y humedad antes del corte).
- **Validación (backtest a 120 días):** 13 pliegues walk-forward, orígenes `2025-03-24` → `2026-03-19`, paso de 30 días.
- **Desempeño global a 120 días:** exactitud **84.3%** (WAPE 15.7%, MAE 57.9), cobertura del intervalo **86.5%**.

## 1. Backtest a 120 Días por Servicio

| Servicio | Exactitud (1 − WAPE) | WAPE | MAE | Sesgo | Cobertura Intervalo | Promedio Real |
|---|---|---|---|---|---|---|
| Emergency Room Visit | 86.0% | 14.0% | 52.3 | +20.1 | 85.4% | 374.5 |
| Ambulatory Rehabilitation Visit | 84.5% | 15.5% | 111.7 | +44.2 | 85.3% | 719.1 |
| Treatment urgency {Diagnosis} | 35.6% | 64.4% | 9.8 | +4.9 | 88.7% | 15.1 |
| ↳ _Treatment urgency {Diagnosis} (agregado por semana)_ | _50.7%_ | _49.3%_ | — | — | — | _106.0/sem_ |

## 2. Desempeño y Ancho del Intervalo por Mes del Horizonte (1 a 4)

El intervalo se ensancha con `1 + 0,10 × (mes − 1)` sobre los cuantiles base p05/p95 para sostener una cobertura ≥ 80 % a medida que crece el horizonte.

| Mes del Horizonte | Días | Exactitud (1 − WAPE) | WAPE | Cobertura | Ancho Medio (p90 − p10) |
|---|---|---|---|---|---|
| Mes 1 | 1–30 | 87.8% | 12.2% | 84.4% | 331.5 |
| Mes 2 | 31–60 | 86.6% | 13.4% | 85.0% | 368.8 |
| Mes 3 | 61–90 | 83.5% | 16.5% | 87.7% | 402.4 |
| Mes 4 | 91–120 | 78.7% | 21.3% | 88.7% | 424.5 |

## 3. Pronóstico Agosto–Noviembre 2026 por Servicio y Mes

Resumen mensual del pronóstico de 4 meses posteriores al cierre de la base (`2026-08-01` a `2026-11-30`).

| Servicio | Mes | Promedio Diario Predicho | Intervalo Diario Medio [p10, p90] | Total Mensual Predicho |
|---|---|---|---|---|
| Emergency Room Visit | 2026-08 | 215.7 | [173.9, 254.6] | 6686 |
| Emergency Room Visit | 2026-09 | 221.0 | [182.3, 263.0] | 6631 |
| Emergency Room Visit | 2026-10 | 217.1 | [170.6, 261.0] | 6731 |
| Emergency Room Visit | 2026-11 | 216.0 | [159.6, 268.9] | 6479 |
| Ambulatory Rehabilitation Visit | 2026-08 | 333.6 | [76.9, 514.5] | 10340 |
| Ambulatory Rehabilitation Visit | 2026-09 | 385.9 | [60.4, 554.8] | 11577 |
| Ambulatory Rehabilitation Visit | 2026-10 | 351.4 | [31.0, 550.0] | 10894 |
| Ambulatory Rehabilitation Visit | 2026-11 | 330.5 | [6.6, 619.9] | 9915 |
| Treatment urgency {Diagnosis} | 2026-08 | 8.4 | [2.4, 46.7] | 262 |
| Treatment urgency {Diagnosis} | 2026-09 | 8.5 | [0.6, 48.8] | 255 |
| Treatment urgency {Diagnosis} | 2026-10 | 8.5 | [1.0, 51.5] | 263 |
| Treatment urgency {Diagnosis} | 2026-11 | 8.4 | [1.4, 59.0] | 253 |
