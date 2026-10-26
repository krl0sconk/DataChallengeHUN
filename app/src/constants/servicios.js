/**
 * Constantes y configuración canónica de servicios asistenciales (OMOP CDM).
 * Referencia técnica: docs/objetivo_prediccion.md
 * Colores con contraste AAA optimizados para fondos oscuros (#070d1e / #0e1733).
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
    color: '#38bdf8', // Sky 400 luminoso
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
    color: '#34d399', // Emerald 400 luminoso
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
    color: '#c084fc', // Purple 400 luminoso
  },
};

export const CONFIG_ALERTAS = {
  rojo: {
    nivel: 'rojo',
    etiqueta: 'SATURACIÓN',
    subtitulo: 'Supera el percentil p90 histórico',
    colorTexto: 'text-rose-300 font-bold',
    colorSubtexto: 'text-rose-100',
    colorBg: 'bg-rose-950/40',
    colorBorder: 'border-rose-500/60',
    colorDot: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
    badgeBg: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
    accion: 'Coordinar refuerzo en triaje y habilitar camas de observación.',
  },
  amarillo: {
    nivel: 'amarillo',
    etiqueta: 'ALTA DEMANDA',
    subtitulo: 'Demanda situada entre p75 y p90',
    colorTexto: 'text-amber-300 font-bold',
    colorSubtexto: 'text-amber-100',
    colorBg: 'bg-amber-950/40',
    colorBorder: 'border-amber-500/60',
    colorDot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
    badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    accion: 'Monitorear salas de espera. Turno de apoyo asistencial en alerta.',
  },
  verde: {
    nivel: 'verde',
    etiqueta: 'NORMAL',
    subtitulo: 'Demanda dentro de rangos habituales (< p75)',
    colorTexto: 'text-emerald-300 font-bold',
    colorSubtexto: 'text-emerald-100',
    colorBg: 'bg-emerald-950/40',
    colorBorder: 'border-emerald-500/60',
    colorDot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    accion: 'Capacidad operativa adecuada. No se requieren traslados ni refuerzo.',
  },
};

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
