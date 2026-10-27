# Resultados · Modelo de Demanda (Llegadas Diarias)

_Estructura generada el 2026-10-27. Marcadores pendientes según regla 3 de AI.md._

> [!NOTE]
> **TODO (PC con `data/raw/`):** Para poblar automáticamente este reporte con las métricas reales sobre los 26 pliegues walk-forward, ejecutar en la raíz del proyecto:
> ```bash
> python -m hun.models.demanda
> ```

- **Datos:** `entradas_por_hora.parquet` (pendiente de ejecución local con `data/raw/`) · frecuencia diaria (`D`)
- **Validación:** walk-forward, horizonte 1 a 7 días.
- **Métrica principal:** WAPE (Σ|error| / Σ|real|).

## 1. Comparación de la Escalera de Modelos

| Modelo | WAPE | MAE | RMSE | Sesgo | Mejora vs. Base |
|---|---|---|---|---|---|
| 1. Línea base (mediana 8 semanas) | TODO | TODO | TODO | TODO | Referencia |
| 2. Poisson con calendario | TODO | TODO | TODO | TODO | TODO |
| 3. LightGBM (todos los externos) | TODO | TODO | TODO | TODO | TODO |
| 4. LightGBM (grupos aceptados) | TODO | TODO | TODO | TODO | TODO |

## 2. Desempeño por Servicio

| Servicio | WAPE | MAE | Sesgo | Promedio Real |
|---|---|---|---|---|
| Urgencias | TODO | TODO | TODO | TODO |
| Rehabilitación | TODO | TODO | TODO | TODO |
| Tratamiento Urgencia | TODO | TODO | TODO | TODO |

## 3. Desempeño por Día del Horizonte (1 a 7)

| Día | WAPE | MAE | Sesgo |
|---|---|---|---|
| 1 | TODO | TODO | TODO |
| 2 | TODO | TODO | TODO |
| 3 | TODO | TODO | TODO |
| 4 | TODO | TODO | TODO |
| 5 | TODO | TODO | TODO |
| 6 | TODO | TODO | TODO |
| 7 | TODO | TODO | TODO |

## 4. Días Festivos vs. Normales

| Tipo de Día | Modelo | WAPE | MAE | Sesgo |
|---|---|---|---|---|
| Día Normal | Línea base | TODO | TODO | TODO |
| Día Normal | LightGBM Final | TODO | TODO | TODO |
| Día Festivo | Línea base | TODO | TODO | TODO |
| Día Festivo | LightGBM Final | TODO | TODO | TODO |
