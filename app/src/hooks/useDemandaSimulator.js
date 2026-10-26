import { useMemo, useState } from 'react';
import { CONFIG_ALERTAS, DIAS_SEMANA, SERVICIOS } from '../constants/servicios';

/**
 * Custom Hook para encapsular el estado y los cálculos del simulador de demanda hospitalaria.
 * Aplica lógica de negocio, elasticidades empíricas y proyecciones a 7 días.
 *
 * @param {string} servicioInicialId - Identificador del servicio inicial
 * @returns {Object} Estado del simulador y resultados calculados
 */
export function useDemandaSimulator(servicioInicialId = 'urgencias') {
  const [servicioActivoId, setServicioActivoId] = useState(servicioInicialId);
  const [lluviaMm, setLluviaMm] = useState(0);
  const [esFestivo, setEsFestivo] = useState(false);
  const [esQuincena, setEsQuincena] = useState(false);
  const [esCarnaval, setEsCarnaval] = useState(false);

  const servicio = SERVICIOS[servicioActivoId] || SERVICIOS.urgencias;

  const resultado = useMemo(() => {
    let delta = 0;
    const factoresShap = [];

    // 1. Efecto Festivo / Puente
    if (esFestivo) {
      const fDelta =
        servicio.id === 'urgencias'
          ? Math.round(servicio.mediaDiaria * 0.12)
          : -Math.round(servicio.mediaDiaria * 0.70);
      delta += fDelta;
      factoresShap.push({ nombre: 'Festivo / Puente', aporte: fDelta });
    }

    // 2. Efecto Precipitación (Lluvia en Soledad / Barranquilla)
    if (lluviaMm > 15) {
      const lDelta = Math.round(servicio.mediaDiaria * (lluviaMm / 100) * 0.15);
      delta += lDelta;
      factoresShap.push({ nombre: `Lluvia (${lluviaMm}mm)`, aporte: lDelta });
    }

    // 3. Efecto Pago de Quincena (Días 15 y 30)
    if (esQuincena) {
      const qDelta = Math.round(servicio.mediaDiaria * 0.05);
      delta += qDelta;
      factoresShap.push({ nombre: 'Pago de Quincena', aporte: qDelta });
    }

    // 4. Efecto Carnaval de Barranquilla
    if (esCarnaval) {
      const cDelta =
        servicio.id === 'urgencias'
          ? Math.round(servicio.mediaDiaria * 0.20)
          : -Math.round(servicio.mediaDiaria * 0.55);
      delta += cDelta;
      factoresShap.push({ nombre: 'Carnaval de Barranquilla', aporte: cDelta });
    }

    const prediccion = Math.max(1, servicio.mediaDiaria + delta);
    const p10 = Math.round(prediccion * servicio.p10Ratio);
    const p90 = Math.round(prediccion * servicio.p90Ratio);

    // Nivel de alerta por percentiles históricos
    let alertaId = 'verde';
    if (prediccion > servicio.p90) alertaId = 'rojo';
    else if (prediccion >= servicio.p75) alertaId = 'amarillo';

    const infoAlerta = CONFIG_ALERTAS[alertaId];

    // Proyección de serie temporal a 7 días
    const fechaBase = new Date();
    const serie7d = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(fechaBase);
      fecha.setDate(fechaBase.getDate() + i);
      const diaNum = fecha.getDay();

      let factorEstacional = 1.0;
      if (servicio.id === 'urgencias') {
        if (diaNum === 1) factorEstacional = 1.08; // Lunes pico
        else if (diaNum === 0 || diaNum === 6) factorEstacional = 1.04;
      } else if (servicio.id === 'rehabilitacion') {
        if (diaNum === 0) factorEstacional = 0.15; // Cierre domingo
        else if (diaNum === 6) factorEstacional = 0.60; // Sábado reducido
      }

      const pDia = Math.round(prediccion * factorEstacional);
      return {
        dia: `${DIAS_SEMANA[diaNum]} ${fecha.getDate()}`,
        prediccion: pDia,
        min: Math.round(pDia * servicio.p10Ratio),
        max: Math.round(pDia * servicio.p90Ratio),
        p75: servicio.p75,
        p90: servicio.p90,
      };
    });

    return {
      prediccion,
      p10,
      p90,
      alerta: infoAlerta,
      factores: factoresShap.sort((a, b) => Math.abs(b.aporte) - Math.abs(a.aporte)),
      serie7d,
      deltaTotal: delta,
    };
  }, [servicio, lluviaMm, esFestivo, esQuincena, esCarnaval]);

  return {
    servicio,
    serviciosDisponibles: Object.values(SERVICIOS),
    servicioActivoId,
    setServicioActivoId,
    lluviaMm,
    setLluviaMm,
    esFestivo,
    setEsFestivo,
    esQuincena,
    setEsQuincena,
    esCarnaval,
    setEsCarnaval,
    resultado,
  };
}
