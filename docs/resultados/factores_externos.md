# Resultados · Evaluación Empírica de Factores Externos

_Generado automáticamente el 2026-11-18 19:21. Solo métricas agregadas._

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
| `festivos_y_puentes` | ✅ Acepta | +33.80% | -1.80% | 88% | 0.000 | Cumple todos los criterios |
| `carnaval_y_semana_santa` | ✅ Acepta | +3.49% | +1.26% | 73% | 0.014 | Cumple todos los criterios |
| `vacaciones_escolares` | ❌ Descarta | +4.41% | -0.13% | 65% | 0.084 | mejora solo en 65% de los pliegues; prueba de signo p=0.084 |
| `quincena_y_primas` | ❌ Descarta | +1.17% | +0.79% | 58% | 0.279 | mejora solo en 58% de los pliegues; prueba de signo p=0.279; el placebo mejora 0.79%: el aporte puede ser estacionalidad o forma del factor, no el factor |

## Grupos Aceptados en el Modelo Final

- **`festivos_y_puentes`**: 6 variables (dia_post_festivo, dias_a_festivo, dias_desde_festivo, es_dia_no_laboral, es_festivo, es_puente)
- **`carnaval_y_semana_santa`**: 5 variables (dias_a_carnaval, dias_desde_carnaval, es_carnaval, es_precarnaval, es_semana_santa)
