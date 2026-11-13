# Data Challenge HUN 2026 · Predicción de flujo de pacientes

Proyecto del equipo para el **Data Challenge HUN 2026** del **Hospital Universidad del Norte (HUN)**.

> [!CAUTION]
> **Los datos del hospital son CONFIDENCIALES y NUNCA se suben a GitHub.**
> Esto incluye archivos crudos, procesados, exportaciones de Excel/CSV, modelos entrenados con esos datos,
> archivos `.pbix` y notebooks con salidas. Los datos se comparten solo por el canal privado que indique el hospital.
> El `.gitignore` y los hooks de `pre-commit` ayudan, pero **la responsabilidad final es de cada integrante**:
> revisa `git status` antes de cada commit.

## El reto

Predecir el **flujo de pacientes** del hospital combinando variables internas (llegadas, servicios, tiempos de atención)
con factores externos (clima, festivos, temporadas escolares y epidemiológicas), e identificar **cuellos de botella**.

## Objetivo

1. Construir un modelo predictivo de la demanda/llegada de pacientes.
2. Enriquecerlo con datos externos que expliquen la variación.
3. Presentar los resultados de forma **interactiva y fácil de entender para el personal del hospital**,
   mediante una aplicación web y un dashboard en Power BI.

## Equipo (Scrum, sprints de 1 semana)

| Integrante | Rol |
|---|---|
| **Krlos** | Modelo predictivo, datos externos (clima, temporada), GitHub y documentación |
| **Daniel** | Desarrollo web (líder) y validación del modelo |
| **Juan** | Preparación y análisis de datos (cuellos de botella), dashboard en Power BI |

## Estructura del repositorio

```
├── data/                 # datos (solo README y .gitkeep se versionan)
│   ├── raw/              # extracciones agregadas de la base (NUNCA se suben)
│   ├── external/         # clima, festivos, temporadas (manuales y cache)
│   ├── interim/          # datos intermedios
│   ├── processed/        # datasets finales y bundle para la web
│   └── externos.parquet  # dataset unificado de factores externos
├── notebooks/            # 01_exploracion, 02_preparacion, 03_modelado
├── src/
│   ├── external/         # descarga y consolidación de datos externos
│   └── hun/              # paquete Python del proyecto
│       ├── config.py     # rutas y parámetros leídos de .env
│       ├── data/         # conexión DB, auditoría, conceptos y agregaciones
│       ├── features/     # ingeniería de variables y rezagos anti-fuga
│       ├── models/       # demanda, saturación, explicabilidad, predict, validación
│       └── visualization/# utilidades de visualización y reportes
├── models/               # artefactos locales de modelos
├── app/                  # aplicación web (React + Vite) y backend FastAPI (`app/api/`)
├── dashboards/powerbi/   # plantillas .pbit (sin datos)
├── reports/figures/      # figuras generadas para informes
├── docs/                 # documentación, auditorías, hallazgos y bitácora de decisiones
├── tests/                # 81 pruebas unitarias y de integración con pytest
└── .github/              # plantillas de PR e issues
```

## Instalación del entorno

Requisitos: **Python 3.11 o superior**, Node.js 18+ y Git.

```bash
git clone https://github.com/<usuario>/data-challenge-hun.git
cd data-challenge-hun

# 1. Entorno virtual Python
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Dependencias y paquete en modo editable
pip install -r requirements.txt
pip install -e .

# 3. Hooks de calidad y protección de datos
pre-commit install

# 4. Variables de entorno
cp .env.example .env               # Windows: copy .env.example .env

# 5. Verificar suite de tests (81 pruebas)
pytest
```

## Ejecución de la aplicación

El proyecto cuenta con un backend FastAPI conectado a los modelos entrenados y una interfaz web moderna en React:

```bash
# Terminal 1: Backend API (FastAPI)
uvicorn app.api:app --reload --port 8000

# Terminal 2: Frontend Web (React + Vite)
cd app
npm install
npm run dev
```

La API estará disponible en `http://localhost:8000/docs` (Swagger UI) y el frontend en `http://localhost:5173`.

Luego, en cualquier notebook o script de Python:

```python
from hun import config
import pandas as pd

df = pd.read_parquet(config.RAW_DIR / "02_flujo_horario_urgencias.parquet")
```

## Documentación

- [AI.md](AI.md): contexto y reglas del proyecto para asistentes de IA.
- [CONTRIBUTING.md](CONTRIBUTING.md): flujo de trabajo (ramas, commits, PR, notebooks).
- [docs/decisiones.md](docs/decisiones.md): bitácora de decisiones técnicas (ADR).
- [docs/calidad_datos.md](docs/calidad_datos.md): reporte de auditoría y calidad de datos (0 días de desplazamiento).
- [docs/hallazgos.md](docs/hallazgos.md): hallazgos operacionales y clínicos preliminares.
- [docs/objetivo_prediccion.md](docs/objetivo_prediccion.md): definición del alcance y servicios modelados.
- [docs/resultados/](docs/resultados/): métricas del modelo de demanda, factores externos, saturación e intervalos SHAP.
- [data/README.md](data/README.md): inventario y manejo de datos.
