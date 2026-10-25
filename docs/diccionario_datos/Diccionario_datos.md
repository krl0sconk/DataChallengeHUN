# uhn_i Data Challange DATABASE
El esquema central es 'uninorte_omop'
## Arquitectura de uninorte_omop CDM
### person 
- person_id: Identificador único anonimizado de cada paciente.
- gender_concept_id:  Identificador estandarizado del sexo del paciente.
- year_of_birth: Año de nacimiento del paciente.
- race_concept_id: Identificador estandarizado asociado al grupo racial del paciente.
- ethnicity_concept_id: Identificador estandarizado asociado a la etnia del paciente.
### condition_occurrence
- condition_occurrence_id: Identificador único de cada diagnóstico o condición clínica registrada.
- person_id: Identificador del paciente asociado al diagnóstico.
- visit_occurrence_id: Identificador de la visita relacionada con el diagnóstico registrado.
- condition_concept_id: Identificador estandarizado del diagnóstico o condición clínica.
- condition_start_datetime: Fecha y hora de inicio o registro de la condición clínica.
### procedure_occurrence
- procedure_occurrence_id: Identificador único de cada procedimiento realizado.
- person_id: Identificador del paciente asociado al procedimiento.
- visit_occurrence_id: Identificador de la visita asociada al procedimiento realizado.
- procedure_concept_id: Identificador estandarizado del procedimiento clínico realizado.
- procedure_datetime: Fecha y hora de realización del procedimiento.
- procedure_type_concept_id: Identificador asociado al tipo u origen del procedimiento registrado.
### measurement
- measurement_id: Identificador único de cada medición clínica registrada.
- person_id: Identificador del paciente asociado a la medición clínica.
- visit_occurrence_id: Identificador de la visita asociada a la medición realizada.
- measurement_concept_id: Identificador estandarizado de la medición clínica o laboratorio realizado.
- measurement_datetime: Fecha y hora de realización de la medición clínica.
- value_as_number: Valor numérico asociado al resultado de la medición clínica.
- unit_concept_id: Identificador estandarizado de la unidad de medida utilizada.
- measurement_type_concept_id: Identificador asociado al tipo u origen de la medición registrada.
### visit_occurrence
- visit_occurrence_id: Identificador único de cada visita o encuentro clínico del paciente.
- person_id: Identificador del paciente asociado a la visita.
- visit_concept_id: Identificador estandarizado del tipo de visita (urgencias, hospitalización, consulta, etc.).
- visit_start_datetime: Fecha y hora de inicio de la visita hospitalaria.
- visit_end_datetime: Fecha y hora de finalización de la visita hospitalaria.
- visit_type_concept_id: Identificador que describe el origen o tipo de registro de la visita.
- provider_id: Identificador del profesional de salud asociado a la visita.

### visit_detail
- visit_detail_id: Identificador único de cada detalle o microproceso dentro de una visita hospitalaria.
- visit_occurrence_id: Identificador de la visita principal asociada al detalle registrado.
- visit_detail_concept_id: Identificador estandarizado del tipo de etapa o subproceso clínico dentro de la visita.
- visit_detail_start_datetime: Fecha y hora de inicio del subproceso o etapa hospitalaria.
- visit_detail_end_datetime: Fecha y hora de finalización del subproceso o etapa hospitalaria.
- provider_id: Identificador del profesional asociado al subproceso registrado.

## Arquitectura de uninorte_omop vocabularios

### concept
- concept_id: identificador primario. Esta es una FK que se conceta con las columnas con sufijos '_concept_id' de las otras tablas
- concept_name: descripcion del concepto
- domain_id: dominio del concepto (Ej: drugs, procedure, ...)
- vocabulary_id: vocabulario al que pertenece el concepto.