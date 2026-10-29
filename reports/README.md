# reports/

Informes, presentaciones ejecutivas y material gráfico para las entregas del Data Challenge HUN 2026.

## `reports/figures/`

Figuras exportadas a partir de notebooks y pipelines analíticos para uso en informes, presentaciones y documentación.

> [!CAUTION]
> **Privacidad y cumplimiento:** Toda figura exportada contiene **estrictamente datos agregados o distribuciones estadísticas**. Nunca se generan ni versionan gráficas con identificadores o valores a nivel de paciente individual. Archivos de imagen superiores a 1 MB son filtrados por hooks de `pre-commit`.

### Subdirectorio `exploracion/`
Figuras generadas por `notebooks/01_exploracion/01_exploracion_jn_flujo.ipynb`:
- `01_llegadas_dia_hora.png`: Mapa de calor de llegadas por día de la semana y hora del día (evidencia el pico matutino 8:00–11:00 am).
- `02_tendencia.png`: Serie temporal y tendencia mensual de volumen de visitas por tipo de servicio (2023–2026).
- `03_duracion_etapas_franja.png`: Distribución de tiempos de permanencia en etapas clínicas según franja de ingreso.
- `04_censo_etapas.png`: Dinámica del censo concurrente por etapa en urgencias y observación.
