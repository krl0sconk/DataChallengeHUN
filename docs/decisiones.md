# Bitácora de decisiones técnicas

Registra aquí cada decisión relevante del proyecto. La entrada más reciente va arriba.
Si una decisión reemplaza a otra, no borres la anterior: márcala como **Reemplazada por DEC-XXX**.

## Plantilla

```markdown
### DEC-XXX · <título corto>

- **Fecha:** AAAA-MM-DD
- **Sprint:** N
- **Responsable:** <nombre>
- **Estado:** Propuesta | Aceptada | Reemplazada por DEC-YYY
- **Decisión:** qué se decidió.
- **Motivo:** por qué; qué problema resuelve.
- **Alternativas consideradas:** opciones descartadas y por qué.
- **Consecuencias:** qué implica para el resto del proyecto.
```

---

### DEC-009 · Asistente conversacional `/api/chat` con herramientas del modelo y respaldo determinista

- **Fecha:** 2026-11-03
- **Sprint:** 3
- **Responsable:** Krlos
- **Estado:** Aceptada (implementada en `app/api/chat.py` y `docs/guia_chatbot.md`)
- **Decisión:** Implementar el endpoint `POST /api/chat` conectado a Claude Haiku (`claude-haiku-5-5`, clave `ANTHROPIC_API_KEY` exclusivamente en `.env`), inyectando como prompt de sistema la guía y glosario (`docs/guia_chatbot.md`) junto con el estado actual de la pantalla enviado por la web (`servicio`, `fecha`, `prediccion`, `intervalo`, `alerta`, `factores`). El asistente dispone de seis herramientas de solo lectura de la API: `predecir`, `predecir_rango`, `simular_escenario`, `efecto_promedio_evento`, `indicadores_cuellos_botella` y `recomendaciones_optimizacion`. Mantiene un límite de 150 palabras, timeout de 12 s, rate-limit por minuto y un modo de respaldo determinista si la IA no está disponible.
- **Motivo:** Ayudar a jefes de servicio y coordinadores (usuarios no técnicos) a entender qué significan la predicción, el intervalo p10–p90, el semáforo y los aportes de factores sin exponer datos de pacientes ni depender de que el proveedor externo de IA responda para que la aplicación siga funcionando.
- **Alternativas consideradas:** (1) Chatbot con acceso SQL directo a la base: descartado por privacidad y porque en producción no hay base ni carpeta `data/`. (2) Chatbot sin herramientas (solo texto libre): descartado por riesgo de alucinación de cifras.
- **Consecuencias:** Toda cifra citada por el asistente sale de las herramientas o del estado de pantalla. Con `HUN_MODO_PRODUCCION=1`, las herramientas consultan el paquete canónico `models/modelos_web_bundle.joblib` a través de la API, sin acceder directamente a `data/` ni a la base hospitalaria. Si falta `ANTHROPIC_API_KEY` o falla la red, `/api/chat` responde en modo `respaldo` usando las mismas herramientas.

---

### DEC-008 · Modelo de demanda de largo plazo a 4 meses (sin rezagos cortos)

- **Fecha:** 2026-11-03
- **Sprint:** 3
- **Responsable:** Krlos
- **Estado:** Aceptada (implementada en `src/hun/models/largo_plazo.py`)
- **Decisión:** Construir un modelo independiente para horizontes de hasta 120 días (4 meses, agosto–noviembre de 2026) basado en LightGBM Poisson con ponderación exponencial por recencia (vida media de 180 días), usando únicamente calendario, el grupo validado `festivos_y_puentes`, tendencia secular (`tendencia_anios`) y clima típico por día del año (`clima_tipico_por_fecha`, mediana histórica anterior al corte). Los intervalos se construyen con cuantiles base más amplios (p05/p95) y un factor de ensanchamiento progresivo `1 + 0,10 × (mes_horizonte − 1)`.
- **Motivo:** La base termina el `2026-07-16` y el modelo operativo de 7 días depende de llegadas de las últimas 8 semanas (`llegadas_lag_7..56`), que no existen a 60–120 días; además `externos.parquet` no cuenta con clima medido a partir de octubre de 2026. Los cuantiles p10/p90 sin rezagos cortos se quedan estrechos (cobertura 65,9 % a 120 días, cayendo a 58,5 % en el mes 4) porque no capturan la deriva de nivel entre meses.
- **Alternativas consideradas:** (1) Pronóstico autorregresivo realimentando predicciones de 7 días hasta completar 120 días: descartado porque acumula sesgo y diluye los choques de festivos. (2) Ancla congelada de 8 semanas como offset: probada en backtest (exactitud global 82,9 % vs. 84,3 % sin ancla; empeora cuando la serie tiene tendencia dentro de la ventana de 4 meses).
- **Consecuencias:** En el backtest walk-forward a 120 días (13 pliegues, paso de 30 días) el modelo alcanza **84,3 % de exactitud global** (**86,0 %** en urgencias y **84,5 %** en rehabilitación; de 87,8 % en el mes 1 a 78,7 % en el mes 4) y **86,5 % de cobertura** del intervalo (≥ 84 % en los cuatro meses). Reporte reproducible en `docs/resultados/largo_plazo.md`.

