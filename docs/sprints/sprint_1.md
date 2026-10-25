# Revisión de cierre del Sprint 1

- **Tarea:** #14 · **Participan:** Krlos, Daniel y Juan
- **Fecha de la revisión:** TODO

Cada uno muestra lo logrado; con eso se planea el Sprint 2. Las cifras se copian de los documentos
de resultados, nunca de memoria.

## Juan · preparación de datos

| Tarea | Estado | Dónde está |
|---|---|---|
| #17 Inventario de la base | Hecho (resumen) | `docs/inventario_base.md` |
| #12 Auditoría de calidad | Código listo; falta correr con la VPN | `python -m hun.data.extraer auditoria` → notebook `02_preparacion_jn_auditoria_calidad` → `docs/calidad_datos.md` |
| #10 Extracción de agregados | Código listo; falta correr | `python -m hun.data.extraer agregados` (perfil de llegadas, censo por etapa, duraciones y esperas entre etapas) |
| #11 Traducción de conceptos | Código listo; falta correr | `python -m hun.data.extraer conceptos` y `python -m hun.data.conceptos` |
| #13 Exploración inicial del flujo | Notebook listo; falta correr | `01_exploracion_jn_flujo` → `docs/hallazgos.md` |
| #19 Herramienta del dashboard | Hecho: Power BI (aceptada) | DEC-005 en `docs/decisiones.md` |
| #18 Subconjunto y tabla maestra | Por decidir con el equipo | Choca con la regla de trabajar solo con agregados (ver AI.md) |

Correcciones de la revisión del PR (antes de correr las extracciones):

- Las extracciones por mes ya no guardan en caché meses a medias ni ventanas vacías: antes, correr
  con `--hasta` a mitad de mes dejaba ese mes incompleto para siempre (`src/hun/data/extraer.py`,
  pruebas en `tests/test_extraer.py`).
- Edades imposibles salen como `invalida` en el perfil de llegadas, y las esperas entre etapas ya
  no usan etapas con fechas inválidas (ver *Reglas de limpieza* en `docs/calidad_datos.md`).

Resultados para mostrar (completar después de correr):

- ¿Las fechas están corridas? TODO (`docs/calidad_datos.md`, sección 5)
- Problemas de calidad que cambian algo: TODO
- Primeros lugares con posible congestión: TODO (`docs/hallazgos.md`)

## Krlos · modelo y datos externos

- TODO (lo completa Krlos)

## Daniel · web y validación

- Sin entregas en el Sprint 1. Pasan al Sprint 2: esqueleto de la web, maqueta con datos simulados
  y contrato modelo–web (`docs/contrato_modelo_web.md`).

## Decisiones y plan del Sprint 2

- Aceptadas el 2026-10-25: DEC-003 (validación walk-forward y WAPE), DEC-004 (protocolo de
  factores externos) y DEC-005 (dashboard en Power BI). Ver `docs/decisiones.md`.
- TODO: plan del Sprint 2
