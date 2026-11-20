# Informe LaTeX IEEE — MediFlow

Versión en formato **IEEEtran** (conferencia a dos columnas, citas numéricas y bibliografía `biblatex-ieee`) del informe técnico **MediFlow**, generada de manera independiente preservando intacto el documento APA 7 original en `../informe_latex/`.

## Entorno y compilación

- **Compilador LaTeX:** `MiKTeX pdfTeX 1.40.28` (`pdflatex`), sin `--shell-escape`.
- **Procesador bibliográfico:** `Biber` con `biblatex` (`style=ieee`, `citestyle=numeric-comp`, `sorting=none`).
- **Tipografía y diseño:** `IEEEtran` (`conference,letterpaper`), `newtxtext`/`newtxmath`, tamaños, márgenes y espaciado estándar de `IEEEtran`.

```powershell
cd reports/informe_ieee

$env:PAR_GLOBAL_TEMP = Join-Path $env:TEMP "par_mediflow_ready"
$env:PAR_TEMP = $env:PAR_GLOBAL_TEMP
New-Item -ItemType Directory -Force -Path $env:PAR_GLOBAL_TEMP | Out-Null

pdflatex -interaction=nonstopmode -halt-on-error -jobname=informe_mediflow_ieee main.tex
biber informe_mediflow_ieee
pdflatex -interaction=nonstopmode -halt-on-error -jobname=informe_mediflow_ieee main.tex
pdflatex -interaction=nonstopmode -halt-on-error -jobname=informe_mediflow_ieee main.tex
```

## Estructura de entregables

- `informe_mediflow_ieee.pdf`: PDF final compilado (20 páginas, `3.176.911` bytes).
- `main.tex`: preámbulo `IEEEtran`, título, autores (sin docente, tutor ni asignatura), resumen, palabras clave y ensamblado.
- `referencias.bib`: 22 referencias sustantivas verificadas (se omiten `apa_paper_format` y `apa_title_page`, exclusivas de la guía APA 7).
- `secciones/`: `01_introduccion.tex` a `10_conclusiones.tex` y `11_anexos.tex` (Apéndices A–D).
- `figuras/`: 8 gráficos PNG autorizados copiados desde `../informe_latex/figuras/`.
