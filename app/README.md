# app/

Aplicación web oficial (Vite + React + Tailwind CSS) para el **Hospital Universidad del Norte (HUN)** · Data Challenge 2026.

Líder de desarrollo web: **Daniel**.

---

## 🚀 Cómo ejecutar la aplicación

Desde la raíz del repositorio:

```bash
cd app
npm install     # Solo la primera vez
npm run dev     # Inicia el servidor de desarrollo
```

Abre en tu navegador: **http://localhost:5173**

---

## 🛠️ Estructura interna

```
app/
├── src/
│   ├── App.jsx         # Componente principal con semáforos, gráficos Recharts y simulador
│   ├── index.css       # Tailwind CSS v4 y tema institucional
│   └── main.jsx        # Punto de entrada de React
├── index.html          # HTML principal
├── package.json        # Dependencias (React, Recharts, Lucide, Tailwind)
├── vite.config.js      # Configuración de compilación ultra-rápida Vite
└── dist/               # Build compilado para producción
```

---

## 📋 Módulos implementados

1. **Panel Operativo & Semáforos de Capacidad**:
   - Monitoreo en tiempo real de Urgencias (`9203`), Rehabilitación (`581479`) y Tratamiento (`3045729`).
   - Alertas dinámicas basadas en los percentiles históricos $p75$ y $p90$.
   - Proyección central ($p50$) y rango de tolerancia ($p10 - p90$).
2. **Curva de Demanda Semanal (7 Días)**:
   - Gráfico de área interactivo con líneas de umbral de saturación.
3. **Simulador "¿Qué pasa si...?" (What-If)**:
   - Controles de lluvia, festivos, quincenas y Carnaval de Barranquilla con recálculo instantáneo (0ms latencia).
   - Descomposición visual de factores causales (SHAP).
4. **Metodología y Reglas de Privacidad OMOP**:
   - Garantía de que no se exponen ni consultan datos individuales de pacientes.
