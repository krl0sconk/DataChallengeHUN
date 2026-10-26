import { useState, useMemo } from 'react';
import { SERVICIOS, CONFIG_ALERTAS, DIAS_SEMANA } from '../constants/servicios';

export function useDemandaSimulator(servicioInicial = 'urgencias') {
  const [servicioId, setServicioId] = useState(servicioInicial);
  const [lluviaMm, setLluviaMm] = useState(0);
  const [esFestivo, setEsFestivo] = useState(false);
  const [esQuincena, setEsQuincena] = useState(false);
  const [esCarnaval, setEsCarnaval] = useState(false);

  const servicio = SERVICIOS[servicioId] ?? SERVICIOS.urgencias;

  const resultado = useMemo(() => {
    const { mediaDiaria, p75, p90, p10Ratio, p90Ratio, id } = servicio;
    const esUrgencias = id === 'urgencias';
    const desgloses = [];
    let delta = 0;

    // Ajustes por calendario y eventos locales (Barranquilla / Soledad)
    if (esFestivo) {
      // Urgencias sube por accidentalidad/traslados; consulta externa y rehab caen
      const val = Math.round(mediaDiaria * (esUrgencias ? 0.12 : -0.7));
      delta += val;
      desgloses.push({ nombre: 'Festivo / Puente', aporte: val });
    }

    if (lluviaMm > 15) {
      // En aguaceros fuertes sube la demanda respiratoria y traumas
      const val = Math.round(mediaDiaria * (lluviaMm / 100) * 0.15);
      delta += val;
      desgloses.push({ nombre: `Lluvia (${lluviaMm}mm)`, aporte: val });
    }

    if (esQuincena) {
      const val = Math.round(mediaDiaria * 0.05);
      delta += val;
      desgloses.push({ nombre: 'Pago de Quincena', aporte: val });
    }

    if (esCarnaval) {
      // Pico critico en urgencias durante 4 dias de fiesta
      const val = Math.round(mediaDiaria * (esUrgencias ? 0.2 : -0.55));
      delta += val;
      desgloses.push({ nombre: 'Carnaval de Barranquilla', aporte: val });
    }

    const prediccion = Math.max(1, mediaDiaria + delta);
    const p10 = Math.round(prediccion * p10Ratio);
    const p90Val = Math.round(prediccion * p90Ratio);

    // Semáforo según umbrales de corte historicos
    const nivelAlerta = prediccion > p90 ? 'rojo' : prediccion >= p75 ? 'amarillo' : 'verde';

    // Curva semanal proyectada (horizonte t+1..t+7)
    const hoy = new Date();
    const serie7d = Array.from({ length: 7 }, (_, i) => {
      const f = new Date(hoy);
      f.setDate(hoy.getDate() + i);
      const diaSem = f.getDay();

      // Curva estacional de urgencias vs ambulatorio
      let peso = 1.0;
      if (esUrgencias) {
        if (diaSem === 1) peso = 1.08; // Lunes rebote
        else if (diaSem === 0 || diaSem === 6) peso = 1.04;
      } else if (id === 'rehabilitacion') {
        if (diaSem === 0) peso = 0.15; // Domingo cerrado
        else if (diaSem === 6) peso = 0.6; // Sabado horario corto
      }

      const pDia = Math.round(prediccion * peso);
      return {
        dia: `${DIAS_SEMANA[diaSem]} ${f.getDate()}`,
        prediccion: pDia,
        min: Math.round(pDia * p10Ratio),
        max: Math.round(pDia * p90Ratio),
        p75,
        p90,
      };
    });

    return {
      prediccion,
      p10,
      p90: p90Val,
      alerta: CONFIG_ALERTAS[nivelAlerta],
      factores: desgloses.sort((a, b) => Math.abs(b.aporte) - Math.abs(a.aporte)),
      serie7d,
      deltaTotal: delta,
    };
  }, [servicio, lluviaMm, esFestivo, esQuincena, esCarnaval]);

  return {
    servicio,
    serviciosDisponibles: Object.values(SERVICIOS),
    servicioActivoId: servicioId,
    setServicioActivoId: setServicioId,
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
