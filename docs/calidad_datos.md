# Calidad de los datos

- **Tarea:** #12 Auditoría de calidad de datos · Sprint 1
- **Responsable:** Juan
- **Fuente:** `python -m hun.data.extraer auditoria` (consultas `src/hun/data/sql/07` a `12`, solo conteos)
- **Análisis:** `notebooks/02_preparacion/02_preparacion_jn_auditoria_calidad.ipynb` y `src/hun/data/auditoria.py`
- **Fecha de la extracción:** TODO: completar

Aquí solo van agregados (conteos y porcentajes). Ninguna fila de paciente.

## Resumen para el equipo

| Pregunta | Respuesta |
|---|---|
| ¿Las fechas están corridas por la anonimización? | TODO: completar con la sección 5 del notebook |
| ¿Se pueden usar festivos, Carnaval y diciembre como factores externos? | TODO |
| ¿`visit_detail` sirve para tiempos por etapa y censo? | TODO |
| Reglas de limpieza que se aplican | TODO (ver *Reglas de limpieza*) |

## 1. Nulos

| Tabla | Columna | % nulos |
|---|---|---|
| TODO | | |

## 2. Duplicados

| Tabla | Chequeo | Copias sobrantes | % |
|---|---|---|---|
| TODO | | | |

## 3. Etapas (`visit_detail`)

| Etapa | Visita | Etapas | % sin fin | % fin antes de inicio | % huérfanas | % antes de la visita | % > 30 días | p50 (h) | p90 (h) |
|---|---|---|---|---|---|---|---|---|---|
| TODO | | | | | | | | | |

## 4. Edades y sexo

- Visitas con edad imposible (antes de nacer o > 110 años): TODO

## 5. Desplazamiento de fechas

Método: volumen de los festivos entre semana frente al mismo día de la semana en las 3 semanas
vecinas, corriendo los festivos de −21 a +21 días. Con fechas reales, el hueco más hondo cae en 0.
Rehabilitación es la prueba principal (citas programadas, cierra en festivos).

| Serie | Desfase estimado | Volumen relativo en 0 | Conclusión |
|---|---|---|---|
| Rehabilitación (`visit_occurrence`) | TODO | | |
| Urgencias (`visit_occurrence`) | TODO | | |
| Etapas (`visit_detail`) | TODO | | |

Carnaval y fin de año: TODO: describir el perfil de la sección 5.2.

## Reglas de limpieza

Se deciden con los resultados de arriba y se aplican dentro del SQL de las extracciones.

Ya aplicadas (no dependen de los porcentajes; son fechas que no pueden ser ciertas):

| Regla | Dónde se aplica | Por qué |
|---|---|---|
| Fuera las etapas sin fin o con fin antes del inicio | `14`/`15` (censo, vía `entradas_con_salida`), `16`, `17` y `18` | Sin un fin válido no hay duración, ni censo, ni espera hacia la etapa siguiente. En `18` se excluyen antes de ordenar, así que la "etapa siguiente" es la siguiente válida. |
| Edad imposible → grupo `invalida` | `13` (perfil de llegadas) | Visita antes del año de nacimiento o más de 110 años, misma regla que `10`. Antes caían en `0-17` e inflaban a los menores. |

Por decidir con los resultados:

- TODO: qué hacer con las etapas de más de 30 días (¿se marcan o se descartan?).
- TODO: si los nulos o duplicados superan el umbral de alerta (1 %), cómo se tratan.
