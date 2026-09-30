# models/

Artefactos de modelos entrenados (`.pkl`, `.joblib`, `.onnx`…). **No se suben a GitHub**: están
entrenados con datos confidenciales. Se regeneran con el código de `src/hun/models/`.

Convención de nombre: `<modelo>_<AAAAMMDD>_<version>.joblib`, p. ej. `gbr_20261006_v1.joblib`.
Registra métricas y parámetros de cada versión en `docs/`.
