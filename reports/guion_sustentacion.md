# Guion documental para la sustentación de MediFlow

Estado: borrador para ensayo del equipo. Este archivo no acredita diapositivas entregadas,
sustentación realizada ni recepción oficial. Los dos PDF del Challenge no fijan aquí una
duración de exposición; confirmar la logística con la organización.

## Problema y flujo

El hospital necesita distinguir cuántos pacientes llegan de cuántos permanecen en cada etapa.
MediFlow reconstruye etapas OMOP y compara patrones de demanda, duración y censo.
La fecha de inicio y fin de la visita principal no permite medir estancias útiles en este
extracto. Las transiciones administrativas tampoco identifican por sí solas espera por cama.

Mostrar el flujo en Power BI y explicar los conceptos de llegada, etapa, transición y censo.
Declarar el corte de abril del tablero y su diferencia con el de julio del bundle.

## Preparación de datos

Explicar deduplicación de llegadas, grilla regular con ceros y recorte estadístico p99.9.
El recorte puede excluir estancias reales; no equivale a una decisión clínica. El calentamiento
no recupera un stock inicial omitido. La reconciliación del informe es un resultado archivado.

Mostrar SQL y pruebas locales, sin abrir credenciales ni conectarse al hospital.

## Modelo y evaluación

El experimento Poisson `lgbm_final` registra WAPE global de 10.5% en su reporte archivado.
La aplicación sirve otro modelo, LightGBM cuantílico. En el bundle v2.0, Urgencias registra
WAPE 8.91% y cobertura 78.57%; Rehabilitación, 11.08% y 64.29%; Tratamiento Urgencias,
42.18% y 73.08%. Son métricas archivadas de 182 días evaluados por servicio.

Explicar walk-forward, origen temporal, WAPE y cobertura. No llamar a `1-WAPE` porcentaje
de días acertados ni transferir esas métricas a inferencias con rezagos sustituidos.

## Decisiones operativas

Erlang C determina equipos equivalentes bajo tiempos de atención y metas elegidos.
OMOP no contiene plantilla real. Little estima ocupación media a tasa fija. La simulación
de altas mantiene ingresos y umbral histórico y no identifica pacientes clínicamente elegibles.

El escenario archivado de adelantar 35% de altas pasa de 9.32% a 6.26% de horas rojas,
con pico 359 sin reducción. Es simulación, no un efecto observado de una intervención.
El bundle conserva Little híbrido 284.01; la reconciliación documentada de 277.52 no está
aplicada al archivo. No sumar ambos escenarios como beneficios independientes.

## Demostración reproducible

1. Identificar versión, SHA-256, corte y capacidades mediante `/api/modelo`.
2. Mostrar la comparación histórica del modelo cuantílico y su cobertura.
3. Abrir optimización, elegir modo histórico y una jornada y variar tiempos/dotación.
4. Cambiar al modo con perfil anterior al corte. Con el bundle v2.0, mostrar la
   indisponibilidad real y explicar los perfiles ausentes; volver al histórico.
5. Presentar las recomendaciones como hipótesis que el hospital debe validar.

No usar fixtures sintéticos como si fueran resultados hospitalarios. Una demo sintética,
si se utiliza para probar el formato v2.1, debe anunciarse expresamente como tal.

## Ingeniería y reproducibilidad

Explicar separación entre paquete Python, API, frontend y Power BI. Mostrar el resultado
de pruebas de la versión que se entrega, no un badge histórico. En producción una falla
del modelo informa indisponibilidad sin sustituirla por una estimación paramétrica.

## Recomendaciones y siguiente validación

Priorizar la auditoría de marcas de traslado, la medición de capacidad y tiempos reales,
y un piloto supervisado de egreso seguro. Responsables funcionales propuestos: coordinación
asistencial, gestión de camas y analítica del HUN; su participación no está confirmada.

El simulador del recorrido continúa en diseño y el piloto prospectivo sigue pendiente.
La aprobación de una suite local no constituye aprobación para uso clínico.

## Preguntas para ensayar

- ¿Qué diferencia el modelo del informe del modelo servido por la aplicación?
- ¿Qué evita usar datos posteriores al origen en un backtest?
- ¿Por qué un p90 mensual ponderado no es el p90 del conjunto?
- ¿Qué limitaciones introducen p99.9, el stock inicial y el corte temporal?
- ¿Qué se necesita para transformar equipos equivalentes en una decisión factible?
- ¿Qué resultados fueron ejecutados en local y cuáles permanecen archivados?

Fuentes del contenido: `reports/informe_final.md`, `docs/resultados/modelo_demanda.md`,
`docs/resultados/optimizacion.md` y bundle v2.0. Pesos oficiales: T&C, p. 4, §14;
desempates: p. 5, §16. El enunciado técnico enumera los entregables en p. 3.
