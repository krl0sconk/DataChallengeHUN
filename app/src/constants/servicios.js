/**
 * Constantes y configuración canónica de servicios asistenciales (OMOP CDM).
 * Referencia técnica: docs/objetivo_prediccion.md
 * Paleta Cozy / Pastel Cálido con contraste WCAG AAA sobre fondos claros.
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
    color: '#2563eb', // Azul sereno accesible
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
    color: '#059669', // Verde salvia accesible
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
    color: '#7c3aed', // Lavanda pastel accesible
  },
};

export const CONFIG_ALERTAS = {
  rojo: {
    nivel: 'rojo',
    etiqueta: 'SATURACIÓN',
    subtitulo: 'Supera el percentil p90 histórico',
    colorTexto: 'text-rose-900',
    colorSubtexto: 'text-rose-950 font-semibold',
    colorBg: 'bg-rose-50',
    colorBorder: 'border-rose-200',
    colorDot: 'bg-rose-600',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    accion: 'Coordinar refuerzo en triaje y habilitar camas de observación.',
  },
  amarillo: {
    nivel: 'amarillo',
    etiqueta: 'ALTA DEMANDA',
    subtitulo: 'Demanda situada entre p75 y p90',
    colorTexto: 'text-amber-950',
    colorSubtexto: 'text-amber-900 font-semibold',
    colorBg: 'bg-amber-50',
    colorBorder: 'border-amber-200',
    colorDot: 'bg-amber-600',
    badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
    accion: 'Monitorear salas de espera. Turno de apoyo asistencial en alerta.',
  },
  verde: {
    nivel: 'verde',
    etiqueta: 'NORMAL',
    subtitulo: 'Demanda dentro de rangos habituales (< p75)',
    colorTexto: 'text-emerald-950',
    colorSubtexto: 'text-emerald-900 font-semibold',
    colorBg: 'bg-emerald-50',
    colorBorder: 'border-emerald-200',
    colorDot: 'bg-emerald-600',
    badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    accion: 'Capacidad operativa adecuada. No se requieren traslados ni refuerzo.',
  },
};

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
