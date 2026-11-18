# Producto · Centro de decisiones HUN

## Propósito

Ayudar al personal del Hospital Universidad del Norte a interpretar la demanda asistencial y decidir dónde
vigilar, mover capacidad o revisar un cuello de botella.

## Usuarios

El usuario prioritario es el personal médico y asistencial. También usan la herramienta coordinadores operativos
y dirección administrativa. La interfaz debe poder leerse rápidamente durante un turno, sin exigir conocimientos
de modelado estadístico.

## Decisiones principales

- ¿Cómo viene hoy la demanda por servicio?
- ¿Qué cambia si se simula otra fecha o escenario?
- ¿Dónde se concentra la presión por hora, etapa y servicio?
- ¿Qué tan confiable es el pronóstico?

## Personalidad

Institucional, precisa y cercana. Debe transmitir que los datos sirven para cuidar mejor la operación, no para
reemplazar el criterio clínico. La interfaz evita lenguaje técnico innecesario y muestra primero la consecuencia
operativa; el detalle metodológico queda disponible bajo demanda.

## Límites

- No mostrar pacientes individuales ni PHI/PII.
- Mantener los servicios y métricas OMOP existentes.
- Conservar modo claro/oscuro, responsive y conexión con la API FastAPI.
- El histórico y los umbrales son apoyo para decidir, no una orden clínica.
