# Calidad de los datos

- **Tarea:** #12 Auditoría de calidad de datos · Sprint 1
- **Responsable:** Juan
- **Fuente:** `python -m hun.data.extraer auditoria` (consultas `src/hun/data/sql/07` a `12`, solo conteos)
- **Análisis:** `notebooks/02_preparacion/02_preparacion_jn_auditoria_calidad.ipynb` y `src/hun/data/auditoria.py`
- **Fecha de la extracción:** 2026-10-28

Aquí solo van agregados (conteos y porcentajes). Ninguna fila de paciente.

## Resumen para el equipo

| Pregunta | Respuesta |
|---|---|
| ¿Las fechas están corridas por la anonimización? | **No están corridas (desfase = 0 días)**. En rehabilitación (citas programadas), el volumen cae a 0,3 % en los festivos entre semana (volumen relativo 0,0032, mínimo global en desfase 0 con margen de 0,50 frente al segundo). La misma prueba sobre las etapas de `visit_detail` muestra que el mínimo en rehabilitación cae en desfase 0. Las fechas corresponden al calendario real colombiano. |
| ¿Se pueden usar festivos, Carnaval y diciembre como factores externos? | **Sí, se pueden usar con confianza.** Dado que las fechas no tienen desplazamiento, los factores externos de calendario coinciden con los eventos reales observados. En rehabilitación el cierre es total (caída a ~0 % en Carnaval lunes/martes y 24/25/31 dic/1 ene); en urgencias se evidencia el patrón festivo típico (disminución a 56–58 % en Nochebuena y Fin de Año con rebote posterior de +14–16 % en los días siguientes). |
| ¿`visit_detail` sirve para tiempos por etapa y censo? | **Sí, con reglas de filtrado.** El 100 % de las etapas tienen fecha de inicio y fin registradas (0 % nulos, 0 % fin antes de inicio). Las etapas huérfanas son despreciables (solo 117 en total sobre 3,28 millones, < 0,004 %). Las estancias > 30 días representan menos de 0,4 % en hospitalización y < 0,01 % en urgencias. Requiere excluir etapas huérfanas y filtrar etapas sin fin / inconsistentes como ya implementa la serie de censo. |
| Reglas de limpieza que se aplican | Excluir etapas huérfanas y sin fin/inconsistentes para tiempos y censo. Reclasificar edades imposibles (< 0 o > 110 años, 43 visitas en total) como `invalida` para no distorsionar el grupo 0–17. Tratar los duplicados en `visit_occurrence` (13,38 % de copias sobrantes generadas en facturación/registros múltiples) agrupando por paciente, servicio y timestamp de inicio. |

## 1. Nulos

Chequeo sobre todas las tablas clínicas principales del modelo:

| Tabla | Columna | Filas | Nulos | % nulos | Alerta (> 1 %) |
|---|---|---|---|---|---|
| `person` | `person_id` | 912.205 | 0 | 0,00 % | No |
| `person` | `gender_concept_id` | 912.205 | 0 | 0,00 % | No |
| `person` | `year_of_birth` | 912.205 | 0 | 0,00 % | No |
| `visit_detail` | `visit_detail_id` | 3.281.613 | 0 | 0,00 % | No |
| `visit_detail` | `visit_occurrence_id` | 3.281.613 | 0 | 0,00 % | No |
| `visit_detail` | `visit_detail_concept_id` | 3.281.613 | 0 | 0,00 % | No |
| `visit_detail` | `visit_detail_start_datetime` | 3.281.613 | 0 | 0,00 % | No |
| `visit_detail` | `visit_detail_end_datetime` | 3.281.613 | 0 | 0,00 % | No |
| `visit_detail` | `provider_id` | 3.281.613 | 0 | 0,00 % | No |
| `visit_occurrence` | `visit_occurrence_id` | 1.706.001 | 0 | 0,00 % | No |
| `visit_occurrence` | `person_id` | 1.706.001 | 0 | 0,00 % | No |
| `visit_occurrence` | `visit_concept_id` | 1.706.001 | 0 | 0,00 % | No |
| `visit_occurrence` | `visit_start_datetime` | 1.706.001 | 0 | 0,00 % | No |
| `visit_occurrence` | `visit_end_datetime` | 1.706.001 | 0 | 0,00 % | No |
| `visit_occurrence` | `provider_id` | 1.706.001 | 0 | 0,00 % | No |

## 2. Duplicados

