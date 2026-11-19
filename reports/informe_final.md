# Informe Final — Data Challenge HUN 2026 (Equipo MediFlow)

**Hospital Universidad del Norte · Corte documental: 18 de noviembre de 2026**

MediFlow convierte agregados hospitalarios OMOP en una solución para comprender el flujo, anticipar demanda y evaluar decisiones operacionales. Este documento consolida metodología, resultados, conclusiones y recomendaciones como informe final de la Sección 13. Tras el resumen ejecutivo, las secciones 2–8 corresponden, una a una, a los siete criterios de evaluación de la Sección 14; sus pesos suman 100 %.

**Equipo:** Krlos (modelos, integración y documentación), Daniel (web y validación) y Juan (preparación, análisis y Power BI). El trabajo se organiza iterativamente por sprints y revisiones de entregables, sin atribuir una duración semanal fija.

## 1. Resumen ejecutivo

El problema no es únicamente anticipar cuántos pacientes llegan: es conectar esa demanda con la permanencia en cada etapa y las posibilidades reales de atención y egreso. OMOP no incluye capacidad instalada ni una tabla de dotación; por ello distinguimos presión histórica, requerimientos paramétricos y capacidad física.

La solución tiene tres capas: **entender** (auditoría, etapas y cuellos de botella), **predecir** (llegadas, incertidumbre y horizonte extendido) y **decidir** (semáforos, explicaciones y escenarios). Un módulo de **optimización operacional** integra Erlang C, Ley de Little y simulación horaria de altas tempranas.

| Resultado verificado | Lectura para decisión | Fuente |
|---|---|---|
| WAPE diario: 18.0% → 15.6% → 10.5% | Línea base → Poisson estratificado → `lgbm_final`; mejora relativa final 41.6% frente a la base | [Demanda](../docs/resultados/modelo_demanda.md) |
| Urgencias: WAPE 8.4%, exactitud 91.6%; Rehabilitación: WAPE 11.0%, exactitud 89.0% | Buen desempeño global en servicios de alto volumen, no garantía por cada día | [Demanda](../docs/resultados/modelo_demanda.md) |
| Censo mediano: Hospitalización 283.0; Treatment urgency 201.0 | Presión de pacientes concurrentes (extracto depurado `p99.9`), no número de camas habilitadas | [Saturación](../docs/resultados/saturacion.md) |
| Little: 284.01 pacientes | Contraste del nivel global del censo (0.36% frente a mediana 283.0), no certificación de cada estancia | [Optimización](../docs/resultados/optimizacion.md) |
| Altas adelantadas 35%: horas rojas 9.32% → 6.26% | Reducción relativa 32.8% en simulación histórica; el pico permanece en 359 | [Optimización](../docs/resultados/optimizacion.md) |
| Urgencias → Hospitalización: 47.670 pasos, p90 mensual ponderado 24.45 h | Señal para auditar transiciones y marcas temporales; no prueba causal de boarding | [Optimización](../docs/resultados/optimizacion.md) |

### Cinco recomendaciones cuantificadas

| ID | Acción propuesta | Resultado observado o modelado | Condición para implementar |
|---|---|---|---|
| REC-01 | Planificar equipos equivalentes de Urgencias en 06–12 h | A demanda p90 39.67/h: 15 equipos frente a 12 del régimen normal; espera media modelada 6.09 min | Validar atención media de 20 min y dotación real; no significa contratar tres personas |
| REC-02 | Planificar equipos equivalentes de Rehabilitación en 06–12 h | A demanda p90 133.33/h: 70 equipos frente a 42 del régimen normal; espera media 5.30 min | Validar atención media de 30 min, agenda y capacidad simultánea |
| REC-03 | Revisar demoras evitables para reducir estancia de Hospitalización | Reducir 4 h libera teóricamente 13.97 camas medias, 4.92% del censo Little | Mantener criterios clínicos; comprobar factibilidad y resultados del piloto |
| REC-04 | Adelantar a 08–12 h el 35% de altas elegibles de 14–20 h | Horas rojas 9.32% → 6.26%; pico 359 → 359 | Coordinar alta médica, trámites y salida; evaluar con umbral fijo |
| REC-05 | Auditar Treatment urgency → Inpatient Visit | 47.670 pasos; p90 mensual ponderado 24.45 h; r mensual con censo = -0.48 | Revisar sellos temporales y causas de demora; no prometer una reducción causal |

