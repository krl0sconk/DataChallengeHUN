# docs/resultados/

Reportes experimentales generados automáticamente por el código. **Solo métricas agregadas** (errores WAPE, MAE, coberturas de cuantiles, conteos e importancias SHAP): nunca filas de pacientes.

Se regeneran ejecutando los módulos correspondientes; no se editan a mano.

## Catálogo de Reportes

| Archivo | Generado por | Contenido principal |
|---|---|---|
| [`linea_base.md`](linea_base.md) | `python -m hun.models.linea_base` | Evaluación horaria del modelo de referencia (WAPE 29.4%, desglose por servicio y análisis de festivos). |
| [`linea_base_diaria.md`](linea_base_diaria.md) | `python -m hun.models.linea_base --frecuencia D --salida docs/resultados/linea_base_diaria.md` | Evaluación diaria del modelo de referencia (WAPE 18.0% en 26 pliegues walk-forward). |
| [`modelo_demanda.md`](modelo_demanda.md) | `python -m hun.models.demanda` | Escalera de modelos de demanda: Baseline (18.0%) → Poisson (17.5%) → LightGBM Cuantil (16.5% WAPE, 81.3% cobertura p10-p90). |
| [`factores_externos.md`](factores_externos.md) | `python -m hun.models.demanda` / `evaluacion_factores.py` | Evaluación de ablación, test placebo y estabilidad de factores climáticos, calendario y epidemiología. |
| [`saturacion.md`](saturacion.md) | `python -m hun.models.saturacion` | Reconstrucción de censo horario en urgencias a partir de `visit_detail`, percentiles p75/p90 y niveles de saturación. |
| [`intervalos_shap.md`](intervalos_shap.md) | `python -m hun.models.explicacion` | Validación de intervalos de predicción y ranking de factores explicativos SHAP (TreeExplainer). |
| [`largo_plazo.md`](largo_plazo.md) | `python -m hun.models.largo_plazo` | Backtest walk-forward a 120 días (exactitud 84.3%, cobertura 86.5%) y pronóstico ago–nov 2026 con clima típico e intervalos crecientes. |
