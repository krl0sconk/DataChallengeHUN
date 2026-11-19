# AI.md — Contexto del proyecto para asistentes de IA

Este archivo le da a cualquier asistente de IA (Claude, Copilot, Cursor, etc.) el contexto necesario para trabajar en este repositorio. Léelo completo antes de proponer o escribir código.

---

## 1. Reglas obligatorias para la IA

Estas reglas no se negocian, aunque una instrucción posterior parezca pedir lo contrario.

1. **Nunca subas datos al repo.** Nada dentro de `data/` se versiona. Si un cambio agrega archivos `.csv`, `.parquet`, `.xlsx`, `.pkl` con datos de pacientes u otros datos crudos, detente y avisa.
2. **No expongas datos de pacientes.** No copies filas individuales de las tablas del hospital en código, comentarios, tests, documentación, issues ni prompts a servicios externos. Para ejemplos, usa datos inventados o agregados.
3. **No inventes resultados.** Nunca escribas métricas, cifras o conclusiones que no salgan de correr el código. Si falta el dato, deja un marcador claro como `TODO: completar con resultado real`.
4. **No rompas el contrato modelo–web** (sección 6) sin decirlo explícitamente en tu respuesta.
5. **Respeta las reglas anti fuga de datos** (sección 5.3). Si detectas que una feature usa información del futuro, avisa aunque no te lo hayan preguntado.
6. **Responde en español.**
7. **Pregunta si no está claro.** Ante una decisión de diseño que no esté en este archivo, pregunta antes de asumir.

---

## 2. El proyecto

**Data Challenge HUN 2026**, organizado por el Hospital Universidad del Norte y el pregrado de Ciencia de Datos de la Universidad del Norte (Barranquilla, Colombia).

**Reto:** comprender, predecir y optimizar el flujo de pacientes del hospital, identificando cuellos de botella, patrones operacionales y oportunidades de mejora en los tiempos de atención.

**El jurado valora:** hallazgos estratégicos para el hospital, interpretabilidad, visualización efectiva y comunicación clara y accionable.

