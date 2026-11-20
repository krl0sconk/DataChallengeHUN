<div align="center">

<img src="docs/img/banner-mediflow.png" width="100%" alt="MediFlow · Hospital Universidad del Norte · Data Challenge HUN 2026">

# MediFlow

**Pronóstico de demanda y planificación de turnos para el Hospital Universidad del Norte.**

[![180 pruebas aprobadas](https://img.shields.io/badge/pytest-180%20pruebas%20aprobadas-006A63?style=flat-square)](tests/)
[![Backtest de Urgencias: 91,6 % de exactitud, WAPE 8,4 %](https://img.shields.io/badge/Backtest%20Urgencias-91.6%25%20exactitud%20%7C%20WAPE%208.4%25-006A63?style=flat-square)](reports/informe_mediflow_ieee.pdf)
![Python y LightGBM](https://img.shields.io/badge/ML-Python%20%2B%20LightGBM-163D50?style=flat-square)
![FastAPI y React](https://img.shields.io/badge/Web-FastAPI%20%2B%20React-163D50?style=flat-square)
![Power BI](https://img.shields.io/badge/BI-Power%20BI-163D50?style=flat-square)

[![Informe Final (PDF IEEE)](https://img.shields.io/badge/Informe%20Final%20(PDF)-0B2532?style=for-the-badge)](reports/informe_mediflow_ieee.pdf)
[![Dashboard Power BI](https://img.shields.io/badge/Dashboard%20Power%20BI-F0CA62?style=for-the-badge)][powerbi]
[![App Web](https://img.shields.io/badge/App%20Web-006A63?style=for-the-badge)](#aplicación-web)

</div>

## Entregables oficiales

MediFlow ayuda al personal del hospital a anticipar la afluencia de pacientes, identificar dónde se acumula la presión y comparar opciones para el próximo turno. El semáforo, el simulador y el asistente presentan la información en español claro.

| Entregable | Qué incluye |
|---|---|
| [Dashboard Power BI][powerbi] · [Proyecto PBIP][pbip] | Demanda, saturación, esperas y flujo asistencial. |
| [App Web](#aplicación-web) | Pronósticos por servicio, simulador de turnos y asistente. |
| [Informe final (PDF IEEE)](reports/informe_mediflow_ieee.pdf) | Metodología, resultados, validación y recomendaciones (20 páginas). |
| [Código](src/) · [Pruebas](tests/) | Extracción, procesamiento, modelos y validación automatizada. |

## Demo de la app

![Recorrido animado por el pronóstico, el simulador, los cuellos de botella y la precisión histórica en MediFlow](docs/img/app/mediflow_demo.gif)

Capturas de la app. La imagen del simulador reúne tres secciones de la misma vista.

| Pronóstico de demanda | Simulador y optimización |
|---|---|
| [![Tarjetas de demanda, semáforo, pronóstico y radar de presión por servicio](docs/img/app/dashboard_pronostico.png)](docs/img/app/dashboard_pronostico.png) | [![Escenarios por turno con Erlang C, Ley de Little, altas tempranas y factores de demanda](docs/img/app/simulador_optimizacion.png)](docs/img/app/simulador_optimizacion.png) |
| **Cuellos de botella** | **Precisión del modelo** |
| [![Medidores de demanda y censo, mapa de calor de turnos y demoras por etapa](docs/img/app/cuellos_botella.png)](docs/img/app/cuellos_botella.png) | [![Validación histórica de Urgencias con el asistente MediFlow abierto](docs/img/app/precision_asistente.png)](docs/img/app/precision_asistente.png) |

### Resultados del proyecto

[![Error de pronóstico diario: 18,0 % → 15,6 % → 10,5 %. Horas rojas en la simulación de altas tempranas: 9,32 % → 6,26 %.](docs/img/resumen_escalera_optimizacion.png)](reports/informe_mediflow_ieee.pdf)

## Instalación y uso

### Python y pruebas

Desde la raíz del repositorio, con **Python 3.11+**. La app usa el bundle incluido y no requiere acceso a los datos del hospital:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
pytest -q
```

Las correcciones se verifican con **180 pruebas Python y 3 pruebas del contrato frontend**.
Para estas últimas: `node --test app/src/lib/optimizationPayload.test.js`.

### Aplicación web

**Terminal 1 · FastAPI**

```bash
source .venv/bin/activate
HUN_MODO_PRODUCCION=1 HUN_BUNDLE_PATH=models/modelos_web_bundle.joblib \
  uvicorn app.api:app --port 8000
```

**Terminal 2 · React y Vite** (Node.js 22.12+)

```bash
npm --prefix app ci
npm --prefix app run dev
```

Abre `http://localhost:5173` para usar MediFlow y `http://localhost:8000/docs` para explorar la API.
El asistente conversacional requiere una clave propia `ANTHROPIC_API_KEY` en el entorno de la API.

### Power BI

Abre el [tablero publicado][powerbi] en el navegador. El [proyecto PBIP][pbip] contiene la definición sin datos; consulta la [guía de Power BI](dashboards/README.md) para conectarlo a agregados autorizados.

### Estructura del repositorio

```text
.
├── app/                  API FastAPI y frontend React
├── dashboards/powerbi/   Proyecto PBIP y preparación de datos
├── docs/                 Guía del asistente y recursos visuales
├── models/               Bundle del modelo para la app
├── notebooks/            Exploración y experimentos
├── reports/              Informe final y figuras
├── src/                  Extracción, variables y modelos
└── tests/                Pruebas automatizadas
```

## Índice documental

- [Informe final (PDF IEEE)](reports/informe_mediflow_ieee.pdf): metodología, resultados y recomendaciones.
- [Guía de Power BI](dashboards/README.md): tablero público y proyecto PBIP.
- [Guía del asistente](docs/guia_chatbot.md): contexto operativo usado por la app.

[powerbi]: https://app.powerbi.com/view?r=eyJrIjoiYjU3YTBhMWItNTM5Mi00NDk4LTlkNmEtMmFmMzA2MzJjZjQ4IiwidCI6ImJhYjBiNjc5LWJkNWYtNGZlOC1iNTE2LWM2YjhiMzE3Yzc4MiIsImMiOjR9
[pbip]: dashboards/powerbi/HUN_CuellosBotella/HUN_CuellosBotella.pbip
