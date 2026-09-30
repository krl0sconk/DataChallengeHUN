# data/

> [!CAUTION]
> **Los datos del hospital son confidenciales.** Nada de lo que hay en estas carpetas se sube a GitHub
> (solo este README y los `.gitkeep`). Los datos se comparten **por fuera de GitHub**, por el canal privado
> acordado con el hospital, y cada integrante los copia localmente en `data/raw/`.

| Carpeta | Contenido | ¿Quién escribe? |
|---|---|---|
| `raw/` | Datos originales entregados por el hospital. **Solo lectura**: nunca se modifican. | Se copian a mano |
| `external/` | Datos externos: clima, festivos, temporadas escolares y epidemiológicas. | `src/hun/external/` |
| `interim/` | Datos intermedios durante la limpieza y la unión de fuentes. | Notebooks de preparación, `src/hun/data/` |
| `processed/` | Datasets finales, listos para el modelo y para Power BI. | `src/hun/features/` |

Flujo: `raw` + `external` → `interim` → `processed` → modelo / dashboard / web.

Buenas prácticas:

- Todo dataset de `interim/` y `processed/` debe poder **regenerarse con código** desde `raw/` y `external/`.
- Documenta en `docs/` el origen, fecha de corte y diccionario de cada fuente.
- Las rutas se leen desde `hun.config` (configurables en `.env`).
