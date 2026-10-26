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

### DEC-006 · Framework de la aplicación web: React + Vite + Tailwind CSS

- **Fecha:** 2026-10-25
- **Sprint:** 2
- **Responsable:** Daniel
- **Estado:** Aceptada
- **Decisión:** La aplicación web interactiva se desarrolla en **Vite + React + Tailwind CSS** dentro de la carpeta `app/`.
- **Motivo:** Garantiza máxima velocidad de renderizado (0ms de latencia en el cliente para el simulador "¿qué pasa si?"), estética profesional SaaS/hospitalaria (Recharts, Lucide Icons, tema oscuro institucional) y desacoplamiento limpio.
- **Alternativas consideradas:** Streamlit (descartada por limitaciones estéticas, look genérico y latencia al recargar componentes).
- **Consecuencias:** Todo el desarrollo web vive en `app/` gestionado con `npm run dev`. No expone datos de pacientes y utiliza los parámetros del inventario OMOP.

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
- **Consecuencias:** El `.pbix` tiene datos importados y no se sube (lo bloquea el `.gitignore`); en
  `dashboards/powerbi/` solo van la plantilla `.pbit`, documentación y capturas, y el enlace publicado
  va en el README. Antes de publicar, revisar que ninguna visual muestre celdas con muy pocos pacientes.

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