| Tabla | Chequeo | Grupos | Copias sobrantes | % | Alerta (> 1 %) |
|---|---|---|---|---|---|
| `visit_occurrence` | `ids_repetidos` (IDs de visita duplicados) | 0 | 0 | 0,00 % | No |
| `visit_occurrence` | `registros_repetidos` (mismo paciente, fecha y tipo) | 221.669 | 228.259 | 13,38 % | **Sí** |
| `visit_detail` | `ids_repetidos` (IDs de etapa duplicados) | 0 | 0 | 0,00 % | No |
| `visit_detail` | `registros_repetidos` (mismo paciente, etapa y fecha) | 14.069 | 14.081 | 0,43 % | No |

## 3. Etapas (`visit_detail`)

Distribución de problemas y duraciones por etapa y tipo de visita padre:

| Etapa | Visita padre | Etapas | % sin fin | % fin antes de inicio | % huérfanas | % antes de la visita | % > 30 días | p50 (h) | p90 (h) |
|---|---|---|---|---|---|---|---|---|---|
| Rehabilitación (581479) | Rehabilitación (581479) | 1.366.121 | 0,00 % | 0,00 % | 0,00 % | 22,45 % | 0,00 % | 0,0 | 0,0 |
| Urgencia-tratamiento (3045729) | Urgencias (9203) | 855.250 | 0,00 % | 0,00 % | 0,00 % | 13,84 % | 0,01 % | 1,3 | 12,4 |
| Urgencias (9203) | Urgencias (9203) | 419.140 | 0,00 % | 0,00 % | 0,00 % | 7,78 % | 0,01 % | 0,1 | 0,1 |
| Urgencia-tratamiento (3045729) | Rehabilitación (581479) | 259.806 | 0,00 % | 0,00 % | 0,00 % | 87,27 % | 0,01 % | 0,6 | 10,7 |
| Rehabilitación (581479) | Urgencias (9203) | 167.902 | 0,00 % | 0,00 % | 0,00 % | 99,97 % | 0,00 % | 0,0 | 0,0 |
| Hospitalización (9201) | Urgencias (9203) | 74.006 | 0,00 % | 0,00 % | 0,00 % | 14,18 % | 0,35 % | 46,1 | 186,2 |
| Urgencias (9203) | Rehabilitación (581479) | 61.387 | 0,00 % | 0,00 % | 0,00 % | 99,95 % | 0,00 % | 0,1 | 0,1 |
| Urgencia-tratamiento (3045729) | Urgencia-tratamiento (3045729) | 37.000 | 0,00 % | 0,00 % | 0,00 % | 9,52 % | 0,04 % | 2,3 | 51,1 |
| Hospitalización (9201) | Rehabilitación (581479) | 25.859 | 0,00 % | 0,00 % | 0,00 % | 79,66 % | 0,44 % | 42,9 | 169,8 |
| Hospitalización (9201) | Urgencia-tratamiento (3045729) | 7.908 | 0,00 % | 0,00 % | 0,00 % | 4,44 % | 1,56 % | 71,3 | 262,2 |
| Hospitalización (9201) | Hospitalización (9201) | 737 | 0,00 % | 0,00 % | 0,00 % | 2,04 % | 0,54 % | 16,1 | 79,1 |
| Hospitalización (9201) | Huérfana (NaN) | 91 | 0,00 % | 0,00 % | 100,00 % | 0,00 % | 0,00 % | 65,8 | 218,3 |
| Urgencia-tratamiento (3045729) | Huérfana (NaN) | 25 | 0,00 % | 0,00 % | 100,00 % | 0,00 % | 0,00 % | 0,8 | 6,9 |
| Rehabilitación (581479) | Huérfana (NaN) | 1 | 0,00 % | 0,00 % | 100,00 % | 0,00 % | 0,00 % | 0,0 | 0,0 |

> Nota: Las etapas que registran fecha de inicio anterior a la de la visita (`antes_de_la_visita`) corresponden a atenciones previas en urgencias o consultas externas que se asociaron administrativamente al mismo episodio hospitalario posterior.

## 4. Edades y sexo

- **Visitas con edad imposible (antes de nacer o > 110 años):** **43 visitas (22 pacientes)** representando el **0,0025 %** de las 1.706.001 visitas totales:
  - 1 visita con edad de registro negativa (-10 años).
  - 3 visitas con edad registrada superior a 110 años.
  - 39 visitas con año de nacimiento erróneo fijado en 2020 para atenciones clínicas ocurridas antes de ese año.

## 5. Desplazamiento de fechas

