/**
 * Constantes y configuración canónica de servicios asistenciales (OMOP CDM).
 * Referencia técnica: docs/objetivo_prediccion.md
 */

export const SERVICIOS = {
  urgencias: {
    id: 'urgencias',
    nombre: 'Urgencias',
    codigo: 'OMOP 9203',
    mediaDiaria: 443,
    p75: 490,
    p90: 540,
    p10Ratio: 0.86,
    p90Ratio: 1.14,
    color: '#3b82f6',
  },
  rehabilitacion: {
    id: 'rehabilitacion',
    nombre: 'Rehabilitación Ambulatoria',
    codigo: 'OMOP 581479',
    mediaDiaria: 827,
    p75: 880,
    p90: 940,
    p10Ratio: 0.88,
    p90Ratio: 1.12,
    color: '#10b981',
  },
  tratamiento_urgencia: {
    id: 'tratamiento_urgencia',
    nombre: 'Tratamiento Urgencias',
    codigo: 'OMOP 3045729',
    mediaDiaria: 15,
    p75: 18,
    p90: 22,
    p10Ratio: 0.70,
    p90Ratio: 1.30,
    color: '#8b5cf6',
  },
};

export const CONFIG_ALERTAS = {
  rojo: {
    nivel: 'rojo',
    etiqueta: 'SATURACIÓN',
    subtitulo: 'Supera el percentil p90 histórico',
    colorTexto: 'text-rose-400',
    colorBg: 'bg-rose-950/25',
    colorBorder: 'border-rose-500/40',
    colorDot: 'bg-rose-500',
    accion: 'Coordinar refuerzo en triaje y habilitar camas de observación.',
  },
  amarillo: {
    nivel: 'amarillo',
    etiqueta: 'ALTA DEMANDA',
    subtitulo: 'Demanda situada entre p75 y p90',
    colorTexto: 'text-amber-400',
    colorBg: 'bg-amber-950/25',
    colorBorder: 'border-amber-500/40',
    colorDot: 'bg-amber-500',
    accion: 'Monitorear salas de espera. Turno de apoyo asistencial en alerta.',
  },
  verde: {
    nivel: 'verde',
    etiqueta: 'NORMAL',
    subtitulo: 'Demanda dentro de rangos habituales (< p75)',
    colorTexto: 'text-emerald-400',
    colorBg: 'bg-emerald-950/25',
    colorBorder: 'border-emerald-500/40',
    colorDot: 'bg-emerald-500',
    accion: 'Capacidad operativa adecuada. No se requieren traslados ni refuerzo.',
  },
};

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
