# Informe LaTeX — MediFlow

Proyecto fuente y compilación final del informe técnico **MediFlow** en formato **APA 7** sobre el corte verificado `803c1a1f866a978cce8b4622269ccfb4749ba59e`.

## Entorno y motores verificados

- **Compilador LaTeX:** `LuaHBTeX 1.24.0` (MiKTeX), sin `--shell-escape`.
- **Procesador bibliográfico:** `Biber 2.21` con `biblatex` (`style=apa`, mapeo `spanish-apa`, ordenación de citas APA).
- **Tipografía y diseño:** `Times New Roman` 12 pt, `Consolas` escalada en código inline/bloques, papel carta (`letterpaper`), márgenes de 2,54 cm, doble espaciado, alineación izquierda (`\RaggedRight`), sangría inicial de 1,27 cm, numeración superior derecha desde la página 1, encabezados APA sin numeración automática y sin tabla de contenido automática.

## Comandos de compilación (PowerShell)

En Windows con MiKTeX, `biber.exe` (empaquetado con `PAR::Packer`) puede bloquearse en la caché temporal predeterminada si quedó un archivo `inc.lock` o durante el primer desempaquetado (en la estación verificada, la extracción inicial tardó ~144 s sobre 4.275 archivos). Asignar `PAR_GLOBAL_TEMP` y `PAR_TEMP` a un directorio limpio resuelve el bloqueo y permite ejecuciones posteriores de Biber en pocos segundos (~3–9 s en caliente).

```powershell
cd reports/informe_latex

$env:PAR_GLOBAL_TEMP = Join-Path $env:TEMP "par_mediflow_ready"
$env:PAR_TEMP = $env:PAR_GLOBAL_TEMP
New-Item -ItemType Directory -Force -Path $env:PAR_GLOBAL_TEMP | Out-Null

lualatex -interaction=nonstopmode -halt-on-error -jobname=informe_mediflow main.tex
biber informe_mediflow
lualatex -interaction=nonstopmode -halt-on-error -jobname=informe_mediflow main.tex
lualatex -interaction=nonstopmode -halt-on-error -jobname=informe_mediflow main.tex
```

La primera corrida en frío de `biber --version` en un directorio `PAR_GLOBAL_TEMP` vacío requiere esperar a que concluya el desempaquetado completo del ejecutable antes de lanzar la secuencia en caliente.

## Estructura de entregables

- `main.tex`: preámbulo APA 7, configuración Tipográfica/LuaLaTeX, `siunitx` (`group-digits = integer`), `biblatex-apa` y ensamblado maestro.
- `referencias.bib`: 24 referencias verificadas (17 del paquete preparatorio normalizadas para `biblatex-apa` más 7 fuentes internas del repositorio versionado).
- `informe_mediflow.pdf`: PDF final compilado (61 páginas, `3.281.568` bytes).
- `VERIFICACION.md`: registro completo de auditoría estática, compilación y revisión visual página por página.
- `secciones/`:
  - `00_portada_resumen.tex` (portada adaptada APA 7 con fecha documental 19 de noviembre de 2026 y resumen)
  - `01_introduccion.tex` (contexto, objetivos y correspondencia con criterios oficiales)
  - `02_datos_flujo.tex` (OMOP CDM v5.4, cortes diferenciados, visitas frente a etapas y balance horario)
  - `03_calidad_externos.tex` (auditoría de nulos, duplicados, calendario, recorte $p_{99{,}9}$ y protocolo de externos)
  - `04_metodo_validacion.tex` (validación *walk-forward*, política anti-fuga, Poisson, LightGBM, cuantiles y SHAP)
  - `05_resultados_predictivos.tex` (experimento Poisson, artefacto cuantílico `v2.0`, intervalos del 3-nov y largo plazo)
  - `06_optimizacion.tex` (Erlang C paramétrico, contraste de Ley de Little, altas tempranas y acoplamiento Etapa 1)
  - `07_integracion_visualizacion.tex` (arquitectura en TikZ, API FastAPI de 15 rutas, `/api/chat`, PBIP y capturas)
  - `08_ingenieria_reproducibilidad.tex` (estructura real, dependencias, niveles de reproducción y privacidad SQL/Git)
  - `09_discusion_recomendaciones.tex` (discusión operacional, matriz de capacidades `v2.0`/`v2.1`, `REC-01` a `REC-05` y límites)
  - `10_conclusiones.tex` (síntesis defendible y hoja de ruta en 5 prioridades)
  - `11_anexos.tex` (Anexo A: matriz `E01`–`E29` y log editorial; Anexo B: 26 pliegues, horizonte, largo plazo, Erlang C completo y 12 cortes de balance; Anexo C: 15 endpoints HTTP, 24 SQL y PBIP; Anexo D: comandos de verificación)
- `figuras/`: 8 gráficos PNG autorizados verificados por SHA-256:
  - `01_llegadas_dia_hora.png`
  - `02_tendencia.png`
  - `03_duracion_etapas_franja.png`
  - `resumen_escalera_optimizacion.png`
  - `cuellos_botella.png`
  - `precision_asistente.png`
  - `simulador_optimizacion.png`
  - `dashboard_pronostico.png`

## Figuras excluidas por decisión aprobada

- `04_censo_etapas.png`: excluida del documento por corresponder a una versión previa al filtro $p_{99{,}9}$ vigente (cuyas cifras se reportan en la tabla depurada de saturación por etapa).
- `mediflow_demo.gif`: excluida por ser animación GIF incompatible con PDF estático (documentada únicamente como evidencia archivada).
