# Contrato Modelo–Web (API de Pronóstico y Explicabilidad)

Especificación técnica de la interfaz entre el paquete de modelos (`src/hun/models/`) y la
aplicación web asistencial (`app/`). Toda cifra servida por la API proviene de modelos entrenados
o agregados calculados sobre los datos reales; no hay constantes inventadas en los endpoints.

---

## 1. Modo de Producción y Paquete sin Datos (`HUN_MODO_PRODUCCION=1`)

- **Principio de privacidad:** en producción se despliega únicamente el artefacto del modelo
  (`models/modelos_web_bundle.joblib`), **nunca** las carpetas `data/raw/` ni `data/processed/`.
- **Generación del paquete (en entorno local tras entrenar):**
  ```bash
  python -m hun.models.empaquetar
  ```
- **Activación del modo estricto en el servidor:**
  ```bash
  export HUN_MODO_PRODUCCION=1
  export HUN_BUNDLE_PATH=models/modelos_web_bundle.joblib
  ```
- **Comportamiento:** si `HUN_MODO_PRODUCCION=1` (o `HUN_ENV=production`) y el archivo del paquete
  no existe, la API responde `503 Service Unavailable` con un mensaje explícito y **jamás** intenta
  leer archivos `.parquet` de `data/`.

---

## 2. Función Python Canónica (`hun.models.predict.predecir`)

```python
from datetime import date
from hun.models.predict import predecir

respuesta = predecir(fecha=date(2026, 7, 10), servicio="urgencias")
```

Devuelve siempre un diccionario con:
- `prediccion` (`int`): mediana estimada (`p50`).
- `min` (`int`): límite inferior del intervalo (`p10`, corregido sin cruces).
- `max` (`int`): límite superior del intervalo (`p90`, corregido sin cruces).
- `alerta` (`"verde" | "amarillo" | "rojo"`): semáforo según los percentiles históricos `p75` y `p90` del servicio.
- `factores` (`list[tuple[str, float]]`): aportes SHAP en número de visitas ordenados de mayor a menor magnitud.

---

## 3. Endpoints HTTP (`app/api/`)

### 3.1 Predicción Operativa (1 a 30 días)

- `POST /api/predecir` — Predicción puntual para `{ "fecha": "YYYY-MM-DD", "servicio": "urgencias" }`.
- `POST /api/predecir-rango` — Serie diaria consecutiva para `{ "fecha_inicio": "YYYY-MM-DD", "dias": 7, "servicio": "urgencias" }`.

### 3.2 Comparación con lo Real y Exactitud Walk-Forward

- `GET /api/comparacion/{servicio}?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD`
- **Qué devuelve:** evaluación walk-forward fuera de muestra sobre las fechas pasadas del servicio:
  - `servicio`, `nombre`
  - `exactitud` (`1 − WAPE`), `exactitud_pct`, `wape`, `mae`, `rmse`, `sesgo`, `cobertura`, `n_dias`
  - `exactitud_semanal`, `techo_diario_poisson`, `techo_semanal_poisson` (clave para explicar servicios de bajo volumen como Tratamiento Urgencias)
  - `serie`: lista de `{ "fecha", "real", "prediccion", "min", "max", "es_festivo" }`

### 3.3 Efecto Promedio Histórico por Evento

- `GET /api/efectos-eventos/{servicio}`
- **Qué devuelve:** impacto histórico observado de cada evento de calendario (`festivos`, `carnaval`,
  `semana_santa`, `vacaciones`, `fin_de_semana`) frente a los días hábiles normales del servicio:
  - `servicio`, `nombre`, `media_diaria_global`, `media_habil_normal`
  - `eventos`: lista de objetos con:
    - `evento`, `etiqueta`, `n_dias`
    - `media_evento`, `media_normal`, `cambio_visitas`, `cambio_pct`
    - `frase`: texto listo para mostrar bajo la gráfica (ej. *"En festivos nacionales, Rehabilitación Ambulatoria baja 99.6 % (-869 visitas/día: promedio 3 vs. 873 normal)."*)

### 3.4 Pronóstico de Largo Plazo (4 Meses · Agosto–Noviembre 2026)

- `GET /api/largo-plazo/{servicio}?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD`
- **Qué devuelve:** proyección sin rezagos cortos (calendario, festivos, tendencia ponderada por
  recencia y clima típico por día del año) con intervalos progresivamente más anchos (`DEC-008`):
  - `servicio`, `nombre`, `horizonte_dias`, `rango_pronostico`
  - `backtest_120d`: `{ "exactitud", "exactitud_pct", "wape", "mae", "sesgo", "cobertura", "n_pliegues", "por_mes_horizonte" }`
  - `resumen_mensual`: lista de `{ "mes", "promedio_diario", "min_diario", "max_diario", "total_mensual" }`
  - `serie`: lista diaria de `{ "fecha", "prediccion", "min", "max", "dia_horizonte", "mes_horizonte", "es_festivo" }`

