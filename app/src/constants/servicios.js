export const SERVICIOS = {
  urgencias: {
    id: 'urgencias',
    nombre: 'Urgencias',
    codigo: 'OMOP 9203',
    color: '#0B7A75',
  },
  rehabilitacion: {
    id: 'rehabilitacion',
    nombre: 'Rehabilitación Ambulatoria',
    codigo: 'OMOP 581479',
    color: '#1D5F8A',
  },
  tratamiento_urgencia: {
    id: 'tratamiento_urgencia',
    nombre: 'Tratamiento Urgencias',
    codigo: 'OMOP 3045729',
    color: '#385262',
  },
};

export const CONFIG_ALERTAS = {
  rojo: {
    nivel: 'rojo',
    etiqueta: 'SATURACIÓN',
    subtitulo: 'Supera el percentil p90 histórico del servicio',
    colorTexto: 'text-[var(--mf-crit)]',
    colorBg: 'bg-[var(--mf-crit-soft)]',
    colorBorder: 'border-[var(--mf-crit-border)]',
    colorDot: 'bg-[var(--mf-crit)]',
    iconoColor: 'text-[var(--mf-crit)]',
    badgeClass: 'mf-badge-crit',
    accion: 'Demanda crítica por encima de p90: reasignar turnos clínicos y priorizar altas pendientes.',
  },
  amarillo: {
    nivel: 'amarillo',
    etiqueta: 'ALTA DEMANDA',
    subtitulo: 'Afluencia situada entre p75 y p90',
    colorTexto: 'text-[var(--mf-warn)]',
    colorBg: 'bg-[var(--mf-warn-soft)]',
    colorBorder: 'border-[var(--mf-warn-border)]',
    colorDot: 'bg-[var(--mf-warn)]',
    iconoColor: 'text-[var(--mf-warn)]',
    badgeClass: 'mf-badge-warn',
    accion: 'Vigilar salas de espera y confirmar disponibilidad de dotación antes del pico.',
  },
  verde: {
    nivel: 'verde',
    etiqueta: 'NORMAL',
    subtitulo: 'Demanda dentro del rango habitual (< p75)',
    colorTexto: 'text-[var(--mf-ok)]',
    colorBg: 'bg-[var(--mf-ok-soft)]',
    colorBorder: 'border-[var(--mf-ok-border)]',
    colorDot: 'bg-[var(--mf-ok)]',
    iconoColor: 'text-[var(--mf-ok)]',
    badgeClass: 'mf-badge-ok',
    accion: 'Operación dentro del comportamiento histórico esperado. Capacidad adecuada.',
  },
};

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Rango de la base del hospital (docs/inventario_base.md): datos del 2023-01-01 al 2026-07-16
// (último día completo). La fecha base se limita para que la ventana de 7 días no salga del rango.
export const FECHA_INICIO_DATOS = '2023-01-01';
export const FECHA_FIN_DATOS = '2026-07-16';
export const DIAS_VENTANA = 7;
export const FECHA_BASE_MAXIMA = '2026-07-10';
export const FECHA_BASE_POR_DEFECTO = FECHA_BASE_MAXIMA;

/** Ajusta una fecha 'YYYY-MM-DD' al rango válido para la fecha base del simulador. */
export function limitarFechaBase(fecha) {
  if (!fecha) return FECHA_BASE_POR_DEFECTO;
  if (fecha < FECHA_INICIO_DATOS) return FECHA_INICIO_DATOS;
  if (fecha > FECHA_BASE_MAXIMA) return FECHA_BASE_MAXIMA;
  return fecha;
}
