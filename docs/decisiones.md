# Bitácora de decisiones técnicas

Registra aquí cada decisión relevante del proyecto. La entrada más reciente va arriba.
Si una decisión reemplaza a otra, no borres la anterior: márcala como **Reemplazada por DEC-XXX**.

## Plantilla

```markdown
### DEC-XXX · <título corto>

- **Fecha:** AAAA-MM-DD
- **Sprint:** N
- **Responsable:** <nombre>
- **Estado:** Propuesta | Aceptada | Reemplazada por DEC-YYY
- **Decisión:** qué se decidió.
- **Motivo:** por qué; qué problema resuelve.
- **Alternativas consideradas:** opciones descartadas y por qué.
- **Consecuencias:** qué implica para el resto del proyecto.
```

---

### DEC-001 · Estructura inicial del repositorio y protección de datos

- **Fecha:** 2026-09-29
- **Sprint:** 1
- **Responsable:** Krlos
- **Estado:** Aceptada
- **Decisión:** Repositorio con paquete Python `hun` en `src/`, datos fuera de Git, notebooks sin outputs
  (`nbstripout`) y flujo `main` / `develop` / `feature/*` con Pull Requests.
- **Motivo:** Los datos del hospital son confidenciales; se necesita un flujo que impida subirlos por error
  y que permita trabajar en paralelo a tres personas.
- **Alternativas consideradas:** Repositorio sin paquete (solo notebooks): descartado porque dificulta
  reutilizar código entre el modelo, la web y la validación.
- **Consecuencias:** Los datos se comparten por un canal privado externo. Cada integrante debe instalar
  `pre-commit`.