---

### DEC-007 · API Backend FastAPI para servir predicciones reales y SHAP

- **Fecha:** 2026-10-28
- **Sprint:** 2
- **Responsable:** Krlos & Daniel
- **Estado:** Aceptada (implementada en `app/api/__init__.py`)
- **Decisión:** Implementar un backend en **FastAPI** (`app/api/`) que sirve directamente el contrato de `src/hun/models/predict.py`, respaldado por el paquete canónico `models/modelos_web_bundle.joblib` (LightGBM cuantil p10/p50/p90 + TreeExplainer SHAP + censo por etapas).
- **Motivo:** Sustituir los valores estáticos/simulados en la interfaz de React por inferencias reales basadas en los datos agregados y modelos entrenados, garantizando tiempos de respuesta sub-segundo (<20ms), validación automática de esquemas con Pydantic, CORS habilitado para el frontend de Vite (`http://localhost:5173`) y documentación interactiva automática en `/docs`.
- **Alternativas consideradas:** Servidor Flask (más verboso y sin validación Pydantic nativa); Inferencia puramente en el cliente JS/ONNX (descartada por complejidad de cálculo SHAP y empaquetado de modelos LightGBM).
- **Consecuencias:** La aplicación web consume los endpoints `/api/predecir`, `/api/historico/llegadas`, `/api/historico/turnos` y `/api/ocupacion`. La API respalda también las seis herramientas de solo lectura del chatbot (DEC-009), incluida la consulta de optimización. Con `HUN_MODO_PRODUCCION=1`, la API solo carga el bundle (ruta canónica o `HUN_BUNDLE_PATH` si está configurada) y devuelve un error explícito si falta, sin leer `data/raw/` ni `data/processed/`. El respaldo calibrado queda disponible solo fuera del modo estricto.

---

### DEC-006 · Framework de la aplicación web: React + Vite + Tailwind CSS

- **Fecha:** 2026-10-25
- **Sprint:** 2
- **Responsable:** Daniel
- **Estado:** Aceptada (2026-10-26, por el equipo; complementada por DEC-007)
- **Decisión:** La aplicación web interactiva se desarrolla en **Vite + React + Tailwind CSS** dentro de la carpeta `app/`.
- **Motivo:** Garantiza máxima velocidad de renderizado (0ms de latencia en el cliente para el simulador "¿qué pasa si?"), estética profesional SaaS/hospitalaria (Recharts, Lucide Icons, tema oscuro institucional) y desacoplamiento limpio.
- **Alternativas consideradas:** Streamlit (descartada por limitaciones estéticas, look genérico y latencia al recargar componentes).
- **Consecuencias:** Todo el desarrollo web vive en `app/` gestionado con `npm run dev`. No expone datos de pacientes y utiliza los parámetros del inventario OMOP. La web se comunica mediante HTTP con la API FastAPI (DEC-007) para obtener predicciones y explicabilidad SHAP real en tiempo real. El simulador trabaja dentro del rango de la base (2023-01-01 a 2026-07-16, DEC-002).

---

### DEC-005 · Herramienta del dashboard de análisis: Power BI

- **Fecha:** 2026-10-23
- **Sprint:** 1
- **Responsable:** Juan
- **Estado:** Aceptada (2026-10-25, revisión del Sprint 1)
- **Decisión:** El dashboard de análisis se hace en **Power BI** y se publica con enlace público.
  Lee solo datos agregados importados de `data/processed/` (llegadas, censo por etapa, duraciones
  y esperas entre etapas).
- **Motivo:** Las bases del reto piden el enlace a un dashboard en Power BI. Un dashboard publicado
  no puede conectarse a la base por la VPN, así que de todas formas trabaja con agregados importados.
- **Alternativas consideradas:** Dash (Python): más control y se versiona completo, pero exigiría
  confirmar con la organización que se acepta en lugar de Power BI, y duplica lo que ya hará la web.
