# Registro de verificación — Informe LaTeX MediFlow

- **Fecha de verificación:** 19 de noviembre de 2026
- **Commit base contrastado:** `803c1a1f866a978cce8b4622269ccfb4749ba59e` (`docs/preparacion-informe-latex`)
- **Artefacto web inspeccionado:** `models/modelos_web_bundle.joblib` (`v2.0`, corte exclusivo `2026-07-17`, SHA-256 `be8252b056377f8820808a518095235c1215b6ad5c3466a781bad6a0f0ad1e28`)
- **Motores de compilación:** `LuaHBTeX 1.24.0` (MiKTeX) y `Biber 2.21`, sin `--shell-escape`

## 1. Contraste inicial contra el repositorio

1. Verificación del árbol Git al inicio: `HEAD = 803c1a1f866a978cce8b4622269ccfb4749ba59e`, sin diferencias respecto de la preparación.
2. Integridad del manifiesto `reports/preparacion_latex/06_FUENTES_Y_ARTEFACTO.json`: 38 de 38 fuentes versionadas (SHA-256 y tamaño exacto en bytes) y 9 de 9 archivos gráficos validados en origen.
3. Recolección estática de pruebas Python (`pytest --collect-only -q`): `180 tests collected` comprobados sin ejecutar la suite ni reentrenar modelos.
4. Contradicciones detectadas y tratadas según aprobación editorial:
   - Separación explícita entre experimento puntual LightGBM Poisson (`lgbm_final`, WAPE 10,5 %) y artefacto cuantílico servido `v2.0` (`p10`/`p50`/`p90`, 182 días: 8,91 % / 11,08 % / 42,18 %).
   - Separación explícita de las dos corridas a 120 días (`docs/resultados/largo_plazo.md` del `2026-11-03` frente a `largo_plazo` empaquetado en el bundle `v2.0`).
   - Registro del desfase documental entre `calidad_datos.md` y la regla vigente `p99.9` + `LEFT JOIN` en `16_duracion_etapas_diaria.sql`.
   - Inclusión de `GET /api/parametros` dentro de los 15 endpoints HTTP reales y aclaración sobre rutas obsoletas en `DEC-007` y `tests/README.md`.
   - Exclusión numérica y gráfica de `04_censo_etapas.png` (corrida previa sin recorte `p99.9`) y anotación de integridad visual en `dashboard_pronostico.png` (etiquetas repetidas «Festivo» del 10 al 16 de julio y rótulos superpuestos en largo plazo).

## 2. Auditoría estática de las fuentes LaTeX

- Cobertura de matriz `E01`–`E29`: 29/29 evidencias trazadas mediante comentarios `% evidencia:E##` en `secciones/`.
- Correspondencia bibliográfica (`referencias.bib` vs. `\textcite` / `\parencite`): 24/24 claves citadas y presentes (`0` claves faltantes, `0` entradas sin citar).
- Limpieza de sintaxis Markdown/borrador: `0` acentos graves residuales, `0` marcadores `**`, `0` menciones prohibidas (`TODO`, `TBD`, `82/100`, PDF de Matemáticas Discretas).
- Reglas de acceso temporal y portada APA 7: título exacto `MediFlow`, autores en el orden indicado, afiliación `Universidad del Norte`, fecha documental `19 de noviembre de 2026`, omisión de docente/tutor/asignatura y ausencia de índice automático.

## 3. Compilación final e inspección visual

- **Secuencia ejecutada tras los ajustes finales:**
  1. `lualatex` (paso 1): `rc=0` (94,2 s)
  2. `biber informe_mediflow` (`PAR_GLOBAL_TEMP` y `PAR_TEMP` en caché preextraída): `rc=0` (8,8 s; 24 citekeys procesados en lista `apa/es-ES`)
  3. `lualatex` (paso 2): `rc=0` (76,4 s)
  4. `lualatex` (paso 3): `rc=0` (73,3 s)
- **Diagnóstico del registro `.log`:**
  - Errores fatales: `0`
  - Referencias o citas indefinidas: `0`
  - Advertencias (`LaTeX Warning`, `Package Warning`, `Float too large`, `duplicate destination`): `0`
  - `Overfull \hbox > 1,5 pt`: `0` (máximo residual microtipográfico: `0,72 pt` entre 56 ajustes subpíxel)
- **Artefacto PDF resultante:** `reports/informe_latex/informe_mediflow.pdf` (`61` páginas, `3.281.568` bytes).
- **Renderizado e inspección visual (`pdftoppm -png -r 130`):**
  - Se renderizaron las `61/61` páginas a PNG en el directorio temporal del entorno y se inspeccionaron visualmente todas las páginas, revalidando tras cada corrección las páginas afectadas.
  - Defectos detectados en la revisión visual inicial y corregidos antes del cierre:
    1. `\begin{titlepage}` reiniciaba la numeración de la página 2 a `1` generando `duplicate destination 'page.1'`; reemplazado por bloque centrado con `\clearpage` manteniendo página `1` en portada, `2` en Resumen y `3` en Introducción.
    2. Retiro de `\singlespacing` alrededor de `\printbibliography` y fijación explícita de `\bibhang = 1,27 cm` conforme APA 7.
    3. Reestructuración de ancho y corte de identificadores en la tabla de Ley de Little (`tab:little_poblaciones`) para eliminar desbordes de margen.
    4. Incorporación de `group-digits = integer` en `\sisetup` para impedir la inserción de puntos separadores dentro de la parte fraccionaria de decimales con cuatro o más cifras (por ejemplo, `1.176,257222`, `83,843895`, `277,5177`, `81,297108`).
    5. Corrección tipográfica en texto (`(\approx 0,5)` y `24 d`) y encabezados de las tablas de altas tempranas, capacidades y recomendaciones (`tab:altas_tempranas`, `tab:estado_capacidades`, `tab:recomendaciones`).
    6. Salto `\clearpage` previo al Anexo D para evitar que la Tabla 24 del Anexo C quedara intercalada dentro del Anexo D.
    7. Ruptura limpia del hash SHA-256 en `mediflow2026bundle` mediante `\allowbreak` y ajuste `\appto\bibsetup{\RaggedRight}` con `\Urlmuskip=0mu` en `main.tex`.
  - Nota residual de lectura visual en `Referencias`: la librería `url.sty` mantiene separación leve alrededor de `/` antes del salto de línea previo al hash SHA del commit en cuatro URL largas (`2026b`, `2026f`, `2026h` y `2026m`), sin generar desbordes (`Overfull`) ni afectar los hipervínculos.

## 4. Límites metodológicos y operativos de esta entrega

- No se consultó PostgreSQL ni VPN hospitalaria; las verificaciones de balance en 12 cortes (`N_0 = 0`) y los resultados predictivos/operacionales provienen de los documentos versionados e inspección de solo lectura del artefacto `v2.0`.
- No se reentrenaron modelos ni se regeneraron `models/modelos_web_bundle.joblib`, archivos `.parquet` ni visualizaciones PBIP; tampoco se ejecutó la suite completa de 180 pruebas Python ni comandos de publicación.
- No se modificaron archivos fuera de `reports/informe_latex/`, ni se realizaron commits o push en Git.
