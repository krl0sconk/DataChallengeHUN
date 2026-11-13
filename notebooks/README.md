# notebooks/

Jupyter Notebooks para exploración, auditoría, preparación y prototipado de modelos.

## Convención de nombres

Formato estándar: `<NN>_<etapa>_<iniciales>_<tema>.ipynb` (ej. `01_exploracion_jn_flujo.ipynb`).

> [!IMPORTANT]
> **Seguridad y confidencialidad:** Las salidas de los notebooks se limpian automáticamente antes de cada commit mediante `nbstripout` (`pre-commit`), asegurando que ninguna visualización o tabla exponga datos sensibles. La lógica algorítmica modularizada debe migrarse siempre a `src/hun/`.

## Catálogo de Notebooks

### 1. `01_exploracion/`
- **`01_exploracion_jn_flujo.ipynb` (Juan):**
  - Análisis exploratorio del flujo y trayectorias de pacientes en urgencias y rehabilitación.
  - Genera las figuras diagnósticas en `reports/figures/exploracion/` (patrones día-hora, embudo de etapas clínicas, dispersión de tiempos y censo concurrente).
  - Hallazgos consolidados en [docs/hallazgos.md](../docs/hallazgos.md).

### 2. `02_preparacion/`
- **`02_preparacion_jn_auditoria_calidad.ipynb` (Juan):**
  - Verificación exhaustiva de calidad: solapamientos, nulos, duplicados y distribución de edades.
  - Validación de desplazamiento temporal: anclaje de festivos y domingos confirmando 0 días de desplazamiento.
  - Hallazgos consolidados en [docs/calidad_datos.md](../docs/calidad_datos.md).

### 3. `03_modelado/`
- **`01_modelado_krlos_demanda.ipynb` (Krlos):**
  - Construcción de datasets de series temporales con factores externos (clima, calendario, epidemias).
  - Evaluación walk-forward de 26 pliegues para Línea Base, Regresión Poisson y LightGBM por cuantiles.
  - Análisis de explicabilidad SHAP y calibración de intervalos de cobertura p10–p90.
  - Hallazgos consolidados en [docs/resultados/modelo_demanda.md](../docs/resultados/modelo_demanda.md).
