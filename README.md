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
│   ├── raw/              # datos originales del hospital (NUNCA se suben)
│   ├── external/         # clima, festivos, temporadas
│   ├── interim/          # datos en limpieza
│   └── processed/        # datasets finales para el modelo
├── notebooks/            # 01_exploracion, 02_preparacion, 03_modelado
├── src/hun/              # paquete Python del proyecto
│   ├── config.py         # rutas y parámetros leídos de .env
│   ├── data/             # carga y limpieza
│   ├── external/         # descarga de datos externos
│   ├── features/         # ingeniería de variables
│   ├── models/           # entrenamiento, predicción, evaluación
│   └── visualization/    # gráficas con Plotly
├── models/               # artefactos entrenados (no se suben)
├── app/                  # aplicación web
├── dashboards/powerbi/   # plantillas .pbit (sin datos)
├── reports/figures/      # figuras para informes
├── docs/                 # documentación y bitácora de decisiones
├── tests/                # pruebas con pytest
└── .github/              # plantillas de PR e issues
```

## Instalación del entorno

Requisitos: **Python 3.11 o superior** y Git.

```bash
git clone https://github.com/<usuario>/data-challenge-hun.git
cd data-challenge-hun

# 1. Entorno virtual
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Dependencias y paquete en modo editable
pip install -r requirements.txt
pip install -e .

# 3. Hooks de calidad y protección de datos
pre-commit install

# 4. Variables de entorno
cp .env.example .env               # Windows: copy .env.example .env

# 5. Verificar
pytest
```

Luego, en cualquier notebook o script:

```python
from hun import config
import pandas as pd

df = pd.read_csv(config.RAW_DIR / "archivo.csv")
```

## Documentación

- [CONTRIBUTING.md](CONTRIBUTING.md): flujo de trabajo (ramas, commits, PR, notebooks).
- [docs/decisiones.md](docs/decisiones.md): bitácora de decisiones técnicas.
- [data/README.md](data/README.md): organización y manejo de los datos.
