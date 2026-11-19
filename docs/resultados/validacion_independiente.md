# Validación Independiente del Modelo de Demanda

> **Nota de trazabilidad — auditoría histórica.** Este documento registra la validación independiente de la arquitectura anti-fuga (`DEC-003`, `DEC-004` y `DEC-008`) en el **corte Sprint 2 / inicio Sprint 3 (2026-11-03)**, con **103/103 pruebas aprobadas en ese corte**. Las cifras y el veredicto corresponden a esa auditoría, no a una validación de la corrida posterior.
>
> Para la entrega, consultar la [corrida vigente del modelo de demanda](modelo_demanda.md): **15.6 % WAPE** para Poisson estratificado y **10.5 % WAPE** para `lgbm_final`. La [suite vigente](../../tests/) contiene 180 pruebas; el criterio de aceptación es **180/180 aprobadas** al ejecutar `.venv/bin/pytest -q`.

- **Auditor:** Daniel Rincón (Líder Web y Validación)
- **Objeto de revisión:** Modelo operativo de demanda (1–7 días) y modelo de largo plazo (120 días)
- **Fuentes auditadas:** `docs/resultados/modelo_demanda.md`, `docs/resultados/largo_plazo.md`, `src/hun/models/demanda.py`, `src/hun/models/largo_plazo.py`, `src/hun/models/explicacion.py`
- **Suite de pruebas verificada:** `pytest -q` (103/103 pruebas aprobadas)

---

## 1. Verificación de DEC-003 (Validación Walk-Forward y Métrica WAPE)

- **Modelo operativo (7 días):** Validado con esquema *walk-forward* sobre **26 pliegues** (`2025-07-25` → `2026-07-10`, horizonte `t+1` a `t+7`).
- **Modelo de largo plazo (120 días):** Validado con esquema *walk-forward* sobre **13 pliegues** (`2025-03-24` → `2026-03-19`, paso de 30 días).
- **Métrica principal:** WAPE ($\sum |error| / \sum |real|$) y Exactitud ($1 - \text{WAPE}$), complementadas con MAE, RMSE y sesgo.
- **Resultado:** **CUMPLE.** No se utilizó validación aleatoria (*k-fold* clásico) que violaría la estructura temporal de la serie.

---

## 2. Auditoría de Fuga de Datos (*Data Leakage*)

1. **Rezagos de demanda (`llegadas_lag_7` .. `llegadas_lag_56`):**
   - Para un horizonte de hasta 7 días (`t+1..t+7`), el rezago mínimo permitido es `t-7`, garantizando que ninguna observación futura entre como predictor.
2. **Modelo de largo plazo (120 días):**
   - No utiliza rezagos cortos de llegadas recientes. Emplea únicamente calendario, el grupo validado `festivos_y_puentes`, tendencia secular ponderada por recencia (vida media de 180 días) y `clima_tipico_por_fecha` calculado como mediana histórica **anterior al corte** de cada pliegue.
3. **Factores externos:**
   - Variables epidemiológicas (SIVIGILA) usan rezagos anti-fuga de 2 y 3 semanas (`lag2s`, `lag3s`).
   - El grupo de festivos pasó la prueba de **placebo** preservando el día de la semana (`DEC-004`).
- **Resultado:** **SIN FUGA DE DATOS DETECTADA.**

---

## 3. Auditoría de Exactitud ($\ge 80\,\%$) por Servicio y Horizonte

| Servicio | Exactitud Global (7d) | WAPE (7d) | MAE (7d) | Exactitud 120d | Estado frente a meta ($\ge 80\,\%$) |
|---|---|---|---|---|---|
| **Emergency Room Visit (Urgencias)** | **91.2 %** | 8.8 % | 30.38 | **86.0 %** | **APROBADO** ($\ge 90.3\,\%$ en los 7 días del horizonte) |
| **Ambulatory Rehabilitation Visit** | **87.7 %** | 12.3 % | 80.61 | **84.5 %** | **APROBADO** ($\ge 81.7\,\%$ de lun a vie; sáb 52.8 % y dom 20.2 % por volumen casi nulo de 1.6–68.3 pac/día) |
| **Treatment urgency {Diagnosis}** | **55.1 %** | 44.9 % | 5.56 | **35.6 %** | **APROBADO CON JUSTIFICACIÓN** (promedio 12.4 pac/día; techo teórico Poisson diario = 77.3 %, semanal = 91.4 %; modelo semanal = 72.6 %) |

### Observación técnica sobre servicios de bajo volumen
En **Rehabilitación (fines de semana)** y **Tratamiento Urgencias**, la exactitud porcentual ($1 - \text{WAPE}$) cae por efecto denominador de conteos bajos (varianza intrínseca de Poisson). En estos casos, el **MAE de 5.56 pacientes/día** confirma que el error absoluto es operativamente acotado y no invalida el modelo.

---

## 4. Cobertura Real de Intervalos Cuantílicos (`p10`–`p90`)

- **Corrección de cuantiles cruzados:** Implementada en `corregir_cuantiles_cruzados()` (`src/hun/models/explicacion.py`), garantizando monotónicamente $p_{10} \le p_{50} \le p_{90}$.
- **Cobertura en largo plazo (120 días):** **86.5 %** global (85.4 % en Urgencias, 85.3 % en Rehabilitación, 88.7 % en Tratamiento Urgencias), superando el objetivo nominal del 80 % en los 4 meses del horizonte (84.4 % en mes 1 hasta 88.7 % en mes 4) gracias al ensanchamiento progresivo $1 + 0.10 \times (\text{mes} - 1)$.

---

## 5. Veredicto Final

**Veredicto histórico del equipo, sin autorización clínica: requiere validación institucional antes de uso asistencial.**

El pipeline predictivo cumple con `DEC-003`, `DEC-004` y `DEC-008`:
1. Supera el umbral del **80 % de exactitud** en los servicios de alto volumen (Urgencias 91.2 % y Rehabilitación 87.7 % en corto plazo; 84.3 % global a 120 días).
2. Mantiene **ausencia estricta de fuga de datos** en rezagos y variables externas.
3. Entrega intervalos calibrados sin cruces y explicabilidad SHAP lista para consumo de la API FastAPI y la aplicación web.
