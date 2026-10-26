import { useMemo, useState } from 'react';
import { CONFIG_ALERTAS, DIAS_SEMANA, SERVICIOS } from '../constants/servicios';

export function useDemandaSimulator(servicioDefault = 'urgencias') {
  const [servicioSel, setServicioSel] = useState(servicioDefault);
  const [lluvia, setLluvia] = useState(0);
  const [temperatura, setTemperatura] = useState(31);
  const [alertaDengue, setAlertaDengue] = useState(false);
  const [puente, setPuente] = useState(false);
  const [quincena, setQuincena] = useState(false);
  const [carnaval, setCarnaval] = useState(false);
  const [postFestivo, setPostFestivo] = useState(false);
  const [vacaciones, setVacaciones] = useState(false);
  // Fecha objetivo específica para la simulación (formato YYYY-MM-DD)
  const [fechaSimulacion, setFechaSimulacion] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const servicio = SERVICIOS[servicioSel] ?? SERVICIOS.urgencias;

  const proyeccion = useMemo(() => {
    const { mediaDiaria, p75, p90, p10Ratio, p90Ratio, id } = servicio;
    const esUrg = id === 'urgencias';
    const esRehab = id === 'rehabilitacion';
    const factoresEfecto = [];
    let variacion = 0;

    // 1. Clima: Precipitación
    if (lluvia > 15) {
      const factorLluvia = esUrg ? 0.16 : -0.25;
      const impacto = Math.round(mediaDiaria * (lluvia / 100) * factorLluvia);
      variacion += impacto;
      factoresEfecto.push({ nombre: `Lluvia (${lluvia}mm)`, aporte: impacto });
    }

    // 2. Clima: Sensación Térmica
    if (temperatura >= 36) {
      const deltaCalor = (temperatura - 35) * 0.03;
      const factorCalor = esUrg ? deltaCalor : -deltaCalor * 0.5;
      const impacto = Math.round(mediaDiaria * factorCalor);
      variacion += impacto;
      factoresEfecto.push({ nombre: `Calor extremo (${temperatura}°C)`, aporte: impacto });
    }

    // 3. Epidemiología: Dengue SIVIGILA
    if (alertaDengue) {
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.18 : 0.02));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Brote Dengue (SIVIGILA)', aporte: impacto });
    }

    // 4. Calendario: Puente
    if (puente) {
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.12 : -0.7));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Puente festivo', aporte: impacto });
    }

    // 5. Calendario: Rebote post-festivo
    if (postFestivo) {
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.15 : 0.28));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Rebote post-festivo', aporte: impacto });
    }

    // 6. Calendario: Quincena
    if (quincena) {
      const impacto = Math.round(mediaDiaria * 0.05);
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Día de quincena', aporte: impacto });
    }

    // 7. Calendario: Carnaval
    if (carnaval) {
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.22 : -0.6));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Carnaval Barranquilla', aporte: impacto });
    }

    // 8. Calendario: Vacaciones
    if (vacaciones) {
      const impacto = Math.round(mediaDiaria * (esRehab ? -0.18 : -0.05));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Vacaciones escolares', aporte: impacto });
    }

    const estimado = Math.max(1, mediaDiaria + variacion);
    const minimo = Math.round(estimado * p10Ratio);
    const maximo = Math.round(estimado * p90Ratio);

    const semaforo = estimado > p90 ? 'rojo' : estimado >= p75 ? 'amarillo' : 'verde';

    // Fecha base parseada para calcular la línea temporal
    const [y, m, d] = fechaSimulacion.split('-').map(Number);
    const baseFecha = new Date(y, m - 1, d);

    // Curva comparativa de 7 días: Proyección simulada vs Volumen Habitual (Basal)
    const timeline = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(baseFecha);
      fecha.setDate(baseFecha.getDate() + i);
      const diaSem = fecha.getDay();

      let ponderador = 1.0;
      if (esUrg) {
        if (diaSem === 1) ponderador = 1.08;
        else if (diaSem === 0 || diaSem === 6) ponderador = 1.04;
      } else if (esRehab) {
        if (diaSem === 0) ponderador = 0.15;
        else if (diaSem === 6) ponderador = 0.6;
      }

      const valorSimulado = Math.round(estimado * ponderador);
      const valorHabitual = Math.round(mediaDiaria * ponderador);

      return {
        dia: `${DIAS_SEMANA[diaSem]} ${fecha.getDate()}`,
        simulado: valorSimulado,
        habitual: valorHabitual,
        prediccion: valorSimulado, // retrocompatibilidad
        min: Math.round(valorSimulado * p10Ratio),
        max: Math.round(valorSimulado * p90Ratio),
        p75,
        p90,
      };
    });

    return {
      prediccion: estimado,
      min: minimo,
      max: maximo,
      deltaTotal: variacion,
      factores: factoresEfecto,
      alerta: CONFIG_ALERTAS[semaforo],
      serie7d: timeline,
      fechaBase: fechaSimulacion,
    };
  }, [
    servicio,
    lluvia,
    temperatura,
    alertaDengue,
    puente,
    quincena,
    carnaval,
    postFestivo,
    vacaciones,
    fechaSimulacion,
  ]);

  const resetearEscenario = () => {
    setLluvia(0);
    setTemperatura(31);
    setAlertaDengue(false);
    setPuente(false);
    setQuincena(false);
    setCarnaval(false);
    setPostFestivo(false);
    setVacaciones(false);
    setFechaSimulacion(new Date().toISOString().split('T')[0]);
  };

  const aplicarPreset = (tipo) => {
    resetearEscenario();
    if (tipo === 'arroyo_lluvia') {
      setLluvia(75);
    } else if (tipo === 'carnaval_pico') {
      setCarnaval(true);
      setQuincena(true);
      setTemperatura(37);
    } else if (tipo === 'brote_epidemia') {
      setAlertaDengue(true);
      setLluvia(35);
    } else if (tipo === 'rebote_puente') {
      setPostFestivo(true);
      setQuincena(true);
    }
  };

  return {
    servicio,
    listaServicios: Object.values(SERVICIOS),
    servicioSel,
    setServicioSel,
    lluvia,
    setLluvia,
    temperatura,
    setTemperatura,
    alertaDengue,
    setAlertaDengue,
    puente,
    setPuente,
    quincena,
    setQuincena,
    carnaval,
    setCarnaval,
    postFestivo,
    setPostFestivo,
    vacaciones,
    setVacaciones,
    fechaSimulacion,
    setFechaSimulacion,
    resetearEscenario,
    aplicarPreset,
    proyeccion,
  };
}
