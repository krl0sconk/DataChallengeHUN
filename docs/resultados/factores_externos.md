# Resultados · Evaluación Empírica de Factores Externos

_Generado automáticamente el 2026-11-03 15:09. Solo métricas agregadas._

## Protocolo de Evaluación

Cada grupo de factores se evalúa en bloque siguiendo cuatro filtros estrictos:
1. **Ablación:** comparación del modelo con vs. sin el grupo en los mismos pliegues.
2. **Control de estacionalidad:** el modelo base ya cuenta con día de semana y ciclo.
3. **Prueba placebo:** el mismo grupo desplazado temporalmente; si aporta similar,
   el aporte era espurio y el factor se descarta.
4. **Estabilidad:** la mejora debe sostenerse en la mayoría de pliegues walk-forward.

## Tabla Resumen de Decisión

| Grupo | Decisión | Mediana | Placebo | % Pliegues | p-signo | Motivos |
|---|---|---|---|---|---|---|
| `festivos_y_puentes` | ❌ Descarta | +33.80% | +17.25% | 88% | 0.000 | el placebo mejora 17.25%: el aporte puede ser estacionalidad o forma del factor, no el factor |
| `carnaval_y_semana_santa` | ✅ Acepta | +3.49% | +1.26% | 73% | 0.014 | Cumple todos los criterios |
| `vacaciones_escolares` | ❌ Descarta | -0.05% | +0.00% | 46% | 0.721 | mejora mediana -0.05% < 1%; mejora solo en 46% de los pliegues; prueba de signo p=0.721 |
| `quincena_y_primas` | ❌ Descarta | +1.17% | +0.79% | 58% | 0.279 | mejora solo en 58% de los pliegues; prueba de signo p=0.279; el placebo mejora 0.79%: el aporte puede ser estacionalidad o forma del factor, no el factor |
| `clima` | ❌ Descarta | +1.32% | -1.82% | 50% | 0.577 | mejora solo en 50% de los pliegues; prueba de signo p=0.577 |
| `epidemiologia` | ❌ Descarta | -2.63% | +0.82% | 42% | 0.837 | mejora mediana -2.63% < 1%; mejora solo en 42% de los pliegues; prueba de signo p=0.837; el placebo mejora 0.82%: el aporte puede ser estacionalidad o forma del factor, no el factor |

## Grupos Aceptados en el Modelo Final

- **`carnaval_y_semana_santa`**: 5 variables (dias_a_carnaval, dias_desde_carnaval, es_carnaval, es_precarnaval, es_semana_santa)

