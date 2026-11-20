# tests/

Suite de pruebas automatizadas del proyecto ejecutada con `pytest`.

```bash
# Ejecutar todas las pruebas
pytest

# Ejecutar una suite específica con detalle
pytest tests/test_predict.py -v
```

> [!IMPORTANT]
> **Aislamiento y datos sintéticos:** Las pruebas no consultan la base hospitalaria. Usan fixtures sintéticos o controlados; algunas pruebas de predicción cargan el bundle agregado local cuando existe. Las pruebas de producción aíslan explícitamente el acceso a Parquet. Aprobar esta suite no reproduce los backtests hospitalarios ni valida eficacia clínica.

## Módulos de pruebas

El inventario siguiente es orientativo y no exhaustivo. Consulta el conteo vigente con `pytest --collect-only -q`; la auditoría local del 19 de noviembre verificó 176 pruebas aprobadas antes de las correcciones posteriores. Las pruebas adicionales de regresión se cuentan al ejecutar la suite.

| Archivo | Conteo histórico | Qué valida |
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

## Cierre de correcciones

El 19 de noviembre de 2026 se ejecutaron **180 pruebas Python, todas aprobadas**, en 228.50 s, con conexiones externas bloqueadas. Las **3 pruebas Node** de `app/src/lib/optimizationPayload.test.js` también aprobaron. La compilación de frontend se validó en una carpeta temporal externa. No se reejecutaron backtests hospitalarios ni se regeneró el bundle.

```bash
node --test app/src/lib/optimizationPayload.test.js
```