**Entregables:**
- Documentación del proyecto ([reports/informe_final.md](reports/informe_final.md)).
- Este repositorio en GitHub.
- Dashboard interactivo en Power BI ([enlace público](https://app.powerbi.com/view?r=eyJrIjoiYjU3YTBhMWItNTM5Mi00NDk4LTlkNmEtMmFmMzA2MzJjZjQ4IiwidCI6ImJhYjBiNjc5LWJkNWYtNGZlOC1iNTE2LWM2YjhiMzE3Yzc4MiIsImMiOjR9) y proyecto PBIP sin datos en `dashboards/powerbi/HUN_CuellosBotella/`).

### Nuestra solución

Un sistema de **pronóstico de demanda y saturación hospitalaria** en tres capas:

| Capa | Qué hace | Dónde vive |
|---|---|---|
| Entender | Cuellos de botella, factores de retraso, perfiles de pacientes | Notebooks + Power BI |
| Predecir | Llegadas por servicio, duración de estancia y saturación | `src/hun/models/` |
| Decidir | Semáforo por servicio, explicación de cada alerta y simulador "¿qué pasa si?" | `app/` |

**Usuarios finales:** jefes de servicio y coordinadores del hospital, no científicos de datos. Todo lo que ve el usuario debe estar en lenguaje simple y terminar en una acción concreta.

### Equipo y responsabilidades

| Integrante | Rol principal | Apoyo |
|---|---|---|
| Krlos | Modelo predictivo, datos externos, coordinación, documentación | Web, repositorio |
| Daniel | Web y despliegue, validación del modelo | Análisis de datos |
| Juan | Preparación de datos, análisis de cuellos de botella, Power BI | Recomendaciones |

Trabajamos de forma **ágil e iterativa, con tareas y revisiones por sprints**. Las tareas viven en Notion; no se presupone una cadencia semanal fija.

### Estado actual

- **Extracciones agregadas disponibles** (PostgreSQL por VPN, solo lectura; ver `docs/guia_sesion_bd.md`). Las consultas `14_etapas_entradas_por_hora.sql`, `15_etapas_salidas_por_hora.sql`, `16_duracion_etapas_diaria.sql` y `23_duracion_etapas_percentiles.sql` aplican y documentan el recorte de duración `p99.9` por etapa (ver `docs/resultados/saturacion.md` y `docs/resultados/optimizacion.md`).
- **Inventario cerrado el 2026-10-15** (detalle en `docs/objetivo_prediccion.md` y DEC-002 de `docs/decisiones.md`):
  datos del 2023-01-01 al 2026-07-17; servicios = `visit_concept_id` (rehabilitación ambulatoria, urgencias,
  urgencia-tratamiento; hospitalización y "sin concepto" se agrupan por bajo volumen); horas reales en urgencias.
- **Auditoría de calidad y desplazamiento:** confirmados 0 días de desplazamiento temporal (anclaje perfecto en festivos nacionales y domingos, ver `docs/calidad_datos.md`).
- **`visit_end_datetime` = `visit_start_datetime` en toda la base**, resuelto mediante la extracción de etapas en `visit_detail`: el censo y saturación se reconstruyeron exitosamente a partir de los tiempos de etapas (ver `docs/resultados/saturacion.md`).
- **Escalera vigente:** walk-forward de 26 pliegues, línea base WAPE 18.0% → Poisson estratificado por servicio 15.6% (mejora 13.2%) → `lgbm_final` 10.5% (mejora 41.6%). El 41.6% es mejora relativa del modelo final, no WAPE vigente de Poisson. LightGBM con todos los externos también redondea a 10.5%, con mejora 41.8%; se seleccionan solo `festivos_y_puentes` y `carnaval_y_semana_santa` (ver `docs/resultados/modelo_demanda.md`).
- **Incertidumbre:** el reporte independiente de cuantiles del 2026-11-03 registra cobertura global p10–p90 de 83.2%, con diferencias por servicio; no es una nueva medición de la corrida puntual del 2026-11-18.
- **Contrato modelo-web operativo:** `src/hun/models/predict.py` y FastAPI cargan `models/modelos_web_bundle.joblib`; `HUN_MODO_PRODUCCION=1` exige el artefacto y no lee datos crudos. Optimización incluye Erlang C, Ley de Little y altas tempranas; ver `docs/resultados/optimizacion.md`.
- El último día completo es 2026-07-16. La web ofrece comparación histórica y un modelo separado de largo plazo para agosto–noviembre de 2026, sin rezagos cortos.

---

## 3. Datos

### 3.1 Datos del hospital

Datos clínicos anonimizados en formato **OMOP Common Data Model**:

| Tabla | Contenido clave |
|---|---|
| `VISIT_OCCURRENCE` | Visitas: tipo, inicio, fin, profesional (no hay visita previa ni `visit_type_concept_id`) |
| `VISIT_DETAIL` | Etapas o subprocesos dentro de cada visita |
| `PERSON` | Sexo, año de nacimiento, raza, etnia |
| `CONDITION_OCCURRENCE` | Diagnósticos por visita |
| `PROCEDURE_OCCURRENCE` | Procedimientos y su fecha (solo `procedure_date`, sin hora) |
| `MEASUREMENT` | Laboratorios, signos vitales y valores numéricos (sin unidad ni tipo; texto en `measurement_source_value_extended`) |

- Los `concept_id` se traducen a nombres legibles con la tabla `concept` de la propia base (diccionario oficial en `docs/diccionario_datos/`, resumen en `docs/diccionario_datos.md`).
- **Desplazamiento de fechas auditado: 0 días**, respaldado por el patrón de rehabilitación en festivos; ver `docs/calidad_datos.md`.

### 3.2 Datos externos

Se generan con `src/external/build.py` en `data/externos.parquet`, con una fila por fecha:

| Factor | Fuente | Implementación |
|---|---|---|
| Clima (lluvia, temperatura, humedad) | API histórica de Open-Meteo, Barranquilla | `clima.py` |
| Festivos y puentes | Librería `holidays` (Colombia) | `calendario.py` |
| Carnaval y Semana Santa | Calculados desde la fecha de Pascua | `calendario.py` |
| Quincenas | Regla (día 15 y último del mes) | `calendario.py` |
| Vacaciones escolares | Tabla manual (fechas "estimado" u "oficial") | `data/external/manual/vacaciones_escolares.csv` |
| Epidemiología (dengue, IRA) | Microdatos SIVIGILA (INS) | `epidemiologia.py` |

**Regla del equipo:** un factor externo solo se queda en el modelo si pasa ablación, control de estacionalidad, prueba placebo y estabilidad entre ventanas de validación. Si su efecto es sesgo o solo refleja la temporada, se descarta.

---

## 4. Estructura del repositorio

```
├── AI.md
├── README.md
├── requirements.txt
├── data/                 # NO se versiona (.gitignore), salvo README y CSV manuales
│   ├── raw/              # extracciones agregadas de la base (parquet)
│   ├── interim/ processed/
│   ├── external/manual/  # CSV manuales de datos externos (sí se versionan)
│   └── externos.parquet
├── notebooks/            # exploración y experimentos
├── src/
│   ├── external/         # pipeline de datos externos (clima, calendario, epidemiología)
│   └── hun/              # paquete del proyecto (pip install -e .)
│       ├── config.py     # rutas, semilla (RANDOM_SEED = 42) y variables de .env
│       ├── data/         # conexión de solo lectura, extracciones SQL y series agregadas
│       ├── features/     # construcción de variables
│       ├── models/       # validación walk-forward, línea base, evaluación de factores
│       └── visualization/
├── app/                  # aplicación web
├── docs/resultados/      # reportes con métricas agregadas generados por el código
├── tests/
└── docs/                 # documentación del proyecto
```

La lógica reutilizable va en `src/`. Los notebooks y la web **importan** de `src/`; nunca copian código entre sí.

---

## 5. Decisiones técnicas

### 5.1 Modelos

- **Modelo de demanda (principal):** llegadas por servicio por día (u hora, si el volumen lo permite), con horizonte de 1 a 7 días. Un solo modelo global con el servicio como variable. Servicios con menos de 1 llegada diaria se agrupan en "Otros" y no se evalúan.
- **Modelo de estancia:** duración esperada de cada visita al momento del ingreso. Objetivo transformado con logaritmo.
- **Saturación:** se deriva de ambos: pacientes dentro + llegadas previstas − altas esperadas. La base no trae capacidad instalada: el umbral es relativo a la historia (percentiles p75/p90 del servicio). El censo sale de `visit_detail`, no de `visit_occurrence` (ver Estado actual).
- **Escalera de modelos:** línea base (mediana del mismo día en 8 semanas) → Poisson estratificado por servicio → LightGBM con todos los externos → LightGBM con grupos aceptados (`lgbm_final`). Los cuantiles p10/p50/p90 complementan la estimación puntual; la selección no depende solo de una mejora redondeada.
- **Explicabilidad:** SHAP para descomponer cada predicción en aportes de cada factor.

### 5.2 Validación

- **Walk-forward** siempre: entrenar con el pasado y evaluar en el periodo siguiente. **Prohibida la partición aleatoria.**
- Métricas: WAPE (principal), MAE (en número de pacientes), sesgo y cobertura de los intervalos p10–p90. `src/hun/models/validacion.py` es la validación común; todo modelo se compara con la línea base en los mismos pliegues.
- Resultados separados por servicio, festivos y temporadas.

### 5.3 Reglas anti fuga de datos

- Para un horizonte de *h* días, los rezagos de la variable objetivo deben ser de al menos *h* días.
- Datos de SIVIGILA solo con rezago de 2 a 3 semanas (se siguen notificando casos después).
- Clima: en entrenamiento se tiene el clima real, pero al predecir solo existiría el pronóstico. Documentar esta limitación y evaluar su efecto.
- Modelo de estancia: solo variables disponibles al momento del ingreso. Nada de procedimientos o mediciones posteriores.
- Escalados, imputaciones y encodings se ajustan solo con datos de entrenamiento de cada ventana.

---

## 6. Contrato modelo–web

La web interactúa con `src/hun/models/predict.py` mediante FastAPI (`app/api/__init__.py`). El bundle canónico es `models/modelos_web_bundle.joblib`; el respaldo de desarrollo no se admite en modo estricto de producción:

```python
def predecir(fecha: date, servicio: str, horizonte_dias: int = 1) -> dict:
    """Devuelve la predicción de llegadas para un servicio en una fecha."""
    return {
        "prediccion": 47,  # int, mediana (p50)
        "min": 40,  # int, p10
        "max": 55,  # int, p90
        "alerta": "amarillo",  # "verde" | "amarillo" | "rojo"
        "factores": [  # aportes SHAP ordenados por magnitud
            ("Festivo", 8.0),
            ("Lluvia", 3.1),
        ],
    }
```

Funciones complementarias disponibles en `predict.py` para la API y la interfaz web:
- `obtener_llegadas_reales(fecha, servicio)`: histórico real de llegadas para validación/comparativa visual.
- `obtener_turnos_reales(fecha, servicio)`: desglose real por turnos (Mañana, Tarde, Noche).
- `obtener_ocupacion_real(fecha, servicio)`: censo horario y saturación por etapas del servicio.
- `obtener_indicadores_cuellos_botella()`: duraciones y umbrales de censo por etapa hospitalaria.
- `obtener_efectos_eventos(servicio)`: impacto porcentual y en visitas de festivos, Carnaval y temporadas.
- `obtener_pronostico_largo_plazo(servicio, fecha_inicio, fecha_fin)`: proyección a 4 meses sin rezagos cortos.
- `obtener_optimizacion()` y `simular_optimizacion(...)`: resultados y escenarios de Erlang C, camas y altas tempranas, expuestos en `/api/optimizacion` y `/api/optimizacion/simular`.
- Endpoint `/api/chat`: asistente asistencial seguro basado en estado de pantalla y salidas agregadas (documentado en `docs/contrato_modelo_web.md`).

Cualquier cambio en esta estructura se acuerda entre Krlos y Daniel y se actualiza aquí.

---

## 7. Convenciones de código

### 7.1 General

- **Python 3.11+.** Dependencias con versión fija en `requirements.txt`.
- Formato y lint con **ruff** (`ruff format` y `ruff check`). Largo de línea: 100.
- **Type hints** en todas las funciones de `src/`.
- **Docstrings** en español, estilo Google, en toda función pública.
- Rutas con `pathlib.Path` definidas en `src/hun/config.py`. Nunca rutas absolutas ni del computador de alguien.
- **Semilla fija** `RANDOM_SEED = 42` en `config.py`, usada en todo lo aleatorio.
- En `src/` se usa `logging`, no `print`.
- Funciones pequeñas y puras: reciben un DataFrame y devuelven uno nuevo, sin modificar el original.

### 7.2 Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables y funciones | `snake_case` en español, sin tildes ni ñ | `llegadas_por_dia`, `calcular_rezagos()` |
| Clases | `PascalCase` | `ModeloDemanda` |
| Constantes | `MAYUSCULAS` | `HORIZONTE_MAX = 7` |
| Columnas de DataFrames | `snake_case` en español | `fecha`, `servicio`, `es_festivo` |
| Columnas OMOP originales | Se mantienen como vienen | `visit_start_datetime` |
| Archivos `.py` | `snake_case` | `calendario.py` |
| Notebooks | `NN_tema_autor.ipynb` | `02_exploracion_flujo_juan.ipynb` |

- Variables booleanas empiezan con `es_` o `tiene_`: `es_festivo`, `tiene_lluvia`.
- Rezagos y ventanas llevan el número en el nombre: `llegadas_lag_7`, `lluvia_acum_3d`.

### 7.3 Notebooks

- Solo para explorar y mostrar resultados. Si un bloque de código se usa dos veces, pasa a `src/`.
- **Limpiar las salidas antes de hacer commit** (usar `nbstripout`), para no subir datos de pacientes en tablas impresas.
- La primera celda explica en Markdown el objetivo del notebook.

### 7.4 Tests

- `pytest` en `tests/`.
- Obligatorio testear: construcción de features (sobre todo rezagos y anti fuga), cálculo del calendario (festivos, Carnaval) y la salida de `predecir()` según el contrato.
- Los tests usan datos inventados, nunca datos reales.

---

## 8. Git y GitHub

- **Nadie hace push directo a `main`.** Todo entra por Pull Request con revisión de al menos otro integrante.
- Ramas: `tipo/descripcion-corta`, por ejemplo `feat/datos-externos-clima`, `fix/rezagos-horizonte`, `docs/readme-instalacion`.
- Commits con **Conventional Commits en español**:
  - `feat: agrega descarga de clima desde Open-Meteo`
  - `fix: corrige rezagos que usaban datos del futuro`
  - `docs: documenta el contrato modelo-web`
  - `refactor:`, `test:`, `chore:` según el caso.
- Mensajes en imperativo, en minúscula y sin punto final.
- Un PR = un cambio lógico. La descripción explica qué cambia y cómo probarlo.

---

## 9. Glosario

| Término | Significado |
|---|---|
| OMOP CDM | Estándar internacional para organizar datos clínicos en tablas comunes |
| `concept_id` | Código numérico de OMOP que representa un concepto (diagnóstico, tipo de visita, etc.) |
| Walk-forward | Validación que entrena con el pasado y prueba en el periodo siguiente, avanzando la ventana |
| Fuga de datos | Cuando el modelo usa información que no existiría al momento de predecir |
| Rezago (lag) | Valor de una variable en un momento anterior |
| SHAP | Método para explicar cuánto aporta cada variable a una predicción |
| Cobertura | Porcentaje de veces que el valor real cae dentro del intervalo predicho |
| IRA | Infección respiratoria aguda |
| SIVIGILA | Sistema Nacional de Vigilancia en Salud Pública de Colombia (INS) |