Todos los impactos proceden de [REC-01 a REC-05](../docs/resultados/optimizacion.md#recomendaciones-cuantificadas). Son hipótesis operativas cuantificadas, no efectos clínicos demostrados.

## 2. Comprensión del problema y análisis del flujo hospitalario (15 %)

### Unidad de análisis y recorrido

La demanda se mide como llegadas diarias por `visit_concept_id`: **Emergency Room Visit (9203)**, **Ambulatory Rehabilitation Visit (581479)** y **Treatment urgency {Diagnosis} (3045729)**. Hospitalización tiene pocas visitas principales y se agrupa en «Otros» para evaluar demanda; esto no implica poca ocupación: **Inpatient Visit (9201)** sí es una etapa frecuente en `visit_detail`.

`visit_occurrence` tiene inicio y fin iguales y no sirve para estimar permanencia. Se reconstruyen etapas y transiciones con `visit_detail`, separando llegadas, duración, espera entre etapas y censo. Los conceptos OMOP describen registros administrativos y no se equiparan automáticamente a unidades físicas.

### Patrones temporales y presión

La exploración muestra afluencia matutina en Urgencias y actividad predominantemente diurna y laboral en Rehabilitación, con descensos en fines de semana, festivos, Carnaval y fin de año. Se diferencian estos patrones descriptivos de la contribución predictiva validada de cada factor.

![Patrones de llegadas por día y hora](figures/exploracion/01_llegadas_dia_hora.png)

![Evolución histórica de llegadas](figures/exploracion/02_tendencia.png)

Estas figuras son material exploratorio; las cifras finales proceden de las tablas de resultados enlazadas, no de estimaciones visuales.

El censo horario se reconstruye como entradas acumuladas menos salidas acumuladas por etapa. Se aplica calentamiento de 24 días, superior al p99 de duración, que reduce pero no elimina necesariamente efectos de estancias iniciadas antes de la ventana.

| Etapa | Censo mediano | p75 | p90 |
|---|---:|---:|---:|
| Inpatient Visit | 283.0 | 297.0 | 309.0 |
| Treatment urgency | 201.0 | 239.0 | 272.0 |
| Emergency Room Visit | 0.0 | 1.0 | 3.0 |

Fuente: [saturación](../docs/resultados/saturacion.md) (extracto horario con filtro `p99.9`). Verde corresponde a censo < p75; amarillo a p75 ≤ censo ≤ p90; rojo a censo > p90. Son umbrales históricos, no límites clínicos de seguridad.

La Ley de Little contrasta el censo de Hospitalización: **83.84 ingresos/día × 81.30 h / 24 ≈ 284.01 pacientes**, usando valores sin redondear de 83.8439 y 81.2971. Es consistente con la mediana observada de 283.0 (brecha de 0.36%), aunque promedio teórico y mediana no son el mismo estimador.

### Transición prioritaria

Treatment urgency → Inpatient Visit registra **47.670 pasos**, p50 mensual ponderado **0.0 h** y p90 mensual ponderado **24.45 h**. `espera_h` se define como `start_siguiente - end_anterior` en OMOP y admite solapamientos negativos. No equivale necesariamente al tiempo de asignación de cama ni al boarding clínico.

El p90 reportado es un promedio de percentiles mensuales ponderado por pasos, no el percentil exacto del conjunto. La correlación ecológica mensual con censo es **r = -0.48** (-0.481); los p90 ponderados en censo normal y alto son **25.13 h** y **23.70 h**, respectivamente. No hay evidencia aquí para atribuir la demora a congestión ni para prometer su reducción mediante altas tempranas.

## 3. Calidad, preparación e integración de los datos (15 %)

### Auditoría y limpieza

La [auditoría OMOP](../docs/calidad_datos.md) comprueba completitud, duplicados, secuencias temporales, edades y coherencia del calendario. El desfase estimado es **0 días**, sustentado principalmente en el cierre de Rehabilitación en festivos; Urgencias por sí sola no permite decidir por su operación continua.

| Regla | Aplicación y razón |
|---|---|
| Deduplicar visitas | Agrupar por `(person_id, visit_concept_id, visit_start_datetime)` antes de contar llegadas; 13.38% de copias sobrantes en `visit_occurrence` |
| Validar etapas | Excluir huérfanas y etapas sin fin o con fin anterior al inicio para análisis de tiempos y censo |
| Reclasificar edad imposible | Marcar como `invalida` edades < 0 o > 110 años; no asignarlas al grupo pediátrico |
| Trabajar con agregados | Exportar conteos horarios, duraciones y transiciones, no filas individuales |

La auditoría registra 0.43% de duplicados sobrantes en `visit_detail`; no debe confundirse con la tasa de `visit_occurrence`.

### Estancias extremas y depuración aplicada (`p99.9`)

La auditoría completa de `duracion_etapas_percentiles.parquet` (`23_duracion_etapas_percentiles.sql`) documenta los máximos crudos sin recorte (**28,070.3 h** en Treatment urgency, **20,730.3 h** en Emergency Room Visit y **11,213.6 h** en Inpatient Visit) junto con los umbrales `p99.9` por etapa (**1,176.3 h** en Inpatient Visit, **283.7 h** en Treatment urgency, **17.5 h** en Emergency Room Visit y **0.0 h** en Ambulatory Rehabilitation Visit).

Las consultas `14_etapas_entradas_por_hora.sql`, `15_etapas_salidas_por_hora.sql` y `23_duracion_etapas_percentiles.sql` ya fueron ejecutadas contra PostgreSQL aplicando este filtro `p99.9`, y se regeneraron `docs/resultados/saturacion.md`, `docs/resultados/optimizacion.md` y `models/modelos_web_bundle.joblib`. Al remover las estancias fantasma y colas administrativas extremas, Hospitalización pasó de `288 / 306 / 319` (máximo `378`) a **`283 / 297 / 309`** (máximo **`359`**), Treatment urgency pasó de `219 / 260 / 300` a **`201 / 239 / 272`**, y Urgencias quedó en **`0 / 1 / 3`**. La concordancia Little (`284.01`) frente a la mediana observada (`283.0`) se estrechó a 0.36%, sin reemplazar la validación frente a capacidad física instalada. La [nota metodológica de saturación](../docs/resultados/saturacion.md) documenta este recorte.

### Integración externa sin atribuciones espurias

El pipeline integra calendario colombiano, Carnaval/Semana Santa, clima de Open-Meteo, vacaciones, quincenas y epidemiología SIVIGILA. Su disponibilidad no implica aceptación automática.

El [protocolo](../docs/resultados/factores_externos.md) exige ablación en los mismos pliegues, control de estacionalidad, placebo desplazado temporalmente y estabilidad. El modelo final acepta **`festivos_y_puentes`** y **`carnaval_y_semana_santa`**; descarta `vacaciones_escolares` y `quincena_y_primas`. No se atribuye al clima o a epidemiología una mejora no demostrada en esta selección.

### Política anti-fuga

Se entrena únicamente con fechas anteriores al origen. Para el horizonte operativo se emplean rezagos de llegadas de al menos 7 días; los umbrales e imputaciones se calculan dentro del entrenamiento. SIVIGILA requiere rezagos de 2–3 semanas. No se utiliza clima observado futuro como si estuviera disponible operativamente; el modelo extendido usa clima típico calculado antes de cada corte, no meteorología futura medida.

## 4. Modelo analítico, predictivo y rigor metodológico (20 %)

### Comparación en un marco temporal común

La evaluación operativa usa **26 pliegues walk-forward**, con orígenes **2025-07-25 a 2026-07-10** y horizonte **1–7 días**. WAPE = Σ|error| / Σ|real|; se complementa con MAE, RMSE, sesgo y cobertura. «Exactitud» significa aquí **1 − WAPE**, no porcentaje de predicciones individuales correctas.

| Modelo | WAPE | MAE | Mejora relativa frente a la base |
|---|---:|---:|---:|
| Mediana de 8 semanas | 18.0% | 77.02 | Referencia |
| Poisson con calendario, estratificado por servicio | 15.6% | 66.86 | 13.2% |
| LightGBM con nivel local, todos los externos | 10.5% | 44.84 | 41.8% |
| **LightGBM con nivel local, grupos aceptados (`lgbm_final`)** | **10.5%** | **44.94** | **41.6%** |

Fuente: [corrida del 2026-11-18](../docs/resultados/modelo_demanda.md). Las mejoras se calculan antes del redondeo; dos WAPE iguales a una decimal no implican modelos idénticos. Se selecciona `lgbm_final` por parsimonia y evidencia de los grupos aceptados, no por ser el mínimo absoluto de la tabla.

Poisson se corrigió ajustando por servicio: un calendario compartido sin estratificación no representa adecuadamente los distintos niveles y cierres de Rehabilitación frente a Urgencias. El WAPE vigente es **15.6%**; **41.6%** identifica la mejora relativa final de LightGBM y no debe reutilizarse como WAPE actual de Poisson.

### Desempeño y límites por servicio

| Servicio | WAPE | Exactitud (1 − WAPE) | MAE |
|---|---:|---:|---:|
| Urgencias | 8.4% | 91.6% | 37.02 |
| Rehabilitación | 11.0% | 89.0% | 91.22 |
| Tratamiento Urgencias | 43.5% | 56.5% | 6.59 |

En Rehabilitación, la exactitud cae a **51.3%** el sábado y **15.6%** el domingo, con volúmenes medios de **87.1** y **2.2** llegadas en esos días del horizonte. El buen resultado agregado no oculta esas limitaciones.

Tratamiento Urgencias tiene **15.2 llegadas/día** en el resumen redondeado. El techo Poisson diario optimista es **79.5%** de exactitud frente a **56.5%** del modelo; al agregar semanas, el techo es **92.3%** y el modelo alcanza **77.0%**. El techo supone conocer la tasa verdadera: el modelo permanece por debajo, por lo que el bajo volumen no explica por sí solo todo el error. Se recomienda leer MAE y agregación semanal sin declarar cumplida la meta diaria.

### Intervalos y explicación

LightGBM por cuantiles entrega límites p10/p90 y mediana p50; se impone **0 ≤ p10 ≤ p50 ≤ p90**. SHAP descompone la predicción en aportes legibles (día de semana, rezagos y eventos), no en efectos causales.

El [reporte de intervalos del 2026-11-03](../docs/resultados/intervalos_shap.md) registra cobertura global **83.2%** para un objetivo nominal de **80.0%**, pero **85.2%** en Urgencias, **72.0%** en Rehabilitación y **75.8%** en Tratamiento Urgencias. La cobertura global incluye «Otros» y no certifica calibración por servicio. Es una corrida separada, anterior a la actualización puntual de demanda; no se presenta como recalibración nueva del 2026-11-18.

La [validación independiente](../docs/resultados/validacion_independiente.md) es evidencia histórica del protocolo y la revisión anti-fuga. Sus métricas y su conteo de pruebas corresponden a una versión previa; no sustituyen las cifras vigentes ni constituyen autorización clínica de la nueva versión.

### Planeación a cuatro meses

La base tiene último día completo **2026-07-16**. Para **agosto–noviembre de 2026** se utiliza un modelo separado sin rezagos cortos: calendario, `festivos_y_puentes`, tendencia ponderada por recencia y clima típico histórico anterior al corte.

El [backtest a 120 días](../docs/resultados/largo_plazo.md) usa **13 pliegues**, orígenes **2025-03-24 a 2026-03-19**, paso de **30 días**. Obtiene **15.7% WAPE**, **84.3% de exactitud global** y **86.5% de cobertura**. La exactitud desciende de **87.8%** en el primer mes a **78.7%** en el cuarto; no se extrapola el desempeño operativo de siete días.

Los límites publicados como intervalo operativo se construyen con cuantiles base p05/p95 y ensanchamiento **1 + 0.10 × (mes − 1)**, no con p10/p90 puros sin ajuste. El reporte fuente contiene el pronóstico mensual por servicio; es una proyección desde el cierre de la base, no demanda observada ni una actualización con datos de noviembre.

## 5. Optimización y propuestas de mejora operacional (20 % — Criterio de desempate #1)

### 5.1 Erlang C: requerimientos por franja, no dotación inventada

La demanda por franja se obtiene de llegadas observadas por día, divididas entre seis horas y con grilla que incluye ceros. Se dimensiona el mínimo de servidores equivalentes que cumple espera media < **15 min** y **P(espera ≤ 15 min) ≥ 0.80**, bajo demanda normal, p75 y p90.

M/M/c supone llegadas Poisson, atención exponencial, cola única, tasas estacionarias y ausencia de abandono. Los tiempos medios de atención son **supuestos paramétricos**, no duraciones clínicas observadas. Un servidor representa un equipo activo equivalente, no una enfermera ni una plaza contractual.

| Servicio y atención base | Franja | λ normal/h | λ p90/h | c normal | c p75 | c p90 | Espera media con demanda p90 (min) |
|---|---|---:|---:|---:|---:|---:|---:|
| Urgencias · 20 min | 06–12 h | 29.250 | 39.667 | 12 | 14 | 15 | 6.094 |
| Urgencias · 20 min | 12–18 h | 25.593 | 34.333 | 10 | 12 | 13 | 7.265 |
| Urgencias · 20 min | 18–24 h | 15.392 | 20.367 | 7 | 8 | 9 | 3.062 |
| Urgencias · 20 min | 00–06 h | 5.236 | 7.500 | 3 | 4 | 4 | 4.265 |
| Rehabilitación · 30 min | 06–12 h | 77.584 | 133.333 | 42 | 62 | 70 | 5.303 |
| Rehabilitación · 30 min | 12–18 h | 58.174 | 108.000 | 32 | 51 | 57 | 5.905 |
| Rehabilitación · 30 min | 18–24 h | 1.442 | 3.333 | 2 | 3 | 3 | 6.745 |
| Rehabilitación · 30 min | 00–06 h | 0.255 | 0.667 | 1 | 1 | 2 | 0.857 |
| Tratamiento Urgencias · 20 min | 06–12 h | 0.415 | 1.000 | 1 | 1 | 2 | 0.571 |
| Tratamiento Urgencias · 20 min | 12–18 h | 0.682 | 1.333 | 1 | 2 | 2 | 1.039 |
| Tratamiento Urgencias · 20 min | 18–24 h | 0.819 | 1.667 | 1 | 2 | 2 | 1.672 |
| Tratamiento Urgencias · 20 min | 00–06 h | 0.338 | 1.000 | 1 | 1 | 2 | 0.571 |

La columna de espera es una **media bajo la tasa de demanda p90**, no el percentil 90 del tiempo de espera. Fuente de ambas tablas: [Erlang C](../docs/resultados/optimizacion.md#erlang-c).

| Servicio · franja pico | Atención (min) | c normal | c p75 | c p90 | Diferencia p90 − normal |
|---|---:|---:|---:|---:|---:|
| Urgencias · 06–12 h | 15 | 9 | 10 | 12 | 3 |
| Urgencias · 06–12 h | 20 | 12 | 14 | 15 | 3 |
| Urgencias · 06–12 h | 30 | 17 | 20 | 22 | 5 |
| Rehabilitación · 06–12 h | 15 | 21 | 31 | 35 | 14 |
| Rehabilitación · 06–12 h | 20 | 28 | 42 | 47 | 19 |
| Rehabilitación · 06–12 h | 30 | 42 | 62 | 70 | 28 |
| Tratamiento Urgencias · 18–24 h | 15 | 1 | 1 | 2 | 1 |
| Tratamiento Urgencias · 18–24 h | 20 | 1 | 2 | 2 | 1 |
| Tratamiento Urgencias · 18–24 h | 30 | 2 | 2 | 2 | 0 |

La sensibilidad demuestra por qué medir tiempos de atención y disponibilidad real precede a cualquier asignación. Las diferencias son entre regímenes de demanda modelados, no frente a una plantilla observada.

### 5.2 Ley de Little: reducir permanencia de forma segura

**L = λ · W**, con λ en ingresos/día y W en días. Para Hospitalización se usan ingresos cerrados consistentes con el censo depurado (`p99.9`) y estancia media ponderada por etapas: λ = **83.8439/día**, W = **81.2971 h**, L = **284.0111 pacientes**. La mediana de estancia **45.9611 h** no se usa como sustituto de la media en la identidad.

| Reducción de estancia | Nueva media (h) | Camas medias liberadas teóricas | Reducción del censo Little |
|---|---:|---:|---:|
| −2 h | 79.297 | 6.987 | 2.460% |
| −4 h | 77.297 | 13.974 | 4.920% |
| −6 h | 75.297 | 20.961 | 7.380% |
| −8 h | 73.297 | 27.948 | 9.840% |

Fuente: [Ley de Little](../docs/resultados/optimizacion.md#ley-de-little-y-altas-matutinas). «Camas liberadas» expresa menor ocupación media equivalente a tasa fija, no ampliación física ni reducción clínicamente garantizada.

### 5.3 Simulación horaria de rondas de alta temprana

Se reconstruye el censo con `etapas_entradas_por_hora.parquet` y `etapas_salidas_por_hora.parquet` (ya filtrados por `p99.9`). Se traslada una fracción de altas de **[14:00, 20:00)** a **[08:00, 12:00)** del mismo día, distribuida uniformemente, manteniendo ingresos y umbral rojo **309** fijos. Son altas fraccionales agregadas, no una agenda individual ni una selección clínica de pacientes.

| Altas adelantadas | Horas rojas base | Horas rojas simuladas | Reducción relativa | Pico base → simulado |
|---|---:|---:|---:|---:|
| 20% | 9.320% | 7.119% | 23.618% | 359 → 359 |
| 35% | 9.320% | 6.259% | 32.841% | 359 → 359 |
| 50% | 9.320% | 5.902% | 36.677% | 359 → 359 |

Así, a dos decimales, el escenario de **35%** pasa de **9.32% a 6.26%** de horas rojas (**32.8%** menos en términos relativos); el de **50%** llega a **5.90%** (**36.7%** menos). Los porcentajes relativos se calculan con valores sin redondear. El pico no baja: el beneficio modelado está en la duración de la presión, no en su máximo absoluto.

### 5.4 Cuello de botella y priorización

La prioridad empírica es revisar las **47.670 transiciones** y el **p90 mensual ponderado de 24.45 h**, validando semántica de sellos temporales y registro administrativo. La correlación **r = -0.48** (-0.481) no respalda una explicación causal simple de saturación de piso. La simulación de altas no estima directamente cuánto se reduciría esa espera.

Se propone ejecutar REC-01 y REC-02 en planificación de turnos, REC-03 en un piloto de revisión de demoras evitables, REC-04 en un piloto intradía de egreso seguro y REC-05 en seguimiento mensual. La tabla ejecutiva conserva la trazabilidad individual de las cinco recomendaciones y sus condiciones.

## 6. Integración de la solución, visualización y aplicación web (15 %)

### Arquitectura y recorrido del usuario

El paquete modular `src/hun/` produce modelos y agregados; **FastAPI** expone contratos HTTP y **React/Vite** presenta resultados interactivos. La API y la interfaz están desacopladas; el frontend usa proxy local y `VITE_API_URL` en despliegue.

| Vista o capacidad | Función asistencial | Contrato |
|---|---|---|
| Pronóstico con intervalo y SHAP | Anticipar demanda y explicar sus factores | `/api/predecir`, `/api/predecir-rango` |
| Real frente a predicho | Examinar errores fuera de muestra | `/api/comparacion/{servicio}` |
| Mapa de turnos y radar de presión | Comparar franjas y servicios sin mezclar unidades | `/api/turnos/{servicio}`, `/api/ocupacion` |
| Cuellos de botella | Distinguir duración en horas de censo en pacientes | `/api/cuellos-botella` |
| Planeación extendida | Consultar agosto–noviembre de 2026 | `/api/largo-plazo/{servicio}` |
| Panel de optimización y simuladores | Explorar atención, estancia y altas tempranas | `GET /api/optimizacion`, `POST /api/optimizacion/simular` |
| Chatbot contextual | Explicar resultados y recomendaciones de la pantalla | `POST /api/chat` |

El chatbot dispone de **seis herramientas de solo lectura**: predicción puntual, rango, simulación de demanda, efectos históricos de eventos, indicadores de cuellos de botella y recomendaciones de optimización. No tiene acceso SQL ni consulta registros de pacientes. Si el proveedor de IA no está disponible, ofrece respaldo determinista offline con resultados agregados. No reemplaza criterio médico.

### Producción sin datos crudos

Se despliega `models/modelos_web_bundle.joblib` con **`HUN_MODO_PRODUCCION=1`** y ruta explícita mediante `HUN_BUNDLE_PATH`. El modo estricto no lee `data/` ni admite respaldo sintético; si falta el artefacto, se informa indisponibilidad. El bundle contiene modelos y salidas agregadas, no constituye un archivo «sin información»: debe tratarse como artefacto autorizado.

**`ALLOWED_ORIGINS`** configura CORS con los orígenes web permitidos separados por comas. Los valores locales por defecto sirven para desarrollo; en producción se debe declarar el origen real. Configurar CORS no equivale a autenticación ni demuestra que ya exista un despliegue público.

Power BI complementa la aplicación para exploración y comunicación de agregados; no se ha modificado en este trabajo ni se sustituye el enlace de dashboard requerido por el reto. El enlace público y los accesos de demo deben verificarse antes de la entrega.

## 7. Ingeniería de software, reproducibilidad, privacidad y documentación (5 %)

### Organización y controles

`src/hun/data/` concentra extracción y auditoría; `features/`, variables y rezagos; `models/`, validación, demanda, saturación, intervalos, largo plazo, empaquetado y optimización. `app/api/` adapta las salidas a HTTP y `app/src/` contiene la interfaz. Los notebooks exploran y comunican; no duplican la lógica compartida.

La suite actual cuenta con **156 pruebas automatizadas con `pytest`**. Los hooks `pre-commit` y `ruff` controlan calidad, formato y protección de archivos; los notebooks se mantienen sin salidas que revelen información clínica. La entrega documental no cambia lógica ni dependencias.

La privacidad se protege con conexión de solo lectura, agregación en origen y exclusión de datos crudos, credenciales y archivos hospitalarios de Git. No se publican PHI/PII ni identificadores individuales en este informe o la aplicación. La anonimización OMOP no sustituye la revisión de riesgo de reidentificación por celdas pequeñas antes de publicar agregados o Power BI.

### Comandos de reproducción

Los siguientes comandos se ejecutan desde la raíz, con entorno y dependencias ya instalados según el [README](../README.md). Se documentan para reproducción; no implican que cada módulo se haya reejecutado durante la consolidación editorial.

```bash
# Verificación automatizada
.venv/bin/pytest -q

# Regenerar reportes y artefactos en un entorno autorizado con agregados locales
.venv/bin/python -m hun.models.demanda
.venv/bin/python -m hun.models.saturacion
.venv/bin/python -m hun.models.explicacion
.venv/bin/python -m hun.models.largo_plazo
.venv/bin/python -m hun.models.optimizacion
.venv/bin/python -m hun.models.empaquetar

# Servir el bundle autorizado sin carpetas de datos
HUN_MODO_PRODUCCION=1 \
HUN_BUNDLE_PATH=models/modelos_web_bundle.joblib \
ALLOWED_ORIGINS=https://mediflow.example.org \
.venv/bin/uvicorn app.api:app --host 0.0.0.0 --port 8000

# Construir la interfaz con dependencias previamente instaladas
npm --prefix app run build
```

El dominio `mediflow.example.org` es ilustrativo: debe reemplazarse por el origen autorizado. Configurar `VITE_API_URL` antes de construir cuando frontend y API estén en orígenes distintos. Regenerar los módulos requiere agregados privados; ejecutar la demo estricta requiere únicamente el bundle autorizado. La reextracción SQL exige VPN y permisos de lectura y no se sustituye fabricando datos.

### Trazabilidad de evidencias

| Evidencia | Corte y uso |
|---|---|
| [Demanda](../docs/resultados/modelo_demanda.md) y [factores externos](../docs/resultados/factores_externos.md) | Corrida del 2026-11-18; fuente vigente para selección y WAPE puntual |
| [Saturación](../docs/resultados/saturacion.md) | Corrida del 2026-11-18 sobre el extracto depurado con tope `p99.9` en SQL `14/15/23` |
| [Optimización](../docs/resultados/optimizacion.md) | Fuente de todas las tablas Erlang C, Little, altas y recomendaciones |
| [Intervalos/SHAP](../docs/resultados/intervalos_shap.md) y [largo plazo](../docs/resultados/largo_plazo.md) | Reportes separados del 2026-11-03; no se atribuyen a una nueva corrida puntual |
| [Calidad](../docs/calidad_datos.md), [decisiones](../docs/decisiones.md) y [contrato](../docs/contrato_modelo_web.md) | Fundamento del pipeline; las entradas históricas no sustituyen los endpoints y métricas vigentes aquí descritos |

## 8. Conclusiones, limitaciones honestas y hoja de ruta de implementación en el HUN (10 %)

### Conclusiones accionables

MediFlow conecta pronóstico, incertidumbre y escenarios operativos sin inventar dotaciones. El modelo seleccionado reduce el WAPE diario de **18.0% a 10.5%** y permite planificar servicios de alto volumen. El contraste Little (**284.01**) respalda el censo hospitalario depurado con mediana **283.0** (brecha de 0.36%), corrigiendo interpretaciones exploratorias menores.

El piloto más directamente cuantificado es adelantar altas elegibles: el escenario **35%** reduce horas rojas de **9.32% a 6.26%** (−32.8% relativo), pero no el pico (**359**). Esta separación entre intensidad máxima y tiempo en presión orienta una evaluación más honesta del beneficio.

### Limitaciones que condicionan el uso

- **Sin dotación ni capacidad instalada en OMOP:** Erlang C determina requerimientos equivalentes bajo supuestos, no contrataciones ni ocupación sobre camas habilitadas.
- **Recorte estadístico de extremos (`p99.9`):** el extracto horario vigente excluye estancias superiores al percentil `p99.9` por etapa (`14/15_etapas_*.sql`), lo que limpia artefactos administrativos pero constituye un umbral estadístico agregado, no una auditoría clínica caso a caso de estancias prolongadas reales.
- **Semántica de `espera_h`:** diferencia entre marcas de etapas, con posibles solapamientos; p90 mensual ponderado y correlación ecológica no prueban boarding clínico ni causalidad.
- **Desempeño heterogéneo:** Tratamiento Urgencias y fines de semana de Rehabilitación no cumplen la meta diaria. Las coberturas de intervalos tampoco son uniformes por servicio.
- **Horizonte y versión:** el pronóstico extendido parte del cierre de julio y pierde exactitud con el horizonte. Intervalos y auditoría independiente tienen cortes anteriores; deben revalidarse con la versión a desplegar.
- **Simulación agregada:** tasas fijas y reparto uniforme de altas no representan restricciones clínicas individuales, abandono, tiempos no exponenciales ni variabilidad completa intraturno. No se suman automáticamente los efectos Little y altas como beneficios independientes.
- **Entrega pública:** deben comprobarse enlaces, autorización del bundle, celdas pequeñas, CORS y acceso a la demo; no se declara un despliegue o aprobación clínica no verificados.

### Hoja de ruta

| Horizonte | Acción | Responsable funcional propuesto | Evidencia de aceptación |
|---|---|---|---|
| Corto plazo | Validar los umbrales depurados (`p99.9`) contra camas censales habilitadas | Datos y gestión de camas HUN | Contraste de p75/p90 de ocupación y estancias largas reales frente a capacidad física instalada |
| Corto plazo | Auditar REC-05 y medir atención y dotación para REC-01/02 | Coordinación de Urgencias, Hospitalización y Rehabilitación | Semántica validada de transiciones y contraste de equipos requeridos con disponibles |
| Mediano plazo | Pilotar REC-04 y revisar demoras evitables de REC-03 | Gestión de camas, equipos clínicos y egreso | Horas rojas con umbral fijo, estancia, seguridad de altas y demoras; sin atribución causal automática |
| Mediano plazo | Recalibrar intervalos y validar prospectivamente la versión completa | Analítica y validación independiente | WAPE, MAE, sesgo y cobertura por servicio, día y horizonte |
| Largo plazo | Integrar actualización periódica, monitoreo y gobernanza | Sistemas, calidad y dirección asistencial | Trazabilidad de versiones, revisión de deriva, privacidad y accesos; aprobación institucional antes del uso clínico |

**Decisión recomendada:** iniciar pilotos supervisados y medibles, no automatizar asignación de recursos ni altas clínicas. El valor del sistema es hacer explícitos datos, supuestos e incertidumbre para que el HUN decida con evidencia.
