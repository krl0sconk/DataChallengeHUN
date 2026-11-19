# Data Challenge HUN 2026 · Predicción de flujo de pacientes

Proyecto del equipo para el **Data Challenge HUN 2026** del **Hospital Universidad del Norte (HUN)**.

> [!CAUTION]
> **Los datos del hospital son CONFIDENCIALES y NUNCA se suben a GitHub.**
> Esto incluye archivos crudos, procesados, exportaciones de Excel/CSV y artefactos con datos de pacientes,
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

## Equipo y trabajo iterativo

El equipo organiza tareas y revisiones por sprints, con entregas incrementales de datos, modelos e interfaz; no se presupone una cadencia semanal fija.

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
│       ├── models/       # demanda, saturación, optimización, explicabilidad y validación
│       └── visualization/# utilidades de visualización y reportes
├── models/               # artefactos locales de modelos
├── app/                  # aplicación web (React + Vite) y backend FastAPI (`app/api/`)
├── dashboards/powerbi/   # plantillas .pbit (sin datos)
├── reports/figures/      # figuras generadas para informes
├── docs/                 # documentación, auditorías, hallazgos y bitácora de decisiones
├── tests/                # 156 pruebas unitarias y de integración con pytest
└── .github/              # plantillas de PR e issues
```

## Instalación del entorno

Requisitos: **Python 3.11 o superior**, Node.js 18+ y Git.

```bash
git clone https://github.com/krl0sconk/DataChallengeHUN.git
cd DataChallengeHUN

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

# 5. Verificar suite de tests (156 pruebas)
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

df = pd.read_parquet(config.RAW_DIR / "entradas_por_hora.parquet")
```

## Documentación

- [Informe final — Equipo MediFlow](reports/informe_final.md): metodología, resultados, limitaciones y recomendaciones, organizados por los siete criterios de evaluación.
- [Optimización operacional](docs/resultados/optimizacion.md): Erlang C, Ley de Little y simulación horaria de altas tempranas. El módulo `src/hun/models/optimizacion.py` se consume mediante `GET /api/optimizacion` y `POST /api/optimizacion/simular` (admite `modo_demanda: "historico" | "pronostico"`).

### Reproducción rápida del modo pronóstico en Erlang C (`HUN_MODO_PRODUCCION=1`)

El bundle v2.0 real (`models/modelos_web_bundle.joblib`) no incluye perfiles horarios por corte, por lo que en modo pronóstico informa «Pronóstico por franja no disponible» y mantiene operativo el modo histórico. Con un bundle v2.1 regenerado con datos autorizados (`python -m hun.models.empaquetar`) o un paquete sintético temporal en pruebas:

```bash
# Ejemplo sintético en modo estricto sin tocar data/
python -c "import tempfile, joblib; from pathlib import Path; from fastapi.testclient import TestClient; from hun.models import empaquetar, predict; import os; p=Path(tempfile.gettempdir())/'bundle_v21.joblib'; b=empaquetar.construir_paquete_sintetico_prueba(); joblib.dump(b, p); os.environ['HUN_MODO_PRODUCCION']='1'; os.environ['HUN_BUNDLE_PATH']=str(p); predict.limpiar_cache_modelo(); from app.api import app; c=TestClient(app); f=next(x['fecha'] for x in b['comparacion_real']['urgencias']['serie'] if x.get('origen')); print(c.post('/api/optimizacion/simular', json={'servicio':'urgencias','modo_demanda':'pronostico','fecha':f}).json()['reconciliacion'])"
```
- [Modelo de demanda](docs/resultados/modelo_demanda.md): WAPE diario 18.0% en la línea base, 15.6% en Poisson estratificado y 10.5% en `lgbm_final` (mejora relativa de 41.6% frente a la base).

## Despliegue

El frontend no contiene una URL fija de la API. En desarrollo usa el proxy de Vite (`app/vite.config.js`); en producción se configura la variable pública:

```env
VITE_API_URL=https://<url-publica-de-la-api>
```

Para construir el frontend:

```bash
cd app
npm ci
npm run build
```

La carpeta `app/dist/` es el artefacto estático que debe publicar el proveedor web. La API debe arrancar con:

```bash
export HUN_MODO_PRODUCCION=1
export HUN_BUNDLE_PATH=models/modelos_web_bundle.joblib
export ALLOWED_ORIGINS=https://mediflow.example.org
uvicorn app.api:app --host 0.0.0.0 --port ${PORT:-8000}
```

`ALLOWED_ORIGINS` admite orígenes del frontend separados por comas; reemplazar el dominio ilustrativo por el real. Si se omite, CORS permite los orígenes locales de desarrollo. El bundle autorizado contiene modelos y agregados, no registros individuales; en modo estricto su ausencia produce un error y no activa datos sintéticos.

Antes de publicar, verificar que el despliegue incluya únicamente el paquete del modelo autorizado y no copie `data/`, archivos `.parquet`, CSV hospitalarios, `.env` ni credenciales. La URL pública del frontend y de la API se añadirán aquí después de crear el despliegue en el proveedor elegido.

- [AI.md](AI.md): contexto y reglas del proyecto para asistentes de IA.
- [CONTRIBUTING.md](CONTRIBUTING.md): flujo de trabajo (ramas, commits, PR, notebooks).
- [docs/decisiones.md](docs/decisiones.md): bitácora de decisiones técnicas (ADR).
- [docs/calidad_datos.md](docs/calidad_datos.md): reporte de auditoría y calidad de datos (0 días de desplazamiento).
- [docs/hallazgos.md](docs/hallazgos.md): hallazgos operacionales y clínicos preliminares.
- [docs/objetivo_prediccion.md](docs/objetivo_prediccion.md): definición del alcance y servicios modelados.
- [docs/resultados/](docs/resultados/): métricas del modelo de demanda, factores externos, saturación e intervalos SHAP.
- [data/README.md](data/README.md): inventario y manejo de datos.
