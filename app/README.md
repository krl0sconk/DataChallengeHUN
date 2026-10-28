# app/

Aplicación web oficial (Vite + React + Tailwind CSS + FastAPI) para el **Hospital Universidad del Norte (HUN)** · Data Challenge 2026.

Líder de desarrollo web: **Daniel**.

---

## 🚀 Cómo ejecutar la aplicación completa

Tienes dos opciones para ejecutar la aplicación:

### Opción A: Una sola terminal (PowerShell en Windows)
Ejecuta ambos procesos concurrentemente en segundo plano o combinados:

```powershell
# En la raíz del repositorio:
Start-Process powershell -ArgumentList "-NoExit", "-Command", "uvicorn app.api:app --reload --port 8000" ; npm --prefix app run dev
```

O si prefieres ejecutar ambos comandos secuencialmente/en paralelo mediante scripts estándar de Node, instala `concurrently` o corre la Opción B.

### Opción B: Dos terminales (Recomendada para desarrollo)

**Terminal 1 — Backend FastAPI:**
```powershell
# Desde la raíz del repositorio:
uvicorn app.api:app --reload --port 8000
```
*API disponible en:* `http://localhost:8000` (Swagger docs en `http://localhost:8000/docs`)

**Terminal 2 — Frontend React (Vite):**
```powershell
cd app
npm install     # Solo la primera vez
npm run dev
```
*Frontend disponible en:* `http://localhost:5173`

> [!NOTE]
> Si el backend FastAPI no está corriendo, la aplicación web pasa de forma automática y transparente a modo fallback local garantizando 100% de operatividad y fidelidad al modelo canónico.

---

## 🛠️ Estructura interna

```
app/
├── api/                # Backend FastAPI desacoplado que consume src/hun/models/predict.py
│   ├── __init__.py     # Definición de endpoints FastAPI y CORS
│   └── main.py         # Punto de entrada alternativo (app.api:app o app.api.main:app)
├── src/
│   ├── components/     # Componentes modulares (StatCardGrid, DemandaChart, FactoresBreakdown, etc.)
│   ├── data/           # Configuración canónica y notebook estático verificado
│   ├── App.jsx         # Componente principal con semáforos, Recharts y pestañas
│   ├── index.css       # Tailwind CSS v4 y tema institucional
│   └── main.jsx        # Punto de entrada de React
├── index.html          # HTML principal
├── package.json        # Dependencias (React, Recharts, Lucide, Tailwind)
├── vite.config.js      # Configuración de compilación Vite
└── dist/               # Build compilado para producción
```

---

## 📋 Módulos implementados

1. **Panel Operativo & Semáforos de Capacidad**:
   - Monitoreo y pronóstico de demanda de Urgencias (`9203`), Rehabilitación (`581479`) y Tratamiento (`3045729`).
   - Alertas dinámicas basadas en los percentiles históricos $p75$ y $p90$ de cada servicio.
   - Proyección central ($p50$) y rango de tolerancia ($p10 - p90$).
2. **Curva de Demanda Temporal (Horizonte de 3 a 14 Días)**:
   - Gráfico de área interactivo con líneas de umbral histórico ($p75$ y $p90$) y bandas de incertidumbre.
3. **Descomposición de Factores y Estacionalidad**:
   - Vista de desglose que refleja el impacto de efectos de calendario (efecto lunes, fin de semana, quincena) según el modelo de Machine Learning.
4. **Análisis de Flujo (Notebook Exploratorio)**:
   - Visualización de hallazgos sobre el inventario OMOP CDM verificado y celdas de código reproducibles.
5. **Metodología y Reglas de Privacidad OMOP**:
   - Garantía de que no se exponen ni consultan datos individuales de pacientes.
