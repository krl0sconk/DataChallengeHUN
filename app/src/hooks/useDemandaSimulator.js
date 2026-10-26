import { useState, useMemo } from 'react';
import { SERVICIOS, CONFIG_ALERTAS, DIAS_SEMANA } from '../constants/servicios';

export function useDemandaSimulator(servicioDefault = 'urgencias') {
  const [servicioSel, setServicioSel] = useState(servicioDefault);
  const [lluvia, setLluvia] = useState(0);
  const [puente, setPuente] = useState(false);
  const [quincena, setQuincena] = useState(false);
  const [carnaval, setCarnaval] = useState(false);

  const servicio = SERVICIOS[servicioSel] ?? SERVICIOS.urgencias;

  const proyeccion = useMemo(() => {
    const { mediaDiaria, p75, p90, p10Ratio, p90Ratio, id } = servicio;
    const esUrg = id === 'urgencias';
    const factoresEfecto = [];
    let variacion = 0;

    // Reglas de negocio locales (Atlántico / Barranquilla)
    if (puente) {
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.12 : -0.7));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Puente festivo', aporte: impacto });
    }

    if (lluvia > 15) {
      const impacto = Math.round(mediaDiaria * (lluvia / 100) * 0.15);
      variacion += impacto;
      factoresEfecto.push({ nombre: `Lluvia (${lluvia}mm)`, aporte: impacto });
    }

    if (quincena) {
      const impacto = Math.round(mediaDiaria * 0.05);
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Quincena', aporte: impacto });
    }

    if (carnaval) {
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.2 : -0.55));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Temporada Carnaval', aporte: impacto });
    }

    const estimado = Math.max(1, mediaDiaria + variacion);
    const minimo = Math.round(estimado * p10Ratio);
    const maximo = Math.round(estimado * p90Ratio);

    const semaforo = estimado > p90 ? 'rojo' : estimado >= p75 ? 'amarillo' : 'verde';

    // Proyección móvil a 7 días
    const hoy = new Date();
    const timeline = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      const dia = fecha.getDay();

      let ponderador = 1.0;
      if (esUrg) {
        if (dia === 1) ponderador = 1.08;
        else if (dia === 0 || dia === 6) ponderador = 1.04;
      } else if (id === 'rehabilitacion') {
        if (dia === 0) ponderador = 0.15;
        else if (dia === 6) ponderador = 0.6;
      }

      const valorDia = Math.round(estimado * ponderador);
      return {
        dia: `${DIAS_SEMANA[dia]} ${fecha.getDate()}`,
        prediccion: valorDia,
        min: Math.round(valorDia * p10Ratio),
        max: Math.round(valorDia * p90Ratio),
        p75,
        p90,
      };
    });

    return {
      prediccion: estimado,
      min: minimo,
      max: maximo,
      alerta: CONFIG_ALERTAS[semaforo],
      factores: factoresEfecto.sort((a, b) => Math.abs(b.aporte) - Math.abs(a.aporte)),
      serie7d: timeline,
      deltaTotal: variacion,
    };
  }, [servicio, lluvia, puente, quincena, carnaval]);

  return {
    servicio,
    listaServicios: Object.values(SERVICIOS),
    servicioSel,
    setServicioSel,
    lluvia,
    setLluvia,
    puente,
    setPuente,
    quincena,
    setQuincena,
    carnaval,
    setCarnaval,
    proyeccion,
  };
}
