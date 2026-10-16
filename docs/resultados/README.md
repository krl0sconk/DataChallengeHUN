# docs/resultados/

Reportes generados por el código. **Solo métricas agregadas** (errores, conteos por tipo): nunca filas
de pacientes. Se regeneran corriendo el módulo que los produce; no se editan a mano.

| Archivo | Lo genera |
|---|---|
| `linea_base.md` | `python -m hun.models.linea_base` |
| `linea_base_diaria.md` | `python -m hun.models.linea_base --frecuencia D --salida docs/resultados/linea_base_diaria.md` |
| `factores_externos.md` | Protocolo de factores externos (Sprint 2) |
