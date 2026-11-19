# Sistema de Diseño · MediFlow

## Concepto (Impeccable · Operate Mode)

**Control clínico de flujo asistencial:** una herramienta operativa de precisión que el personal de guardia comprende al instante. Sin adornos SaaS, sin tarjetas anidadas ni ruido decorativo; toda la estructura descansa en una barra lateral oscura de navegación, una franja superior de contexto del servicio activo, tipografía tabular limpia y el componente firma **FlowBandBar**.

## Tipografía

- **Interfaz y titulares:** `IBM Plex Sans` (pesos `400`, `500`, `600`, `700`). Una sola familia para UI, etiquetas, controles y encabezados.
- **Datos numéricos, códigos OMOP y fechas:** `IBM Plex Mono` (pesos `400`, `500`, `600`), siempre con `font-variant-numeric: tabular-nums`.
- **Escala fija en `rem` (ratio operativo 1.15–1.25):**
  - `h1` de vista: `1.5rem` (24px) a `1.75rem` (28px), peso `700`, `letter-spacing: -0.02em`, `line-height: 1.2`
  - `h2` de sección: `1.0625rem` (17px) a `1.125rem` (18px), peso `600`, `letter-spacing: -0.015em`
  - `h3` de subgrupo: `0.9375rem` (15px), peso `600`
  - Cuerpo: `0.875rem` (14px) a `0.9375rem` (15px), `line-height: 1.55`, medida máxima `68ch` en prosa
  - Metadatos y etiquetas funcionales: mínimo `0.75rem` (12px); nunca por debajo de `11px`
  - Cifra KPI principal: `2rem` (32px) a `2.25rem` (36px), `IBM Plex Mono`, peso `600`, `tabular-nums`

## Paleta de color (Tokens CSS `--mf-*`)

### Turno día (Claro)

| Token | Hex | Rol |
|---|---|---|
| `--mf-bg` | `#F3F6F8` | Fondo general del área de trabajo (porcelana clínica fría) |
| `--mf-rail` | `#0B2532` | Barra lateral de navegación y ancla de identidad MediFlow |
| `--mf-rail-hover` | `#123647` | Hover en ítems del rail |
| `--mf-rail-active` | `#16465C` | Estado activo en el rail |
| `--mf-surface` | `#FFFFFF` | Paneles de trabajo y tablas |
| `--mf-surface-2` | `#EBF1F4` | Franjas secundarias, cabeceras de tabla y controles segmentados |
| `--mf-border` | `#D4DFE6` | Bordes de 1px de paneles y divisores |
| `--mf-border-strong` | `#B5C7D3` | Bordes de inputs, focus y separadores fuertes |
| `--mf-ink` | `#0D222E` | Texto principal y titulares (contraste ≥ 14:1 sobre blanco) |
| `--mf-ink-2` | `#385262` | Texto secundario y descripciones (contraste ≥ 7.5:1) |
| `--mf-ink-3` | `#526D7D` | Etiquetas y ejes de gráficos (contraste ≥ 5.1:1) |
| `--mf-accent` | `#0B7A75` | Teal clínico MediFlow: acción primaria, selección activa y serie principal |
| `--mf-accent-hover` | `#08605C` | Hover de acción primaria |
| `--mf-accent-soft` | `#E3F4F2` | Fondo suave de selección / badge de marca |
| `--mf-accent-ink` | `#074D4A` | Tinta sobre `--mf-accent-soft` (contraste ≥ 8.5:1) |
| `--mf-series-2` | `#1D5F8A` | Serie comparativa secundaria en gráficos |

### Turno noche (Oscuro)

| Token | Hex | Rol |
|---|---|---|
| `--mf-bg` | `#08151D` | Fondo general nocturno |
| `--mf-rail` | `#051016` | Barra lateral nocturna |
| `--mf-rail-hover` | `#0E2430` | Hover en ítems del rail nocturno |
| `--mf-rail-active` | `#133242` | Estado activo en el rail nocturno |
| `--mf-surface` | `#0F222E` | Paneles elevados nocturnos |
| `--mf-surface-2` | `#152D3B` | Franjas secundarias y controles segmentados nocturnos |
| `--mf-border` | `#1F3C4D` | Bordes de 1px nocturnos |
| `--mf-border-strong` | `#2F556B` | Bordes de inputs y controles nocturnos |
| `--mf-ink` | `#E8F2F6` | Texto principal nocturno |
| `--mf-ink-2` | `#A6C2D0` | Texto secundario nocturno |
| `--mf-ink-3` | `#83A5B7` | Metadatos y ejes nocturnos (contraste ≥ 4.8:1) |
| `--mf-accent` | `#149A93` | Acción primaria nocturna (contraste blanco ≥ 4.6:1 o tinta oscura en chips) |
| `--mf-accent-hover` | `#1BB2AA` | Hover nocturno |
| `--mf-accent-soft` | `#0D3438` | Fondo suave nocturno |
| `--mf-accent-ink` | `#7BE3DA` | Tinta sobre fondo suave nocturno |
| `--mf-series-2` | `#5BA4D6` | Serie secundaria nocturna |

### Estados clínicos semánticos

| Estado | Rango | Claro (tinta / fondo / borde) | Oscuro (tinta / fondo / borde) |
|---|---|---|---|
| Normal | `< p75` | `#0F766E` / `#E6F5F3` / `#99D5CE` | `#5EEAD4` / `#0D3133` / `#1D6362` |
| Alta demanda (Alerta) | `p75 – p90` | `#9A4A06` / `#FEF5E6` / `#ECC98B` | `#FCD34D` / `#33250E` / `#7C5819` |
| Saturación | `>= p90` | `#A81C1C` / `#FDECEC` / `#EDA8A8` | `#FCA5A5` / `#38161B` / `#8C2D36` |

## Radios, elevación y espaciado

- **Radios permitidos:** `8px` (`rounded-lg`) para controles, botones, inputs y celdas; `12px` (`rounded-xl`) para paneles y contenedores; `9999px` (`rounded-full`) únicamente para badges de estado pequeños e indicadores.
- **Elevación:** bordes limpios de `1px solid var(--mf-border)`. Sin sombras desplazadas duras (`box-shadow: 3px 3px 0`), sin bordes gruesos de un solo lado (`border-t-4`, `border-l-4`) en contenedores redondeados, sin tarjetas dentro de tarjetas y sin blur decorativo.
- **Movimiento:** transiciones sobrias de `150ms–200ms` (`cubic-bezier(0.22, 1, 0.36, 1)`) solo para cambios de estado; respeto estricto a `prefers-reduced-motion: reduce`. Ningún punto decorativo con `animate-pulse`.

## Elemento firma: FlowBandBar

Banda horizontal proporcional de presión asistencial que muestra en una sola lectura las zonas `Normal (< p75)`, `Alerta (p75–p90)` y `Saturación (≥ p90)`, el intervalo de incertidumbre `p10–p90` y el marcador exacto de la proyección actual (`p50`). Se reutiliza como lenguaje visual unificado en KPIs, comparador de servicios y monitoreo de cuellos de botella.
