# Guía de contribución

## Ramas

| Rama | Uso |
|---|---|
| `main` | Versión **estable**. Solo recibe merges desde `develop` al cerrar un sprint o entrega. |
| `develop` | Rama de **integración**. Todo el trabajo del sprint llega aquí. |
| `feature/<nombre>` | Nueva funcionalidad. Ej.: `feature/variables-clima` |
| `fix/<nombre>` | Corrección de errores. Ej.: `fix/fechas-duplicadas` |
| `docs/<nombre>` | Solo documentación. Ej.: `docs/guia-dashboard` |

Nombres en minúsculas, con guiones y sin tildes.

```bash
git switch develop
git pull
git switch -c feature/variables-clima
# ... trabajo y commits ...
git push -u origin feature/variables-clima
# abrir Pull Request hacia develop
```

## Commits: Conventional Commits en español

Formato: `<tipo>: <descripción en presente e imperativo, en minúscula>`

| Tipo | Cuándo | Ejemplo |
|---|---|---|
| `feat` | Nueva funcionalidad | `feat: agrega variables de clima` |
| `fix` | Corrección de error | `fix: corrige zona horaria de las llegadas` |
| `docs` | Documentación | `docs: documenta el diccionario de datos` |
| `refactor` | Cambio interno sin alterar comportamiento | `refactor: separa la limpieza por servicio` |
| `test` | Pruebas | `test: agrega pruebas de features de calendario` |
| `chore` | Mantenimiento, configuración | `chore: actualiza dependencias` |
| `style` | Formato | `style: aplica ruff format` |

Se puede indicar el alcance: `feat(modelo): agrega validación temporal`.

## Pull Requests

- **Todo entra a `develop` por Pull Request**, nunca con push directo.
- Cada PR necesita **al menos 1 revisión aprobada** de otro integrante.
- Completa la plantilla del PR, incluido el checklist de **datos sensibles**.
- PR pequeños y enfocados: más fáciles de revisar dentro del sprint.
- `pre-commit` y `pytest` deben pasar antes de pedir revisión.

## Notebooks

Nombre: `<NN>_<etapa>_<iniciales>_<tema>.ipynb`, dentro de la carpeta de su etapa.

- `notebooks/01_exploracion/01_exploracion_kd_llegadas.ipynb`
- `notebooks/02_preparacion/02_preparacion_jn_limpieza_urgencias.ipynb`
- `notebooks/03_modelado/03_modelado_kd_baseline.ipynb`

Reglas:

- **Los outputs se eliminan automáticamente** con `nbstripout` (pueden contener datos de pacientes).
  No desactives el hook.
- No imprimas registros individuales de pacientes; usa agregados.
- El código que se reutiliza sale del notebook y pasa a `src/hun/`.
- Carga rutas siempre desde `hun.config`, nunca rutas absolutas de tu equipo.

## Datos

- Nunca hagas `git add -f` sobre archivos de datos.
- Si subiste un dato por error, **avisa de inmediato al equipo**: borrarlo en un commit nuevo no basta,
  hay que reescribir el historial.

## Decisiones técnicas

Toda decisión relevante (modelo, variables, fuentes externas, framework web…) se registra en
[docs/decisiones.md](docs/decisiones.md).
