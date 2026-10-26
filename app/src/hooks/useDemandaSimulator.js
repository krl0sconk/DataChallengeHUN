import { useMemo, useState } from 'react';
import { CONFIG_ALERTAS, DIAS_SEMANA, SERVICIOS } from '../constants/servicios';

export function useDemandaSimulator(servicioDefault = 'urgencias') {
  const [servicioSel, setServicioSel] = useState(servicioDefault);
  const [lluvia, setLluvia] = useState(0);
  const [temperatura, setTemperatura] = useState(31); // 26°C a 42°C (sensación térmica Soledad/Barranquilla)
  const [alertaDengue, setAlertaDengue] = useState(false); // SIVIGILA brote dengue lag2s
  const [puente, setPuente] = useState(false);
  const [quincena, setQuincena] = useState(false);
  const [carnaval, setCarnaval] = useState(false);
  const [postFestivo, setPostFestivo] = useState(false); // Efecto rebote primer día hábil post-puente
  const [vacaciones, setVacaciones] = useState(false); // Vacaciones escolares calendario A

  const servicio = SERVICIOS[servicioSel] ?? SERVICIOS.urgencias;

  const proyeccion = useMemo(() => {
    const { mediaDiaria, p75, p90, p10Ratio, p90Ratio, id } = servicio;
    const esUrg = id === 'urgencias';
    const esRehab = id === 'rehabilitacion';
    const factoresEfecto = [];
    let variacion = 0;

    // 1. Clima: Precipitación (Open-Meteo Soledad)
    if (lluvia > 15) {
      // Lluvia torrencial en Barranquilla (arroyos): retrasa consulta ambulatoria pero satura urgencias
      const factorLluvia = esUrg ? 0.16 : -0.25;
      const impacto = Math.round(mediaDiaria * (lluvia / 100) * factorLluvia);
      variacion += impacto;
      factoresEfecto.push({ nombre: `Lluvia (${lluvia}mm)`, aporte: impacto });
    }

    // 2. Clima: Ola de calor / Sensación térmica extrema (>35°C p90 climatológico)
    if (temperatura >= 36) {
      const deltaCalor = (temperatura - 35) * 0.03; // +3% por cada grado sobre 35°C
      const factorCalor = esUrg ? deltaCalor : -deltaCalor * 0.5;
      const impacto = Math.round(mediaDiaria * factorCalor);
      variacion += impacto;
      factoresEfecto.push({ nombre: `Calor extremo (${temperatura}°C)`, aporte: impacto });
    }

    // 3. Epidemiología: Alerta Dengue / Arbovirosis (SIVIGILA INS)
    if (alertaDengue) {
      // El pico de dengue satura urgencias con cuadros febriles pediátricos y adultos
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.18 : 0.02));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Brote Dengue (SIVIGILA)', aporte: impacto });
    }

    // 4. Calendario: Puente festivo
    if (puente) {
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.12 : -0.7));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Puente festivo', aporte: impacto });
    }

    // 5. Calendario: Día post-festivo (efecto rebote acumulado)
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

    // 7. Calendario: Temporada Carnaval (Atlántico)
    if (carnaval) {
      const impacto = Math.round(mediaDiaria * (esUrg ? 0.22 : -0.6));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Carnaval Barranquilla', aporte: impacto });
    }

    // 8. Calendario: Vacaciones escolares (Calendario A)
    if (vacaciones) {
      const impacto = Math.round(mediaDiaria * (esRehab ? -0.18 : -0.05));
      variacion += impacto;
      factoresEfecto.push({ nombre: 'Vacaciones escolares', aporte: impacto });
    }

    const estimado = Math.max(1, mediaDiaria + variacion);
    const minimo = Math.round(estimado * p10Ratio);
    const maximo = Math.round(estimado * p90Ratio);

    const semaforo = estimado > p90 ? 'rojo' : estimado >= p75 ? 'amarillo' : 'verde';

    // Proyección móvil a 7 días sincronizada
    const hoy = new Date();
    const timeline = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      const dia = fecha.getDay();

      let ponderador = 1.0;
      if (esUrg) {
        if (dia === 1) ponderador = 1.08;
        else if (dia === 0 || dia === 6) ponderador = 1.04;
      } else if (esRehab) {
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
      deltaTotal: variacion,
      factores: factoresEfecto,
      alerta: CONFIG_ALERTAS[semaforo],
      serie7d: timeline,
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
  ]);

  // Función para resetear todos los controles a valores basales normales
  const resetearEscenario = () => {
    setLluvia(0);
    setTemperatura(31);
    setAlertaDengue(false);
    setPuente(false);
    setQuincena(false);
    setCarnaval(false);
    setPostFestivo(false);
    setVacaciones(false);
  };

  // Presets preconfigurados rápidos para estrés hospitalario
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
    resetearEscenario,
    aplicarPreset,
    proyeccion,
  };
}
