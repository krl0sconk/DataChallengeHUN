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
    color: '#BD5579',
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
    color: '#2D8A68', // Verde bosque armónico
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
    color: '#286B94', // Azul cerúleo armónico
  },
};

export const CONFIG_ALERTAS = {
  rojo: {
    nivel: 'rojo',
    etiqueta: 'SATURACIÓN',
    subtitulo: 'Supera el percentil p90 histórico',
    colorTexto: 'text-[#871C35]',
    colorBg: 'bg-[#FBE8EC]',
    colorBorder: 'border-[#EA9D9D]',
    colorDot: 'bg-[#C5304C]',
    iconoColor: 'text-[#C5304C]',
    accion: 'Coordinar refuerzo en triaje y habilitar camas de observación.',
  },
  amarillo: {
    nivel: 'amarillo',
    etiqueta: 'ALTA DEMANDA',
    subtitulo: 'Demanda situada entre p75 y p90',
    colorTexto: 'text-[#8C5800]',
    colorBg: 'bg-[#FFF6DB]',
    colorBorder: 'border-[#FFEBB8]',
    colorDot: 'bg-[#D98A00]',
    iconoColor: 'text-[#D98A00]',
    accion: 'Monitorear salas de espera. Turno de apoyo asistencial en alerta.',
  },
  verde: {
    nivel: 'verde',
    etiqueta: 'NORMAL',
    subtitulo: 'Demanda dentro de rangos habituales (< p75)',
    colorTexto: 'text-[#1B6145]',
    colorBg: 'bg-[#EBF7F1]',
    colorBorder: 'border-[#A3D9C3]',
    colorDot: 'bg-[#2D8A68]',
    iconoColor: 'text-[#2D8A68]',
    accion: 'Capacidad operativa adecuada. No se requieren traslados ni refuerzo.',
  },
};

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
