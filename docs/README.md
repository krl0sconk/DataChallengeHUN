# docs/

Documentación integral del proyecto: decisiones de arquitectura, auditoría de datos, metodología de modelado, resultados experimentales y planeación de sprints.

## Índice de Documentación

### 1. Metodología y Decisiones
- [decisiones.md](decisiones.md): Registro de Decisiones de Arquitectura (ADR) técnicas, metodológicas y de producto.
- [objetivo_prediccion.md](objetivo_prediccion.md): Formulación matemática del problema, métricas de negocio y servicios priorizados.
- [protocolo_factores_externos.md](protocolo_factores_externos.md): Criterios de validación rigurosa (ablación, pruebas placebo, estabilidad) para variables externas.
- [datos_externos.md](datos_externos.md): Catálogo de fuentes externas (clima Open-Meteo, calendario Festivos/Carnaval, epidemiología SIVIGILA).

### 2. Exploración y Calidad de Datos
- [calidad_datos.md](calidad_datos.md): Reporte de auditoría de calidad (verificación de desplazamiento temporal de 0 días, duplicados, etapas y completitud).
- [inventario_base.md](inventario_base.md): Conteo de registros, tamaños en disco y cobertura temporal por tabla OMOP.
- [hallazgos.md](hallazgos.md): Patrones operacionales, cuellos de botella en observación, picos horarios y demografía de pacientes.
- [cierre_datos.md](cierre_datos.md): Acta de cierre de la fase de extracción con huellas de integridad de datos.
- [diccionario_datos.md](diccionario_datos.md): Estructura de tablas OMOP en PostgreSQL HUN y catálogo de las 24 consultas SQL (`00` a `23`). `14`, `15` y `16` aplican el mismo filtro `p99.9` por etapa a las entradas, salidas y duraciones; `23` documenta el umbral (`horas_p999`) sin recortar la distribución de duraciones válidas.
- [diccionario_datos/Diccionario_datos.md](diccionario_datos/Diccionario_datos.md): Diccionario oficial extendido de conceptos clínicos OMOP.
- [guia_sesion_bd.md](guia_sesion_bd.md): Protocolo de conexión segura por VPN y comandos CLI de extracción reproducible.

### 3. Resultados de Modelado y Reportes
- [resultados/README.md](resultados/README.md): Índice y resumen de experimentos de modelado.
  - [resultados/linea_base.md](resultados/linea_base.md): Evaluación horaria del modelo estacional de 8 semanas (WAPE 29.4%).
  - [resultados/linea_base_diaria.md](resultados/linea_base_diaria.md): Evaluación diaria del modelo de referencia (WAPE 18.0%).
   - [resultados/modelo_demanda.md](resultados/modelo_demanda.md): Línea base 18.0% → Poisson estratificado 15.6% → `lgbm_final` 10.5% WAPE.
  - [resultados/factores_externos.md](resultados/factores_externos.md): Análisis de impacto de variables meteorológicas, festivos y epidemiológicas.
   - [resultados/saturacion.md](resultados/saturacion.md): Reconstrucción del censo por etapas (`visit_detail`), percentiles de presión histórica y nota sobre estancias extremas.
   - [resultados/intervalos_shap.md](resultados/intervalos_shap.md): Cobertura global 83.2% y explicabilidad local, corrida de cuantiles del 2026-11-03.
   - [resultados/optimizacion.md](resultados/optimizacion.md): Erlang C, Ley de Little, altas tempranas y recomendaciones cuantificadas.
   - [resultados/largo_plazo.md](resultados/largo_plazo.md): Pronóstico agosto–noviembre de 2026 y validación a 120 días.
   - [Informe final](../reports/informe_final.md): Síntesis ejecutiva y técnica alineada con los siete criterios de la rúbrica.

### 4. Gestión del Proyecto
- [sprints/sprint_1.md](sprints/sprint_1.md): Bitácora, compromisos y cierre del Sprint 1 (Extracción, Auditoría, Línea Base y Prototipo).
