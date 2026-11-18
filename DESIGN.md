# Dirección visual · HUN / Editorial operativo

## Concepto

**Editorial operativo:** una página de datos que se lee como una hoja de guardia institucional, con la claridad
de una publicación clínica y la franqueza visual de un panel brutalista controlado.

## Lenguaje

- Composición: columnas asimétricas, títulos con presencia y datos alineados como una tabla de turno.
- Materialidad: fondos papel casi blancos, tinta azul marino, líneas gruesas y acentos azules del logotipo.
- Brutalismo controlado: bordes visibles, estados contundentes y una sombra desplazada solo en elementos de acción.
- Cercanía: frases cortas, verbos directos y hallazgos expresados en lenguaje operativo.
- Editorial: serif de titulares y sans-serif funcional para datos, controles y navegación.

## Tokens

| Token | Valor | Uso |
|---|---|---|
| `--hun-blue` | `#1B8CC9` | Acción, foco, selección y datos destacados |
| `--hun-blue-dark` | `#14516B` | Enlaces, etiquetas y acentos legibles |
| `--hun-ink` | `#102A43` | Títulos, cifras y tinta principal |
| `--hun-paper` | `#F7FAFC` | Fondo claro |
| `--hun-line` | `#B7C8D5` | Líneas y separación editorial |
| `--hun-night` | `#071B2A` | Fondo oscuro |

## Reglas de interfaz

- Una cifra principal por bloque, acompañada por una frase breve.
- Las bandas verde/amarilla/roja significan `< p75`, `p75–p90` y `> p90` respectivamente.
- Los gráficos siempre llevan leyenda y ayuda contextual.
- No usar gradientes decorativos, sombras genéricas ni texto gris de bajo contraste.
- Los radios son contenidos; las líneas y la tipografía hacen la estructura.
- En móvil, el contenido se apila y los controles se mantienen tocables sin reducir la lectura.

## Densidad y jerarquía clínica

- La pantalla principal debe parecer una herramienta clínica de alta precisión, no una colección de tarjetas SaaS.
- Evitar la fatiga de tarjetas: los hallazgos se presentan como franjas editoriales con divisores finos e índices `01`, `02`, `03`.
- Los KPIs principales privilegian el número o estado; las etiquetas y explicaciones son secundarias, pequeñas y sobrias.
- La subnavegación de servicios ocupa una barra integrada de ancho completo; el servicio activo se marca con un indicador inferior sólido.
- Los controles de fecha y horizonte forman una única unidad segmentada, con radios contenidos (`rounded-md`).
- El espacio vacío debe separar decisiones, no envolver cada dato dentro de otra caja.
