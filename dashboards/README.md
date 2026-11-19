# dashboards/

Directorio para artefactos y documentación de tableros de control.

## powerbi/

Tablero **Cuellos de botella en el flujo de pacientes** en Power BI (responsable: Juan, DEC-005).

- **Proyecto:** `powerbi/HUN_CuellosBotella/HUN_CuellosBotella.pbip` (formato PBIP: modelo + informe en texto, **sin datos**).
- **Contenido:** 7 páginas (Inicio, Resumen ejecutivo, Saturación por área, Esperas y flujo, Demanda,
  Hallazgos y recomendaciones, Metodología y glosario), modelo estrella de 12 tablas, 18 relaciones y 43 medidas DAX.
- **Confidencialidad:** el repositorio solo guarda la definición. Los datos agregados viven en
  `data/processed/powerbi/` (ignorado por git) y la caché de Power BI (`.pbi/`, `*.abf`) también está bloqueada.
  Los `.pbix` siguen prohibidos.

### Cómo conectarse al modelo

1. Conectar la VPN (FortiClient) y completar `HUN_DB_USER` / `HUN_DB_PASSWORD` en `.env`.
2. Extraer los agregados y armar las tablas del modelo (desde la raíz del repo):
   ```powershell
   .\.venv\Scripts\python.exe -m hun.data.extraer inventario
   .\.venv\Scripts\python.exe -m hun.data.extraer flujo_horario
   .\.venv\Scripts\python.exe -m hun.data.extraer agregados
   .\.venv\Scripts\python.exe -m hun.data.extraer conceptos_visitas
   .\.venv\Scripts\python.exe dashboards\powerbi\preparar_modelo.py
   ```
   La extracción es mensual y retoma lo ya descargado si se corta.
3. Abrir `dashboards/powerbi/HUN_CuellosBotella/HUN_CuellosBotella.pbip` en Power BI Desktop, ir a
   *Transformar datos → Editar parámetros*, poner en `RutaDatos` la ruta completa de tu `data\processed\powerbi\`
   (terminada en `\`) y pulsar *Inicio → Actualizar*.
4. Parámetro `FechaCorte` (30/04/2026): desde mayo 2026 la extracción viene incompleta; se puede mover si llegan datos nuevos.

### Enlace al tablero publicado

- Pendiente: se publica desde Power BI Desktop (*Publicar*) y se comparte desde app.powerbi.com.
