# Revisión de cierre del Sprint 1

- **Tarea:** #14 · **Participan:** Krlos, Daniel y Juan
- **Fecha de la revisión:** 2026-10-28 (Cierre formal Sprint 1)

Cada uno muestra lo logrado; con eso se planea el Sprint 2. Las cifras se copian de los documentos
de resultados, nunca de memoria.

## Juan · preparación de datos

| Tarea | Estado | Dónde está |
|---|---|---|
| #17 Inventario de la base | Hecho (resumen) | `docs/inventario_base.md` |
| #12 Auditoría de calidad | Hecho (ejecutado con VPN) | `python -m hun.data.auditoria` → notebook `02_preparacion_jn_auditoria_calidad.ipynb` → `docs/calidad_datos.md` |
| #10 Extracción de agregados | Hecho (44 ventanas mensuales) | `python -m hun.data.agregados` (perfil de llegadas, censo por etapa, duraciones y esperas entre etapas) en `data/raw/` |
| #11 Traducción de conceptos | Hecho (1 246 conceptos) | `python -m hun.data.conceptos` → `data/processed/conceptos.parquet` |
| #13 Exploración inicial del flujo | Hecho (notebook ejecutado) | `notebooks/01_exploracion_jn_flujo.ipynb` → figuras en `reports/figures/exploracion/` → `docs/hallazgos.md` |
| #19 Herramienta del dashboard | Hecho: Power BI (aceptada) | DEC-005 en `docs/decisiones.md` |
| #18 Subconjunto y tabla maestra | Cerrado | Se mantiene agregación en `data/raw/` cumpliendo estrictamente la confidencialidad OMOP (AI.md) |

Correcciones de la revisión del PR (antes de correr las extracciones):

- Las extracciones por mes ya no guardan en caché meses a medias ni ventanas vacías: antes, correr
  con `--hasta` a mitad de mes dejaba ese mes incompleto para siempre (`src/hun/data/extraer.py`,
  pruebas en `tests/test_extraer.py`).
- Edades imposibles salen como `invalida` en el perfil de llegadas, y las esperas entre etapas ya
  no usan etapas con fechas inválidas (ver *Reglas de limpieza* en `docs/calidad_datos.md`).

Resultados de la auditoría y calidad (`docs/calidad_datos.md`):

- **¿Las fechas están corridas?:** NO. Desplazamiento verificado de **0 días** (anclaje perfecto con festivos oficiales de Colombia y domingo/semana en rehabilitación vs urgencias).
- **Problemas de calidad identificados:** Nulos 0.00% en identificadores; duplicados 13.38% en `visit_occurrence` y 6.94% en `visit_detail`; 7 visitas con edades imposibles (<0 o >120 años); `visit_end_datetime = visit_start_datetime` en el 100% de `visit_occurrence` (resuelto extrayendo etapas en `visit_detail`).
- **Primeros lugares con congestión (`docs/hallazgos.md`):** Cuello de botella crítico en observación/hospitalización dentro de urgencias (estancia mediana ~46 h, p90 ~158 h); pico matutino de admisiones (8:00 a 11:00 am) y saturación que bloquea el flujo desde urgencias ambulatorias.

## Krlos · modelo y datos externos

| Tarea | Estado | Dónde está |
|---|---|---|
| Objetivo de predicción e inventario | Hecho (cerrado 2026-10-15) | `docs/objetivo_prediccion.md`, DEC-002 en `docs/decisiones.md` |
| Pipeline de datos externos | Hecho (calendario generado; clima y SIVIGILA listos) | `src/external/build.py` → `data/externos.parquet`, `data/external/manual/vacaciones_escolares.csv` |
| Validación walk-forward | Hecho (aceptada DEC-003) | `src/hun/models/validacion.py`, DEC-003 en `docs/decisiones.md` |
| Línea base horaria y diaria | Hecho (evaluada sobre 26 pliegues) | `src/hun/models/linea_base.py` → `docs/resultados/linea_base.md` y `docs/resultados/linea_base_diaria.md` |
| Protocolo de evaluación de factores externos | Hecho (aceptada DEC-004) | `src/hun/models/evaluacion_factores.py` → `docs/protocolo_factores_externos.md`, DEC-004 en `docs/decisiones.md` |

Hallazgos del inventario y datos (`docs/objetivo_prediccion.md`, DEC-002):

