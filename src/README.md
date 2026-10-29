# src/

Código fuente del proyecto, estructurado en dos paquetes principales: `hun` (lógica hospitalaria y modelado) y `external` (adquisición de variables de entorno).

Se instala en modo editable con `pip install -e .`.

## Estructura de paquetes

### 1. `src/hun/` — Núcleo del Data Challenge HUN

| Módulo / Subdirectorio | Responsabilidad |
|---|---|
| `config.py` | Rutas canónicas (`RAW_DIR`, `PROCESSED_DIR`, etc.), variables de entorno y semilla `RANDOM_SEED = 42`. |
| `data/conexion.py` | Conexión segura de solo lectura a la base de datos PostgreSQL del HUN. |
| `data/extraer.py` | Motor de ejecución de consultas SQL y exportación a formato Parquet. |
| `data/agregados.py` | Pipeline de extracción particionada en 44 ventanas mensuales de series agregadas. |
| `data/auditoria.py` | Extracción de tablas de calidad: solapamientos, edades, completitud y temporalidad. |
| `data/conceptos.py` | Extracción y resolución de conceptos OMOP CDM (`data/processed/conceptos.parquet`). |
| `data/borrar_datos.py` | Utilidad de sanitización para eliminar datos locales confidenciales antes de compartir código. |
| `data/sql/` | Colección de 23 consultas SQL parametrizadas para OMOP CDM. |
| `features/` | Transformaciones tabulares, rezagos de series temporales y protecciones anti-fuga de datos. |
| `models/validacion.py` | Framework de validación walk-forward temporal (WAPE, MAE, cobertura cuantil, sesgo). |
| `models/linea_base.py` | Modelo de referencia estacional (mediana de 8 semanas por día y hora). |
| `models/demanda.py` | Escalera de modelos de demanda: Poisson GLM y LightGBM por cuantiles (p10, p50, p90). |
| `models/saturacion.py` | Reconstrucción del censo por etapas en urgencias (`visit_detail`) y cálculo de capacidad empírica. |
| `models/evaluacion_factores.py` | Protocolo de ablación e impacto de factores externos (clima, calendario, epidemias). |
| `models/explicacion.py` | Descomposición de predicciones mediante valores SHAP TreeExplainer. |
| `models/predict.py` | Contrato de servicio para la web/API: carga de bundle `modelos_web_bundle.joblib` y predicciones en tiempo real. |
| `visualization/` | Generación de visualizaciones analíticas con Plotly y Matplotlib. |

### 2. `src/external/` — Pipeline de Datos Externos

| Módulo | Responsabilidad |
|---|---|
| `calendario.py` | Generación de festivos nacionales colombianos, puentes, Semana Santa, Carnaval y quincenas. |
| `clima.py` | Consulta a la API histórica de Open-Meteo para Barranquilla (temperatura, precipitación, humedad, viento). |
| `epidemiologia.py` | Procesamiento de reportes epidemiológicos SIVIGILA (dengue, IRA) con rezago anti-fuga de 2-3 semanas. |
| `build.py` | Orquestador que consolida todas las fuentes externas en `data/externos.parquet`. |
