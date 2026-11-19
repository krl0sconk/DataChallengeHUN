# Producto · MediFlow

## Propósito

**MediFlow** es el centro de control operativo y pronóstico asistencial desarrollado para el **Hospital Universidad del Norte (HUN)**. Ayuda al personal clínico, coordinadores de turno y dirección operativa a anticipar la demanda por servicio, detectar cuellos de botella por etapa o franja horaria y decidir ajustes de dotación con respaldo cuantitativo antes de que ocurra la saturación.

## Identidad

- **Nombre del producto:** MediFlow
- **Institución clínica:** Hospital Universidad del Norte (HUN) · Data Challenge 2026
- **Estándar de datos:** OMOP CDM v5.4 (agregados operacionales, cero PHI/PII)

## Usuarios

- **Jefes de guardia y personal asistencial:** necesitan leer el nivel de presión del turno en menos de 10 segundos, sin jerga estadística.
- **Coordinadores operativos y de enfermería:** comparan servicios, ubican franjas críticas y prueban escenarios de dotación Erlang C.
- **Dirección hospitalaria y analítica clínica:** auditan precisión histórica (WAPE, MAE, cobertura de intervalos p10–p90) y horizonte de mediano plazo.

## Decisiones principales

1. **Resumen del turno (`hoy`):** ¿Cómo viene la demanda hoy y los próximos 3–14 días? ¿Qué servicio está bajo mayor presión frente a p75/p90?
2. **Cuellos de botella (`atascos`):** ¿En qué franjas horarias y etapas asistenciales se concentra la demora?
3. **Simulador y dotación (`simulador`):** ¿Qué impacto tienen eventos como festivos o Carnaval y cuántos recursos adicionales requiere un turno para cumplir la meta de espera?
4. **Precisión del modelo (`precision`):** ¿Qué tan fiel ha sido el pronóstico frente a la demanda real observada?
5. **Guía operativa (`metodologia`):** ¿Qué significa cada umbral, parámetro y regla de gobernanza?

## Límites

- Nunca mostrar pacientes individuales ni PHI/PII.
- Conservar todos los servicios OMOP (`urgencias`, `rehabilitacion`, `tratamiento_urgencia`), umbrales `p75`/`p90` y endpoints FastAPI existentes.
- Mantener soporte completo de modo claro (turno día) y modo oscuro (turno noche), navegación por teclado y diseño responsivo.
- El pronóstico y la simulación apoyan el criterio clínico y operativo; no reemplazan decisiones médicas.
