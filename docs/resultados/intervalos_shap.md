# Resultados · Intervalos Cuantílicos (p10, p50, p90) y Explicabilidad SHAP

_Generado automáticamente por `python -m hun.models.explicacion` el 2026-11-03 15:12._

- **Datos:** `entradas_por_hora.parquet` · frecuencia diaria (`D`)
- **Modelo:** LightGBM por cuantiles (p10, p50, p90) con corrección de cruces.
- **Intervalo objetivo:** p10–p90 (cobertura nominal esperada: 80.0 %).
- **Cobertura real global:** **81.2%** (amplitud media: 124.5 pacientes).

## 1. Cobertura Empírica por Servicio

| Servicio | Cobertura p10–p90 | Lím. Inf. (p10) | Mediana (p50) | Lím. Sup. (p90) | Amplitud |
|---|---|---|---|---|---|
| Otros (< 1 llegadas/día, agrupados) | 100.0% | 0.0 | 0.0 | 2.6 | 2.6 |
| Emergency Room Visit | 74.7% | 359.9 | 439.6 | 500.0 | 140.1 |
| Ambulatory Rehabilitation Visit | 72.5% | 623.5 | 821.6 | 959.9 | 336.4 |
| Treatment urgency {Diagnosis} | 77.5% | 6.0 | 14.1 | 24.8 | 18.9 |

## 2. Cobertura por Día del Horizonte (1 a 7)

| Día Horizonte | Cobertura p10–p90 | Amplitud Media |
|---|---|---|
| Día 1 | 79.8% | 145.1 |
| Día 2 | 83.7% | 67.7 |
| Día 3 | 85.6% | 34.8 |
| Día 4 | 82.7% | 202.7 |
| Día 5 | 80.8% | 141.6 |
| Día 6 | 77.9% | 137.6 |
| Día 7 | 77.9% | 141.9 |

## 3. Corrección de Cuantiles Cruzados

Se aplica ordenamiento monotónico `0 <= p10 <= p50 <= p90` y truncamiento en cero.
Esta transformación previene inconsistencias lógicas en el consumo web sin distorsionar la calibración global del modelo.

## 4. Ejemplos de Explicación SHAP por Factores Legibles

### Ejemplo 1: Registro 1
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-14
- **Predicción (p50):** 12 [Intervalo p10–p90: 5 – 21]
- **Aportes por factor:**
  - **Semana anterior:** -333.5 pacientes
  - **Festivo:** +17.1 pacientes
  - **Temporada del año:** +1.6 pacientes
  - **Vacaciones y Navidad:** +0.2 pacientes
  - **Día de la semana:** -0.1 pacientes

### Ejemplo 2: Registro 2
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-15
- **Predicción (p50):** 11 [Intervalo p10–p90: 5 – 21]
- **Aportes por factor:**
  - **Semana anterior:** -330.5 pacientes
  - **Festivo:** +13.3 pacientes
  - **Temporada del año:** +1.1 pacientes
  - **Vacaciones y Navidad:** +0.2 pacientes
  - **Día de la semana:** -0.1 pacientes

### Ejemplo 3: Registro 3
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-16
- **Predicción (p50):** 16 [Intervalo p10–p90: 5 – 29]
- **Aportes por factor:**
  - **Semana anterior:** -325.4 pacientes
  - **Festivo:** +13.4 pacientes
  - **Temporada del año:** +0.8 pacientes
  - **Vacaciones y Navidad:** +0.3 pacientes
  - **Día de la semana:** -0.2 pacientes