- Rango 2023-01-01 a 2026-07-17 (último día completo 2026-07-16), ~3,5 años.
- Volúmenes por servicio:
  - Rehabilitación ambulatoria (581479): 1 089 461 visitas (~827/día). Se modela.
  - Urgencias (9203): 598 088 visitas (~443/día). Se modela.
  - Urgencia-tratamiento (3045729): 17 858 visitas (~15/día). Se modela por día; por hora es muy ruidoso.
  - Hospitalización (9201, 592 visitas, ~0,5/día) y sin concepto (0, 2 visitas): agrupados en "Otros" (< 1 llegada/día, excluidos del promedio de decisión).
- Calidad de duración y censo: `visit_end_datetime = visit_start_datetime` en `visit_occurrence` (mediana y p90 = 0 h en todos los tipos), por lo que el censo pasa a `visit_detail`.

Resultados de la línea base (mediana de 8 semanas, referencia a superar):

- Validación walk-forward: 26 pliegues (origen 2025-07-25 → 2026-07-10), horizonte 7 días, paso 14 días.
- Diaria (`docs/resultados/linea_base_diaria.md`): WAPE 18.0% (MAE 57.77, RMSE 174.37, sesgo +16.08).
  - Por servicio: Rehabilitación 21.4% (MAE 177.21), Urgencias 10.7% (MAE 47.49), Treatment urgency 42.0% (MAE 6.37).
- Horaria (`docs/resultados/linea_base.md`): WAPE 29.4% (MAE 3.94, RMSE 12.70, sesgo +0.36).
  - Por servicio: Rehabilitación 27.9%, Urgencias 29.7%, Treatment urgency 108.3%.
- Falla sistemática en semanas con festivo: la línea base falla marcadamente en festivos (lunes festivos por Ley Emiliani —donde el día 4 del horizonte sube a WAPE 39.6% diario / 49.2% horario y pliegues con puentes superan 22–33%— y Navidad–Año Nuevo, pliegue 11 con origen 2025-12-26 donde el WAPE se dispara a 137.9% diario y 144.6% horario).

Protocolo de evaluación de factores externos (DEC-004):

- 4 pruebas para aceptar un grupo de factores (`src/hun/models/evaluacion_factores.py`):
  1. **Ablación:** mediana de mejora relativa ≥ 1%.
  2. **Control de estacionalidad:** el modelo base ya incluye rezagos (7, 14, 21, 28 días), día de la semana, mes y ciclo anual (seno/coseno); la mejora debe ser sobre esa base.
  3. **Placebo:** mejora del placebo < ½ de la mejora real (serie desplazada para descartar ruido).
  4. **Estabilidad:** mejora en ≥ 70% de los pliegues y prueba de signo unilateral con p ≤ 0.05 (al menos 18 de 26 pliegues).

## Daniel · web y validación

- **Sprint 1:** Definición del contrato modelo-web y diseño arquitectónico (DEC-006).
- **Sprint 2 (avanzado):** Construcción del frontend React + Vite + Tailwind CSS en `app/` y desarrollo del backend FastAPI en `app/api/__init__.py` (DEC-007) consumiendo predicciones reales y SHAP TreeExplainer desde `data/processed/modelos_web_bundle.joblib`.

## Decisiones y plan del Sprint 2

- **Decisiones aceptadas:** DEC-003 (validación walk-forward), DEC-004 (protocolo de factores externos), DEC-005 (Power BI), DEC-006 (React + Vite) y DEC-007 (FastAPI Backend).
- **Entregables clave de Sprint 2:**
  1. **Modelo de Demanda y Factores:** LightGBM por cuantiles entrenado y evaluado (WAPE 16.5% diario vs 18.0% baseline; 81.3% cobertura p10-p90; ver `docs/resultados/modelo_demanda.md`).
  2. **Modelo de Censo y Saturación:** Reconstrucción horaria por etapas en `visit_detail` con warm-up de 24 días y semáforos de saturación p75/p90 (`docs/resultados/saturacion.md`).
  3. **Explicabilidad SHAP e Intervalos:** Cálculo y ranking de aportes de festivos, clima y rezagos (`docs/resultados/intervalos_shap.md`).
  4. **Plantilla Power BI (`dashboards/powerbi/`):** Construcción de la plantilla `.pbit` conectada a los agregados procesados para publicación final del enlace interactivo.
  5. **Modelo de Estancia (`estancia`):** Predicción de duración por etapa y perfil clínico.
  6. **Simulador Interactivo en la Web:** Consolidación de controles para simulación de escenarios "¿qué pasa si?".
  7. **Presentación Ejecutiva:** Diapositivas e informe final para el jurado del Data Challenge HUN 2026.