Método: volumen de los festivos entre semana frente al mismo día de la semana en las 3 semanas
vecinas, corriendo los festivos de −21 a +21 días. Con fechas reales, el hueco más hondo cae en 0.
Rehabilitación es la prueba principal (citas programadas, cierra en festivos).

| Serie | Desfase estimado | Volumen relativo en 0 | Conclusión |
|---|---|---|---|
| Rehabilitación (`visit_occurrence`) | 0 días | 0,0032 (0,32 %) | Fechas reales: el hueco cae exactamente en el festivo (margen 0,50 vs. segundo) |
| Urgencias (`visit_occurrence`) | 0 días | 0,7395 (73,95 %) | Sin efecto festivo claro: la prueba no decide (servicio continuo 24/7) |
| Etapas (`visit_detail` - Rehabilitación) | 0 días | 0,0033 (0,33 %) | Fechas reales: el hueco cae exactamente en el festivo (margen 0,49 vs. segundo) |
| Etapas (`visit_detail` - Urgencias) | 0 días | 0,7350 (73,50 %) | Sin efecto festivo claro: la prueba no decide |
| Etapas (`visit_detail` - Hospitalización) | 0 días | 0,7658 (76,58 %) | Sin efecto festivo claro: la prueba no decide |

**Carnaval y fin de año:**
- **Carnaval de Barranquilla (sábado a martes):** En rehabilitación, las atenciones programadas se reducen a prácticamente cero el lunes (0,25 %) y martes (0,21 %) de Carnaval (días no laborales en Barranquilla). En urgencias se presenta una moderada reducción de consultas ambulatorias el sábado (75,8 %) y lunes de Carnaval (76,4 %), pero el servicio médico se mantiene activo y con capacidad operativa.
- **Fin de año (24–25 dic y 31 dic–1 ene):** En rehabilitación, el volumen cae drásticamente el 24 dic (8,3 %), 25 dic (0,28 %), 31 dic (1,1 %) y 1 ene (0,52 %). En urgencias, se observa una reducción en Nochebuena (57,9 %) y Fin de Año (56,0 %) debido a la postergación voluntaria de atenciones no críticas por motivos festivos, seguida de un claro efecto rebote en los días posteriores (+16,7 % el 26 dic y +14,1 % el 2 ene).

## Reglas de limpieza

Se deciden con los resultados de arriba y se aplican dentro del SQL de las extracciones.

Ya aplicadas (no dependen de los porcentajes; son fechas que no pueden ser ciertas):

| Regla | Dónde se aplica | Por qué |
|---|---|---|
| Fuera las etapas sin fin o con fin antes del inicio | `14`/`15` (censo, vía `entradas_con_salida`), `16`, `17` y `18` | Sin un fin válido no hay duración, ni censo, ni espera hacia la etapa siguiente. En `18` se excluyen antes de ordenar, así que la "etapa siguiente" es la siguiente válida. |
| Edad imposible → grupo `invalida` | `13` (perfil de llegadas) | Visita antes del año de nacimiento o más de 110 años, misma regla que `10`. Antes caían en `0-17` e inflaban a los menores. |
| Visitas únicas por `(person_id, visit_concept_id, visit_start_datetime)` | `04`, `11` y `13` (llegadas) | `visit_occurrence` trae 13,38 % de copias sobrantes. Con `COUNT(DISTINCT ...)` las llegadas bajan de 1.706.001 a 1.477.742 (−13,4 %), y la línea base y los modelos se reentrenaron sobre ese conteo. |

Decididas con los resultados de la auditoría:

- **Etapas de más de 30 días:** Representan una fracción residual (< 0,01 % en urgencias y 0,35 % a 1,56 % en hospitalización). La política inicial conservaba estas etapas. El SQL vigente de entradas, salidas y duraciones aplica un tope p99.9 por etapa; ese recorte estadístico puede excluir estancias reales y exige revisión clínica. No debe confundirse con descartar todas las estancias superiores a 30 días. En saturación, el percentil 99 ($p_{99} \approx 23$ días) fija el periodo de calentamiento en 24 días.
- **Duplicados en `visit_occurrence` (13,38 %):** Se tratan en el pipeline agrupando por `(person_id, visit_concept_id, visit_start_datetime)` antes de realizar agregaciones de volumen y llegadas diarias, previniendo sobreconteo por refacturación o registros administrativos redundantes.
- **Nulos:** 0,00 % en todas las tablas clave (no se requiere imputación de fechas ni identificadores).
