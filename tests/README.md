# tests/

Suite de pruebas automatizadas del proyecto ejecutada con `pytest`.

```bash
# Ejecutar todas las pruebas
pytest

# Ejecutar una suite específica con detalle
pytest tests/test_predict.py -v
```

> [!IMPORTANT]
> **Aislamiento y datos sintéticos:** Ninguna prueba unitaria o de integración depende ni lee datos reales confidenciales del hospital. Todos los tests construyen pequeños DataFrames sintéticos o fixtures controlados en memoria, asegurando reproducibilidad total y cumplimiento estricto de privacidad.

## Módulos de pruebas (81 pruebas)

| Archivo | Tests | Qué valida |
|---|---|---|
| `test_import.py` | 2 | Importación correcta del paquete `hun` y resolución canónica de rutas en `config.py`. |
| `test_api.py` | 10 | Endpoints de FastAPI (`/api/salud`, `/api/servicios`, `/api/predecir`, `/api/ocupacion`), validación Pydantic y CORS. |
| `test_predict.py` | 10 | Cumplimiento del contrato modelo-web, invariantes de intervalo (p10 ≤ p50 ≤ p90), alertas y agrupación de factores SHAP. |
| `test_demanda.py` | 4 | Escalera de modelos (Poisson GLM, LightGBM Cuantil), ausencia de fuga en rezagos temporales y compatibilidad de inferencia. |
| `test_saturacion.py` | 5 | Reconstrucción de censo por etapas, período de warm-up (calentamiento), umbrales p75/p90 y semáforos de saturación. |
| `test_modelo_base.py` | 23 | Validación walk-forward temporal, cálculo de WAPE/MAE, modelo de línea base (mediana 8 semanas), protocolo anti-inyección SQL y pruebas placebo. |
| `test_auditoria.py` | 14 | Detección de desplazamientos de fechas, verificación de festivos colombianos, completitud, duplicados y traducción de conceptos OMOP. |
| `test_external.py` | 7 | Calendario (festivos, Carnaval, puentes, quincenas), clima Open-Meteo y rezago de semanas epidemiológicas SIVIGILA. |
| `test_extraer.py` | 6 | Manejo robusto de ventanas mensuales de extracción, evitación de sobreescritura de meses parciales y caché. |
