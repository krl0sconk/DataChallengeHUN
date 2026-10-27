# Resultados · Intervalos Cuantílicos (p10, p50, p90) y Explicabilidad SHAP

_Estructura generada el 2026-10-27. Marcadores pendientes según regla 3 de AI.md._

> [!NOTE]
> **TODO (PC con `data/raw/`):** Para calcular la cobertura real del intervalo p10–p90 en los 26 pliegues y los 3 ejemplos agregados de explicación SHAP, ejecutar:
> ```bash
> python -m hun.models.explicacion
> ```

- **Datos:** `entradas_por_hora.parquet` (pendiente de ejecución local con `data/raw/`) · frecuencia diaria (`D`)
- **Modelo:** LightGBM por cuantiles (`p10=0.10`, `p50=0.50`, `p90=0.90`) con corrección de cruces.
- **Intervalo objetivo:** p10–p90 (cobertura nominal: 80.0 %).
- **Cobertura real global:** TODO: completar con resultado real

## 1. Cobertura Empírica por Servicio

| Servicio | Cobertura p10–p90 | Lím. Inf. (p10) | Mediana (p50) | Lím. Sup. (p90) | Amplitud |
|---|---|---|---|---|---|
| Urgencias | TODO: completar con resultado real | TODO | TODO | TODO | TODO |
| Rehabilitación | TODO: completar con resultado real | TODO | TODO | TODO | TODO |
| Tratamiento Urgencia | TODO: completar con resultado real | TODO | TODO | TODO | TODO |

## 2. Cobertura por Día del Horizonte (1 a 7)

| Día Horizonte | Cobertura p10–p90 | Amplitud Media |
|---|---|---|
| Día 1 | TODO: completar con resultado real | TODO |
| Día 2 | TODO: completar con resultado real | TODO |
| Día 3 | TODO: completar con resultado real | TODO |
| Día 4 | TODO: completar con resultado real | TODO |
| Día 5 | TODO: completar con resultado real | TODO |
| Día 6 | TODO: completar con resultado real | TODO |
| Día 7 | TODO: completar con resultado real | TODO |

## 3. Corrección de Cuantiles Cruzados

Se aplica ordenamiento monotónico `0 <= p10 <= p50 <= p90` y truncamiento en cero.

- **Porcentaje de cruces detectados y corregidos:** TODO: completar con resultado real

## 4. Ejemplos de Explicación SHAP por Factores Legibles

### Ejemplo 1: Lunes Festivo en Urgencias
- **Servicio:** Urgencias · **Fecha:** TODO: completar con resultado real
- **Predicción (p50):** TODO [Intervalo p10–p90: TODO – TODO]
- **Aportes por factor:**
  - **Festivo:** TODO: completar con resultado real
  - **Día de la semana:** TODO: completar con resultado real
  - **Semana anterior:** TODO: completar con resultado real

### Ejemplo 2: Jornada Regular Entre Semana
- **Servicio:** Rehabilitación · **Fecha:** TODO: completar con resultado real
- **Predicción (p50):** TODO [Intervalo p10–p90: TODO – TODO]
- **Aportes por factor:**
  - **Día de la semana:** TODO: completar con resultado real
  - **Semana anterior:** TODO: completar con resultado real
  - **Temporada del año:** TODO: completar con resultado real

### Ejemplo 3: Fin de Semana en Temporada Especial
- **Servicio:** Urgencias · **Fecha:** TODO: completar con resultado real
- **Predicción (p50):** TODO [Intervalo p10–p90: TODO – TODO]
- **Aportes por factor:**
  - **Vacaciones y Navidad:** TODO: completar con resultado real
  - **Día de la semana:** TODO: completar con resultado real
  - **Quincena:** TODO: completar con resultado real
