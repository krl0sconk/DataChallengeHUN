# Resultados · Intervalos Cuantílicos (p10, p50, p90) y Explicabilidad SHAP

_Generado automáticamente por `python -m hun.models.explicacion` el 2026-11-03 16:20._

- **Datos:** `entradas_por_hora.parquet` · frecuencia diaria (`D`)
- **Modelo:** LightGBM por cuantiles (p10, p50, p90) con corrección de cruces.
- **Intervalo objetivo:** p10–p90 (cobertura nominal esperada: 80.0 %).
- **Cobertura real global:** **83.2%** (amplitud media: 112.6 pacientes).

## 1. Cobertura Empírica por Servicio

| Servicio | Cobertura p10–p90 | Lím. Inf. (p10) | Mediana (p50) | Lím. Sup. (p90) | Amplitud |
|---|---|---|---|---|---|
| Otros (< 1 llegadas/día, agrupados) | 100.0% | 0.0 | 0.0 | 2.5 | 2.5 |
| Emergency Room Visit | 85.2% | 276.8 | 353.7 | 419.0 | 142.2 |
| Ambulatory Rehabilitation Visit | 72.0% | 504.2 | 670.7 | 792.9 | 288.7 |
| Treatment urgency {Diagnosis} | 75.8% | 5.3 | 11.9 | 22.4 | 17.0 |

## 2. Cobertura por Día del Horizonte (1 a 7)

| Día Horizonte | Cobertura p10–p90 | Amplitud Media |
|---|---|---|
| Día 1 | 84.6% | 124.3 |
| Día 2 | 84.6% | 69.1 |
| Día 3 | 90.4% | 38.9 |
| Día 4 | 77.9% | 174.5 |
| Día 5 | 84.6% | 121.2 |
| Día 6 | 79.8% | 128.8 |
| Día 7 | 80.8% | 131.4 |

## 3. Corrección de Cuantiles Cruzados

Se aplica ordenamiento monotónico `0 <= p10 <= p50 <= p90` y truncamiento en cero.
Esta transformación previene inconsistencias lógicas en el consumo web sin distorsionar la calibración global del modelo.

## 4. Ejemplos de Explicación SHAP por Factores Legibles

### Ejemplo 1: Registro 1
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-14
- **Predicción (p50):** 7 [Intervalo p10–p90: 4 – 12]
- **Aportes por factor:**
  - **Semana anterior:** -292.8 pacientes
  - **Festivo:** +13.8 pacientes
  - **Temporada del año:** +1.5 pacientes
  - **Día de la semana:** -0.3 pacientes
  - **Vacaciones y Navidad:** +0.3 pacientes

### Ejemplo 2: Registro 2
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-15
- **Predicción (p50):** 8 [Intervalo p10–p90: 2 – 14]
- **Aportes por factor:**
  - **Semana anterior:** -286.8 pacientes
  - **Festivo:** +8.4 pacientes
  - **Temporada del año:** +1.5 pacientes
  - **Vacaciones y Navidad:** +0.3 pacientes
  - **Día de la semana:** -0.1 pacientes

### Ejemplo 3: Registro 3
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-16
- **Predicción (p50):** 9 [Intervalo p10–p90: 7 – 17]
- **Aportes por factor:**
  - **Semana anterior:** -285.5 pacientes
  - **Festivo:** +8.7 pacientes
  - **Temporada del año:** +1.4 pacientes
  - **Vacaciones y Navidad:** +0.3 pacientes
  - **Día de la semana:** -0.1 pacientes
