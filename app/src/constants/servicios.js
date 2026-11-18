export const SERVICIOS = {
  urgencias: {
    id: 'urgencias',
    nombre: 'Urgencias',
    codigo: 'OMOP 9203',
    mediaDiaria: 443,
    p75: 490,
    p90: 540,
    color: '#2C7A9B',
  },
  rehabilitacion: {
    id: 'rehabilitacion',
    nombre: 'Rehabilitación Ambulatoria',
    codigo: 'OMOP 581479',
    mediaDiaria: 827,
    p75: 880,
    p90: 940,
    color: '#102A43',
  },
  tratamiento_urgencia: {
    id: 'tratamiento_urgencia',
    nombre: 'Tratamiento Urgencias',
    codigo: 'OMOP 3045729',
    mediaDiaria: 15,
    p75: 18,
    p90: 22,
    color: '#14516B',
  },
};

export const CONFIG_ALERTAS = {
  rojo: {
    nivel: 'rojo',
    etiqueta: 'SATURACIÓN',
    subtitulo: 'Supera el percentil p90 histórico del servicio',
    colorTexto: 'text-[#8A1828] dark:text-[#FFA8B6]',
    colorBg: 'bg-[#FDF0F2] dark:bg-[#0E3E5B]',
    colorBorder: 'border-[#EBAAB5] dark:border-[#C5304C]/60',
    colorDot: 'bg-[#C5304C]',
    iconoColor: 'text-[#A81F38] dark:text-[#FFA8B6]',
    accion: 'Demanda crítica por encima del p90: reasignar turnos médicos y agilizar altas pendientes.',
  },
  amarillo: {
    nivel: 'amarillo',
    etiqueta: 'ALTA DEMANDA',
    subtitulo: 'Afluencia situada entre p75 y p90',
    colorTexto: 'text-[#704200] dark:text-[#FFDF80]',
    colorBg: 'bg-[#FEF9E2] dark:bg-[#0E3E5B]',
    colorBorder: 'border-[#DFC264] dark:border-[#D98A00]/60',
    colorDot: 'bg-[#B26B00]',
    iconoColor: 'text-[#B26B00] dark:text-[#FFDF80]',
    accion: 'Monitorear flujo en salas de espera y verificar disponibilidad de personal asistencial.',
  },
  verde: {
    nivel: 'verde',
    etiqueta: 'NORMAL',
    subtitulo: 'Demanda dentro de rangos habituales (< p75)',
    colorTexto: 'text-[#0C4A62] dark:text-[#9FE4F5]',
    colorBg: 'bg-[#E8F6FA] dark:bg-[#0E3E5B]',
    colorBorder: 'border-[#71B5CC] dark:border-[#19506B]',
    colorDot: 'bg-[#187A9D] dark:bg-[#4ADE80]',
    iconoColor: 'text-[#0C4A62] dark:text-[#9FE4F5]',
    accion: 'Operación dentro del histórico normal. Capacidad asistencial adecuada.',
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

