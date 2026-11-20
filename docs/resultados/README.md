# docs/resultados/

Reportes experimentales generados automáticamente por el código. **Solo métricas agregadas** (errores WAPE, MAE, coberturas de cuantiles, conteos e importancias SHAP): nunca filas de pacientes.

Las tablas experimentales se regeneran ejecutando los módulos correspondientes. Las notas metodológicas editoriales identifican limitaciones sin alterar los valores observados.

## Catálogo de Reportes

| Archivo | Generado por | Contenido principal |
|---|---|---|
| [`linea_base.md`](linea_base.md) | `python -m hun.models.linea_base` | Evaluación horaria del modelo de referencia (WAPE 29.4%, desglose por servicio y análisis de festivos). |
| [`linea_base_diaria.md`](linea_base_diaria.md) | `python -m hun.models.linea_base --frecuencia D --salida docs/resultados/linea_base_diaria.md` | Evaluación diaria del modelo de referencia (WAPE 18.0% en 26 pliegues walk-forward). |
| [`modelo_demanda.md`](modelo_demanda.md) | `python -m hun.models.demanda` | Línea base 18.0% → Poisson estratificado 15.6% → `lgbm_final` 10.5% WAPE (mejora relativa 41.6%). Todos los externos: 10.5%, mejora 41.8%. |
| [`factores_externos.md`](factores_externos.md) | `python -m hun.models.demanda` / `evaluacion_factores.py` | Evaluación de ablación, test placebo y estabilidad de factores climáticos, calendario y epidemiología. |
| [`saturacion.md`](saturacion.md) | `python -m hun.models.saturacion` | Censo horario por etapa (`visit_detail`), verificación del supuesto de stock inicial ($N_0 = 0$ antes de acumular movimientos), recorte `p99.9` alineado entre `SQL14`, `SQL15` y `SQL16`, y niveles de saturación p75/p90. |
| [`intervalos_shap.md`](intervalos_shap.md) | `python -m hun.models.explicacion` | Validación de intervalos de predicción y ranking de factores explicativos SHAP (TreeExplainer). |
| [`largo_plazo.md`](largo_plazo.md) | `python -m hun.models.largo_plazo` | Backtest walk-forward a 120 días (exactitud 84.3%, cobertura 86.5%) y pronóstico ago–nov 2026 con clima típico e intervalos crecientes. |
| [`optimizacion.md`](optimizacion.md) | `python -m hun.models.optimizacion`; bundle mediante `python -m hun.models.empaquetar` | Erlang C por franja, contraste de Ley de Little (284.01 frente a mediana 283.0), verificación del supuesto de stock inicial ($N_0 = 0$) y del recorte `p99.9` común a `SQL14`, `SQL15` y `SQL16`, escenarios de estancia y altas, y REC-01 a REC-05. |

**Lectura consolidada:** [informe final](../../reports/informe_final.md). `intervalos_shap.md` registra cobertura global 83.2% en su corrida del 2026-11-03; no debe confundirse con el backtest puntual actualizado de demanda. [La validación independiente](validacion_independiente.md) conserva las cifras de la auditoría del 2026-11-03: no certifica la nueva corrida ni sustituye la verificación con la [suite vigente de **180 pruebas**](../../tests/).