### 3.5 Turnos, Ocupación e Indicadores de Cuellos de Botella

- `GET /api/servicios` — Catálogo de servicios con media diaria y umbrales `p75`/`p90`.
- `GET /api/turnos/{servicio}` — Matriz 4×7 de afluencia por franja horaria y día de la semana.
- `GET /api/ocupacion` — Presión hospitalaria actual por servicio.
- `GET /api/cuellos-botella` — Duraciones (`p50`, `p90`, `p99`) y umbrales de censo por etapa de `visit_detail`.

### 3.6 Optimización Operacional (`/api/optimizacion` y `/api/optimizacion/simular`)

- `GET /api/optimizacion` — Devuelve el paquete precalculado de optimización operacional:
  - `erlang_c`: dotación mínima de equipos equivalentes por franja (`normal`, `p75`, `p90`) y tabla de sensibilidad (`1/μ ∈ {15, 20, 30}` min).
  - `ley_little_camas`: balance `L = λ · W` en `Inpatient Visit (9201)`, escenarios de reducción de estancia (`-2/-4/-6/-8 h`) y simulación horaria real de rondas de alta temprana (`20/35/50 %`).
  - `cuello_urgencias_hospitalizacion`: transición `Treatment urgency (3045729) → Inpatient Visit (9201)` (`p50`, `p90` mensual ponderado y correlación mensual con censo).
  - `recomendaciones`: 5 recomendaciones operacionales cuantificadas (`REC-01`..`REC-05`).
- `POST /api/optimizacion/simular` — Recalcula escenarios interactivos para `{ "servicio", "tiempo_servicio_min", "meta_espera_min", "reduccion_estancia_horas", "pct_altas_tempranas" }`. Admite además los campos opcionales `"modo_demanda"` (`"historico"` | `"pronostico"`, por defecto `"historico"`), `"fecha"` (`YYYY-MM-DD`, obligatoria si `modo_demanda="pronostico"`) y `"dotacion_referencia"` (entero opcional `>= 1`). En modo `"historico"` sin campos nuevos conserva exactamente el contrato original; en modo `"pronostico"` devuelve `disponible`, `motivo_no_disponible`, `tipo_evaluacion` (`"fuera_de_muestra"` | `"retrospectivo"`), `origen_pronostico`, `demanda_diaria_pronosticada`, `umbrales_historicos`, `metricas_modelo_cuantilico`, `perfil_horario`, `reconciliacion` y `erlang_c_franjas`, manteniendo separados los escenarios históricos de estancia y altas tempranas.
- **CORS en despliegue:** configurar la variable de entorno `ALLOWED_ORIGINS` (lista separada por comas) en el servidor FastAPI; si no se define, permite orígenes locales de desarrollo (`localhost:5173`, `127.0.0.1:5173`, `localhost:3000`).

### 3.7 Asistente Clínico Operativo (`/api/chat`)

- `POST /api/chat`
- **Entrada:**
  ```json
  {
    "mensaje": "¿Por qué hay alerta roja en urgencias el lunes?",
    "estado_pantalla": {
      "servicio": "urgencias",
      "fecha": "2026-07-10",
      "prediccion": 462,
      "intervalo": [342, 592],
      "alerta": "rojo",
      "factores": [
        { "nombre": "Festivo", "aporte": 8.0 }
      ]
    }
  }
  ```
- **Salida:**
  ```json
  {
    "respuesta": "Texto conciso (~150 palabras) con análisis asistencial y recomendación operativa.",
    "herramientas_usadas": ["predecir", "efecto_promedio_evento"],
    "proveedor": "claude-haiku-5-5 | fallback"
  }
  ```
- **Garantías de seguridad y confidencialidad:**
  - El chatbot **nunca accede a registros individuales ni datos de pacientes**; solo consume funciones de agregados y salidas del modelo (`predecir`, `predecir_rango`, `simular_escenario`, `efecto_promedio_evento`, `indicadores_cuellos_botella`, `recomendaciones_optimizacion`).
  - Rate limit de 20 consultas/minuto por cliente y tiempo de espera máximo de 12 segundos.
  - Modo de contingencia (*fallback*) determinista offline si no hay conexión a la API externa.