- **Consecuencias:** Se adoptó el formato **PBIP**: [`HUN_CuellosBotella.pbip`](../dashboards/powerbi/HUN_CuellosBotella/HUN_CuellosBotella.pbip) versiona un modelo estrella de **12 tablas, 18 relaciones y 43 medidas DAX**, y un informe de **7 páginas**, sin datos crudos ni caché de datos. El `.pbix` con datos importados no se sube. El [tablero público en Power BI](https://app.powerbi.com/view?r=eyJrIjoiYjU3YTBhMWItNTM5Mi00NDk4LTlkNmEtMmFmMzA2MzJjZjQ4IiwidCI6ImJhYjBiNjc5LWJkNWYtNGZlOC1iNTE2LWM2YjhiMzE3Yzc4MiIsImMiOjR9) está publicado y enlazado en el README. Antes de cada publicación, revisar que ninguna visual muestre celdas con muy pocos pacientes.

### DEC-004 · Protocolo de aceptación de factores externos

- **Fecha:** 2026-10-15
- **Sprint:** 1
- **Responsable:** Krlos (valida Daniel)
- **Estado:** Aceptada (2026-10-25, revisión del Sprint 1)
- **Decisión:** Un grupo de factores externos solo entra al modelo si pasa ablación, control de
  estacionalidad, placebo y estabilidad en validación walk-forward. Detalle y umbrales en
  [protocolo_factores_externos.md](protocolo_factores_externos.md).
- **Motivo:** Evitar presentar como hallazgo algo que es azar o temporada. En datos simulados, una columna
  de ruido superó el umbral de mejora y solo la descartaron el placebo y la prueba de signo.
- **Alternativas consideradas:** Importancia de variables del modelo (SHAP) sola: descartada como criterio
  de entrada porque mide uso dentro del modelo, no mejora fuera de muestra.
- **Consecuencias:** Los umbrales (1 % de mejora, 70 % de pliegues, p ≤ 0.05, placebo < ½) se confirman
  con Daniel antes de correrlo en el Sprint 2.

### DEC-003 · Validación walk-forward y WAPE como métrica principal

- **Fecha:** 2026-10-15
- **Sprint:** 1
- **Responsable:** Krlos (valida Daniel)
- **Estado:** Aceptada (2026-10-25, revisión del Sprint 1)
- **Decisión:** Todo modelo se evalúa con pliegues walk-forward (orígenes cada 14 días en el último año,
  7 días de prueba) definidos en `src/hun/models/validacion.py`. Métrica principal: WAPE. La referencia a
  superar es la línea base (promedio del mismo día y hora en semanas anteriores).
- **Motivo:** La partición aleatoria mezcla futuro y pasado y da errores optimistas. El MAPE explota con
  horas de 0 llegadas; el WAPE no y se lee como porcentaje.
- **Alternativas consideradas:** Un solo corte train/test: descartado, no mide estabilidad entre temporadas.
- **Consecuencias:** Línea base, protocolo de factores y modelo principal comparten pliegues. Si Daniel
  cambia el plan de validación, se cambia en ese módulo y todo lo hereda.

### DEC-002 · Objetivo de predicción: llegadas diarias por servicio y censo horario

- **Fecha:** 2026-10-15
- **Sprint:** 1
- **Responsable:** Krlos
- **Estado:** Aceptada (2026-10-15, cerrada con el inventario de la base)
- **Decisión:** Predecir llegadas por tipo de visita por día (horizonte 1–7 días) con intervalo p10–p90,
  y el censo horario reconstruido con entradas y salidas como medida de saturación. Detalle en
  [objetivo_prediccion.md](objetivo_prediccion.md).
- **Motivo:** La base no tiene columna de servicio ni capacidad instalada: el tipo de visita es el servicio
  y la saturación se mide relativa a la historia. El día es la escala de los factores externos y de la
  planeación de turnos.
- **Alternativas consideradas:** Solo modelo horario: depende de que las horas de la base sean reales
  (se verifica con `06_precision_horas.sql`).
- **Consecuencias:** Las extracciones son agregados por hora (`04` y `05`), sin filas de pacientes.
- **Resultado del inventario:** datos del 2023-01-01 al 2026-07-17 (corte detectado automáticamente); horas
  reales en urgencias, así que se mantiene el modelo horario con el día como unidad principal; se modelan
  rehabilitación, urgencias y urgencia-tratamiento, y se agrupan hospitalización (< 1 llegada/día) y
  "sin concepto". **Cambio:** `visit_end_datetime` = `visit_start_datetime` en toda la base, así que el
  censo no se reconstruye con `visit_occurrence`; se hará con las etapas de `visit_detail`. Línea base
  (mediana de 8 semanas): WAPE 29,4 % por hora y 18,0 % por día; ver `docs/resultados/`.

### DEC-001 · Estructura inicial del repositorio y protección de datos

- **Fecha:** 2026-09-29
- **Sprint:** 1
- **Responsable:** Krlos
- **Estado:** Aceptada
- **Decisión:** Repositorio con paquete Python `hun` en `src/`, datos fuera de Git, notebooks sin outputs
  (`nbstripout`) y flujo `main` / `develop` / `feature/*` con Pull Requests.
- **Motivo:** Los datos del hospital son confidenciales; se necesita un flujo que impida subirlos por error
  y que permita trabajar en paralelo a tres personas.
- **Alternativas consideradas:** Repositorio sin paquete (solo notebooks): descartado porque dificulta
  reutilizar código entre el modelo, la web y la validación.
- **Consecuencias:** Los datos se comparten por un canal privado externo. Cada integrante debe instalar
  `pre-commit`.
