# Protocolo de evaluación de factores externos

- **Estado:** definido (Sprint 1). Se ejecuta en el Sprint 2 con los datos reales.
- **Responsable:** Krlos · valida Daniel.
- **Código:** `src/hun/models/evaluacion_factores.py` · pruebas en `tests/test_modelo_base.py`.

## El problema

Agregar clima, festivos o dengue al modelo casi siempre "mejora" un poco el error en los datos con los que
se prueba. Eso no prueba nada: puede ser azar, puede ser que el factor solo esté marcando la temporada
del año (octubre llueve y octubre tiene más consultas por otras razones), o puede ser sobreajuste.
Un jurado de un hospital va a preguntar "¿de verdad la lluvia aumenta las urgencias?". Este protocolo es
cómo respondemos con evidencia.

## Qué se evalúa: grupos, no columnas

Los factores se aceptan o descartan **en bloque**, por grupo. Evaluar 40 columnas una por una garantiza
que alguna pase por casualidad.

| Grupo | Columnas de `externos.parquet` | Placebo |
|---|---|---|
| Festivos y puentes | `es_festivo`, `es_puente`, `es_dia_no_laboral`, `dia_post_festivo`, `dias_a/desde_festivo` | corridos 7 días |
| Carnaval y Semana Santa | `es_carnaval`, `es_precarnaval`, `es_semana_santa`, `dias_a/desde_carnaval` | corridos 7 días |
| Vacaciones escolares | `es_vacaciones_escolares`, `temporada_navidad` | corridos 14 días |
| Quincena y primas | `es_dia_pago`, `dias_desde_pago`, `semana_de_pago`, `es_mes_prima` | corridos 7 días |
| Clima | todas las `clima_*` | valores de hace 364 días |
| Epidemiología | todas las `epi_*` (ya vienen rezagadas 2–3 semanas) | valores de hace 364 días |

## El modelo de comparación

- **Sin factores (base):** rezagos de 7, 14, 21 y 28 días del mismo día (su promedio es la línea base),
  día de la semana, mes, ciclo anual (seno y coseno del día del año), fin de semana y el tipo de visita.
  Esto ya captura toda la estacionalidad: semanal, mensual y anual.
- **Con factores:** lo mismo + las columnas del grupo.
- **Algoritmo:** gradient boosting con pérdida Poisson (scikit-learn). Es intercambiable: cuando exista el
  modelo principal (LightGBM), el protocolo se corre con él.
- Los rezagos de 7+ días son seguros para horizontes de hasta 7 días: nunca usan información posterior
  al momento de la predicción.

## Las cuatro pruebas

Todas sobre los **mismos pliegues walk-forward** (orígenes cada 14 días durante el último año de datos,
7 días de prueba), con WAPE como métrica. Mejora relativa por pliegue = (WAPE sin − WAPE con) / WAPE sin.

| # | Prueba | Pregunta | Cómo |
|---|---|---|---|
| 1 | **Ablación** | ¿El grupo reduce el error fuera de muestra? | Mediana de la mejora relativa entre pliegues |
| 2 | **Control de estacionalidad** | ¿Aporta algo que el calendario no explique? | El modelo base ya tiene mes, día de la semana y ciclo anual: la ablación mide solo lo que el factor agrega encima |
| 3 | **Placebo** | ¿Importa la fecha exacta del factor o solo su forma/temporada? | Mismo grupo desplazado en el tiempo. Conserva distribución y estacionalidad, pero rompe la relación con el día real |
| 4 | **Estabilidad** | ¿Ayuda casi siempre o solo en un par de pliegues? | Fracción de pliegues con mejora + prueba de signo |

## Regla de decisión (propuesta, a confirmar con Daniel)

Un grupo **se acepta** solo si cumple las cuatro:

1. Mediana de la mejora relativa ≥ **1 %**.
2. Mejora en ≥ **70 %** de los pliegues.
3. Prueba de signo unilateral con **p ≤ 0.05** (con 26 pliegues: al menos 18 con mejora).
4. La mejora del placebo es **menos de la mitad** de la mejora real.

Si falla cualquiera, se descarta y el motivo queda escrito. Los umbrales están en la clase `Criterios`.

Un descarte también es un hallazgo: "la lluvia no cambia la demanda de urgencias una vez se controla por
la temporada" es información útil para el hospital.

## Por qué el placebo es indispensable

En la prueba con datos simulados (`test_protocolo_acepta_factor_real_y_descarta_ruido`), una columna de
**ruido puro** logró una mejora mediana del 3.7 %, más que el umbral de la ablación. La descartaron la
prueba de signo (solo mejoraba en 61 % de los pliegues) y el placebo (su versión desplazada "mejoraba" aún
más). Sin esas dos pruebas, habríamos aceptado ruido.

## Uso

```python
import pandas as pd
from hun import config
from hun.data.agregados import serie_llegadas
from hun.models import evaluacion_factores as ef
from hun.models.validacion import pliegues_walk_forward

entradas = pd.read_parquet(config.RAW_DIR / "entradas_por_hora.parquet")
serie = serie_llegadas(entradas, freq="D")
externos = pd.read_parquet(config.DATA_DIR / "externos.parquet")

resultados = ef.evaluar_grupos(serie, externos, pliegues_walk_forward(serie["ts"]))
print(ef.tabla_resultados(resultados))
```

El resultado (solo la tabla agregada) se guarda en `docs/resultados/factores_externos.md` y se documenta
como hallazgo en la bitácora de decisiones.

## Limitaciones conocidas

- Con el clima observado (no pronosticado) la mejora real sale optimista; ver `docs/objetivo_prediccion.md`.
- Si las fechas de la base están desplazadas por la anonimización, todos los factores externos fallarán
  el placebo. Eso hay que detectarlo antes, en la auditoría de calidad.
- Los grupos se evalúan cada uno contra la base, no en combinación. Si dos grupos aceptados resultan
  redundantes (por ejemplo, vacaciones y Navidad), se revisa en el modelo final con SHAP.
