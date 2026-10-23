# Borrado de datos al cierre del reto

- **Tarea:** #21 · Backlog · **Responsables:** Krlos, Daniel y Juan (cada uno en su computador)
- **Cuándo:** al cierre del Data Challenge, después de publicar los entregables.

El acuerdo de confidencialidad exige eliminar todos los datos descargados del hospital y las
credenciales. Antes de borrar, confirma que el dashboard publicado, el repositorio y la
documentación ya no necesitan nada de `data/`.

## 1. Script (dentro del repositorio)

```bash
python -m hun.data.borrar_datos              # simulación: muestra qué borraría
python -m hun.data.borrar_datos --confirmar  # borra
```

Borra el contenido de `data/raw`, `data/interim`, `data/processed`, `models/` y el `.env`.
No toca `data/external` (datos públicos) ni los `README.md` / `.gitkeep` del repo.

## 2. A mano (el script no llega aquí)

Cada integrante marca su columna:

| Paso | Krlos | Daniel | Juan |
|---|---|---|---|
| Script corrido con `--confirmar` | ☐ | ☐ | ☐ |
| Carpetas de `data/` fuera del repo (si el `.env` apuntaba a otra ruta) | ☐ | ☐ | ☐ |
| Archivos `.pbix` de Power BI y su caché | ☐ | ☐ | ☐ |
| Copias en Descargas, Escritorio, USB o nube personal | ☐ | ☐ | ☐ |
| Papelera de reciclaje vaciada | ☐ | ☐ | ☐ |
| Perfil de la VPN (FortiClient) y contraseñas guardadas en el navegador o gestor | ☐ | ☐ | ☐ |
| Clones viejos del repositorio con `data/` lleno | ☐ | ☐ | ☐ |
| Archivos compartidos por el canal privado del equipo | ☐ | ☐ | ☐ |

## 3. Confirmación

Cuando los tres terminen, registrar la fecha aquí: TODO.
