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
    color: '#6EADBC',
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
    color: '#4A4466',
  },
  tratamiento_urgencia: {
    id: 'tratamiento_urgencia',
    nombre: 'Tratamiento Urgencias',
    codigo: 'OMOP 3045729',
    mediaDiaria: 15,
    p75: 18,
    p90: 22,
    p10Ratio: 0.7,
    p90Ratio: 1.3,
    color: '#3B7D8C',
  },
};

export const CONFIG_ALERTAS = {
  rojo: {
    nivel: 'rojo',
    etiqueta: 'SATURACIÓN',
    subtitulo: 'Supera el percentil p90 histórico',
    colorTexto: 'text-[#8A2434]',
    colorBg: 'bg-[#FDF0F2]',
    colorBorder: 'border-[#F4C5CD]',
    colorDot: 'bg-[#C5304C]',
    iconoColor: 'text-[#C5304C]',
    accion: 'Coordinar refuerzo en triaje y habilitar camas de observación.',
  },
  amarillo: {
    nivel: 'amarillo',
    etiqueta: 'ALTA DEMANDA',
    subtitulo: 'Demanda situada entre p75 y p90',
    colorTexto: 'text-[#8C5800]',
    colorBg: 'bg-[#FFFBEA]',
    colorBorder: 'border-[#F1F7D4]',
    colorDot: 'bg-[#D98A00]',
    iconoColor: 'text-[#D98A00]',
    accion: 'Monitorear salas de espera. Turno de apoyo asistencial en alerta.',
  },
  verde: {
    nivel: 'verde',
    etiqueta: 'NORMAL',
    subtitulo: 'Demanda dentro de rangos habituales (< p75)',
    colorTexto: 'text-[#205C3B]',
    colorBg: 'bg-[#F2F8F4]',
    colorBorder: 'border-[#9FCBAD]',
    colorDot: 'bg-[#2E7D52]',
    iconoColor: 'text-[#2E7D52]',
    accion: 'Capacidad operativa adecuada. No se requieren traslados ni refuerzo.',
  },
};

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Rango de la base del hospital (docs/inventario_base.md): datos del 2023-01-01 al 2026-07-16
// (último día completo). La base no se actualiza, así que el simulador trabaja dentro de este
// rango (DEC-002). La fecha base se limita para que la ventana de 7 días no se salga del rango.
export const FECHA_INICIO_DATOS = '2023-01-01';
export const FECHA_FIN_DATOS = '2026-07-16';
export const DIAS_VENTANA = 7;
export const FECHA_BASE_MAXIMA = '2026-07-10'; // FECHA_FIN_DATOS - (DIAS_VENTANA - 1)
export const FECHA_BASE_POR_DEFECTO = FECHA_BASE_MAXIMA;

/** Ajusta una fecha 'YYYY-MM-DD' al rango válido para la fecha base del simulador. */
export function limitarFechaBase(fecha) {
  if (!fecha) return FECHA_BASE_POR_DEFECTO;
  if (fecha < FECHA_INICIO_DATOS) return FECHA_INICIO_DATOS;
  if (fecha > FECHA_BASE_MAXIMA) return FECHA_BASE_MAXIMA;
  return fecha;
}
