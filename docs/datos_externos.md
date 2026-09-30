# Datos externos — Data Challenge HUN 2026

Factores externos que pueden explicar la demanda del Hospital Universidad del Norte (HUN): clima, calendario y epidemiología. Todo sale de **un solo pipeline** (`src/external/`) que genera **`data/externos.parquet`**, con **una fila por fecha**, listo para unir con el dataset del hospital:

```python
import pandas as pd

ext = pd.read_parquet("data/externos.parquet")
df = hosp.merge(ext, on="fecha", how="left")  # hosp con columna fecha (datetime, diaria)
```

## Cómo correrlo

```bash
pip install -r requirements-external.txt
python -m src.external.build                    # todo (necesita internet)
python -m src.external.build --solo-calendario  # sin internet
pytest tests/test_external.py -q
```

Si una fuente falla, el build no se cae: deja esas columnas vacías y lo reporta en `data/externos_fuentes.json`. Las descargas se guardan en `data/external/raw/`, que no se sube a Git.

## Estado de esta entrega (29-sep-2026)

| Bloque | Estado | Nota |
|---|---|---|
| Calendario (27 columnas) | ✅ Generado, 2018-01-01 → 2027-12-31 | Incluido en el parquet |
| Clima (Open-Meteo) | ⏳ Código listo y probado con datos simulados | Hay que correr el build con internet, porque el entorno donde se armó bloquea esa API |
| Epidemiología (SIVIGILA) | ⏳ Código listo y probado con datos simulados | Igual que el clima. Revisar los nombres de columnas del primer xlsx real |

Después del primer build con internet, revisar `externos_diccionario.csv` (el % de nulos por columna) y `externos_fuentes.json`.

## Fuentes y decisiones

### 1. Clima — `clima.py`
- **Fuente:** [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) (reanálisis ERA5), gratis y sin API key. Punto: 10.93, -74.80 (Soledad, área metropolitana; el HUN queda en Soledad).
- **Variables:** temperatura máx/mín/media, sensación térmica máx, precipitación y horas de lluvia, humedad relativa media, viento máx y radiación.
- **Derivadas:** lluvia acumulada de 3, 7 y 30 días, día lluvioso (≥1 mm), lluvia fuerte (≥20 mm), tmax media de 7 días, calor extremo (sensación ≥ p90 del mes) y anomalía de temperatura frente a la media del mes.
- **⚠ Fuga de información:** en producción no se conoce el clima observado del futuro. Para predecir t+1..t+7 hay que usar `clima.pronostico()` (Forecast API). En validación hay dos opciones: (a) aceptar el clima observado como "pronóstico perfecto" y decirlo, o (b) usar solo rezagos del clima. **Recomendado: reportar ambas variantes en la ablación.**
- El umbral p90 y la anomalía usan la climatología de todo el periodo. Es una fuga menor; si molesta, se calcula solo con el set de entrenamiento.

### 2. Calendario — `calendario.py` (no necesita internet)
- **Festivos:** librería `holidays` (Colombia, con Ley Emiliani). Ya incluye el festivo nuevo de la **Virgen de Chiquinquirá** (lunes 13-jul-2026), creado por ley sancionada en 2025.
- **Puentes y rebote:** `es_puente` marca bloques no laborales de 3 o más días y `dia_post_festivo` el primer día hábil después (suele haber pico en urgencias).
- **Carnaval de Barranquilla:** de sábado a martes antes del Miércoles de Ceniza (Pascua − 46 días). **Precarnaval:** las ~5 semanas previas (aproximado).
- **Semana Santa:** de Domingo de Ramos a Pascua, calculada con `dateutil.easter`.
- **Vacaciones escolares:** CSV manual `data/external/manual/vacaciones_escolares.csv` (calendario A, colegios oficiales de Barranquilla/Atlántico) con la columna `confianza`:
  - *oficial:* 2024 (Portafolio), 2025 (Gobernación del Atlántico, Res. 4212/2024), 2026 (El Tiempo / El Heraldo).
  - *estimado* (2018–2023, Semana Santa 2024/2026 y 2027): regla basada en las fechas oficiales. Mitad de año = 3 semanas desde el lunes en o después del 21-jun. Receso de octubre = la semana antes del lunes festivo del Día de la Raza. Fin de año = desde el lunes en o después del 6-dic hasta el domingo antes del lunes en o después del 25-ene.
  - **Pendiente:** conseguir las resoluciones de la Secretaría de Educación de Barranquilla de 2018 a 2023 y reemplazar las filas estimadas. `vacaciones_es_estimado` permite medir si la estimación afecta el modelo.
  - Ojo: 2020–2021 tuvo clases virtuales y alternancia, así que "vacaciones" ahí significa poco. Para eso está `fase_covid`.
