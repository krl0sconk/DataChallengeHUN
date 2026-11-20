export function optimizationPayload({ modoDemanda, dotacionHabitual, dotacionAlternativa, ...base }) {
  if (modoDemanda === 'pronostico') {
    return { ...base, modo_demanda: 'pronostico', dotacion_referencia: dotacionHabitual };
  }
  return {
    ...base,
    modo_demanda: 'historico',
    dotacion_habitual: dotacionHabitual,
    dotacion_alternativa: dotacionAlternativa,
  };
}
