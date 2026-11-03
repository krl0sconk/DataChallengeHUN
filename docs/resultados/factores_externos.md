# Resultados · Evaluación Empírica de Factores Externos

_Generado automáticamente el 2026-11-03 16:17. Solo métricas agregadas._

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
| `festivos_y_puentes` | ❌ Descarta | +29.57% | +14.83% | 81% | 0.001 | el placebo mejora 14.83%: el aporte puede ser estacionalidad o forma del factor, no el factor |
| `carnaval_y_semana_santa` | ❌ Descarta | +4.18% | +2.67% | 69% | 0.038 | mejora solo en 69% de los pliegues; el placebo mejora 2.67%: el aporte puede ser estacionalidad o forma del factor, no el factor |
| `vacaciones_escolares` | ❌ Descarta | +0.63% | -0.22% | 58% | 0.279 | mejora mediana 0.63% < 1%; mejora solo en 58% de los pliegues; prueba de signo p=0.279 |
| `quincena_y_primas` | ❌ Descarta | +1.40% | +1.50% | 69% | 0.038 | mejora solo en 69% de los pliegues; el placebo mejora 1.50%: el aporte puede ser estacionalidad o forma del factor, no el factor |
| `clima` | ❌ Descarta | -0.61% | +2.28% | 38% | 0.916 | mejora mediana -0.61% < 1%; mejora solo en 38% de los pliegues; prueba de signo p=0.916; el placebo mejora 2.28%: el aporte puede ser estacionalidad o forma del factor, no el factor |
| `epidemiologia` | ❌ Descarta | +0.02% | +3.36% | 50% | 0.577 | mejora mediana 0.02% < 1%; mejora solo en 50% de los pliegues; prueba de signo p=0.577; el placebo mejora 3.36%: el aporte puede ser estacionalidad o forma del factor, no el factor |

## Grupos Aceptados en el Modelo Final

- Ningún grupo superó todos los umbrales de forma concluyente.

