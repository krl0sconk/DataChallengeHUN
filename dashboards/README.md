# dashboards/

Directorio para artefactos y documentación de tableros de control.

## powerbi/

Dashboard de análisis y visualización en Power BI (responsable: Juan, DEC-005).

- **Estado:** Pendiente de creación en Sprint 2.
- **Regla de confidencialidad:** **Solo se versionan plantillas `.pbit`** (definiciones de esquema, modelos DAX, medidas y visuales, sin datos subyacentes).
- Los archivos binarios `.pbix` contienen datos en caché y están estrictamente bloqueados por `.gitignore`.
- **Origen de datos:** El dashboard consumirá las series agregadas procesadas desde `data/processed/` o `data/raw/` (llegadas por turno, censo por etapas y tiempos de espera).
- Para exportar desde Power BI Desktop: *Archivo → Exportar → Plantilla de Power BI (`.pbit`)*.
- Una vez finalizado y publicado el servicio en la web, el enlace público se incluirá en el README principal.