- **Quincenas:** pago el 15 y el último día del mes; si cae en día no laboral, se corre al hábil anterior. También `dias_desde_pago`, `semana_de_pago` y `es_mes_prima` (junio y diciembre).
- **Temporadas:** lluvias del Caribe (abr–jun y sep–nov), navidad (7-dic a 6-ene).
- **`fase_covid`:** 0 antes del 25-mar-2020, 1 aislamiento obligatorio (hasta 31-ago-2020), 2 emergencia sanitaria (hasta 30-jun-2022), 3 después. Es un cambio estructural: cambia la demanda y puede confundir la estacionalidad.
- Codificación cíclica (sin/cos) del día del año y de la semana, pensada para el Poisson.

### 3. Epidemiología — `epidemiologia.py`
- **Fuente:** microdatos del [Portal SIVIGILA (INS)](https://portalsivigila.ins.gov.co/Paginas/Buscador.aspx), leídos con la API SharePoint de la lista "Microdatos", la misma que usa el paquete R [`sivirep`](https://github.com/epiverse-trace/sivirep).
- **Eventos:** dengue (210, 220, 580) e IRAG (345 centinela y 348 inusitado). La **IRA colectiva (995) no viene en microdatos individuales**.
- **Zona:** área metropolitana (Barranquilla 08001, Soledad 08758, Malambo 08433, Puerto Colombia 08573 y Galapa 08296), por municipio de **residencia** (o de ocurrencia si falta), y todo el Atlántico (08).
- **Serie:** casos por **semana epidemiológica** de notificación (domingo a sábado, convención INS/MMWR). A cada día se le asigna el valor de su semana.
- **Rezagos anti-fuga:** solo se exportan `lag2s` y `lag3s`, es decir, la semana epi de hace 2 y 3 semanas. Columnas: `epi_{dengue|irag}_{area_metro|atlantico}_lag{2|3}s`.
- **Limitación:** el INS publica microdatos de **años cerrados**, así que el periodo más reciente queda en NaN, no en 0. LightGBM maneja los NaN. En producción se puede alimentar con el Boletín Epidemiológico Semanal.

## Regla del equipo: un factor externo se queda solo si aporta
Antes de dejar cualquier bloque en el modelo final hay que hacer cuatro pruebas:
1. **Ablación:** modelo sin externos vs. + calendario vs. + clima vs. + epi, con validación walk-forward.
2. **Control de estacionalidad:** el baseline ya debe tener día de semana, mes y sin/cos. El externo tiene que mejorar *sobre eso*.
3. **Placebo:** barajar la serie externa dentro de cada año o mes. Si el "aporte" se mantiene, es ruido o sesgo.
4. **Estabilidad:** el aporte debe repetirse en varias ventanas temporales, no solo en una.

## Archivos

```
src/external/
  config.py          rango, coordenadas, eventos, municipios, rezagos
  calendario.py      festivos, carnaval, semana santa, vacaciones, quincenas, covid
  clima.py           Open-Meteo histórico + pronóstico + features derivadas
  epidemiologia.py   SIVIGILA: descarga, conteo semanal, rezagos
  build.py           orquesta todo → data/externos.parquet
data/
  externos.parquet             salida (una fila por fecha)
  externos_diccionario.csv     columna, tipo, fuente, descripción, % nulos
  externos_fuentes.json        estado de cada fuente en el último build
  external/manual/vacaciones_escolares.csv
  external/raw/                caché de descargas (ignorado por git)
tests/test_external.py
```
