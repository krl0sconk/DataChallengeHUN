# Resultados · Intervalos Cuantílicos (p10, p50, p90) y Explicabilidad SHAP

_Generado automáticamente por `python -m hun.models.explicacion` el 2026-10-28 15:56._

- **Datos:** `entradas_por_hora.parquet` · frecuencia diaria (`D`)
- **Modelo:** LightGBM por cuantiles (p10, p50, p90) con corrección de cruces.
- **Intervalo objetivo:** p10–p90 (cobertura nominal esperada: 80.0 %).
- **Cobertura real global:** **80.5%** (amplitud media: 124.6 pacientes).

## 1. Cobertura Empírica por Servicio

| Servicio | Cobertura p10–p90 | Lím. Inf. (p10) | Mediana (p50) | Lím. Sup. (p90) | Amplitud |
|---|---|---|---|---|---|
| Otros (< 1 llegadas/día, agrupados) | 100.0% | 0.0 | 0.0 | 2.6 | 2.6 |
| Emergency Room Visit | 75.3% | 359.6 | 438.4 | 499.0 | 139.5 |
| Ambulatory Rehabilitation Visit | 72.0% | 628.0 | 820.2 | 965.3 | 337.3 |
| Treatment urgency {Diagnosis} | 74.7% | 5.9 | 14.1 | 24.8 | 18.9 |

## 2. Cobertura por Día del Horizonte (1 a 7)

| Día Horizonte | Cobertura p10–p90 | Amplitud Media |
|---|---|---|
| Día 1 | 80.8% | 148.1 |
| Día 2 | 77.9% | 68.6 |
| Día 3 | 84.6% | 35.7 |
| Día 4 | 80.8% | 204.7 |
| Día 5 | 80.8% | 139.8 |
| Día 6 | 81.7% | 135.7 |
| Día 7 | 76.9% | 139.4 |

## 3. Corrección de Cuantiles Cruzados

Se aplica ordenamiento monotónico `0 <= p10 <= p50 <= p90` y truncamiento en cero.
Esta transformación previene inconsistencias lógicas en el consumo web sin distorsionar la calibración global del modelo.

## 4. Ejemplos de Explicación SHAP por Factores Legibles

### Ejemplo 1: Registro 1
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-14
- **Predicción (p50):** 12 [Intervalo p10–p90: 5 – 24]
- **Aportes por factor:**
  - **Semana anterior:** -335.0 pacientes
  - **Festivo:** +18.4 pacientes
  - **Temporada del año:** +1.4 pacientes
  - **Vacaciones y Navidad:** +0.7 pacientes
  - **Día de la semana:** -0.1 pacientes

### Ejemplo 2: Registro 2
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-15
- **Predicción (p50):** 11 [Intervalo p10–p90: 5 – 21]
- **Aportes por factor:**
  - **Semana anterior:** -331.0 pacientes
  - **Festivo:** +13.6 pacientes
  - **Temporada del año:** +1.1 pacientes
  - **Vacaciones y Navidad:** +0.7 pacientes

### Ejemplo 3: Registro 3
- **Servicio:** Treatment urgency {Diagnosis} · **Fecha:** 2026-07-16
- **Predicción (p50):** 16 [Intervalo p10–p90: 5 – 25]
- **Aportes por factor:**
  - **Semana anterior:** -326.0 pacientes
  - **Festivo:** +14.0 pacientes
  - **Vacaciones y Navidad:** +0.8 pacientes
  - **Temporada del año:** +0.6 pacientes
  - **Día de la semana:** -0.2 pacientes
