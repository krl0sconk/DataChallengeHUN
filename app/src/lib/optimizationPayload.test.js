import assert from 'node:assert/strict';
import test from 'node:test';
import { optimizationPayload } from './optimizationPayload.js';

test('el pronóstico envía referencia y no una alternativa que el motor ignoraría', () => {
  const result = optimizationPayload({
    modoDemanda: 'pronostico', dotacionHabitual: 12, dotacionAlternativa: 15,
    servicio: 'urgencias', fecha: '2026-07-06',
  });
  assert.deepEqual(result, {
    servicio: 'urgencias', fecha: '2026-07-06',
    modo_demanda: 'pronostico', dotacion_referencia: 12,
  });
});

test('el histórico conserva la comparación manual habitual y alternativa', () => {
  assert.deepEqual(optimizationPayload({
    modoDemanda: 'historico', dotacionHabitual: 12, dotacionAlternativa: 15,
  }), { modo_demanda: 'historico', dotacion_habitual: 12, dotacion_alternativa: 15 });
});

test('sin dotación manual el pronóstico conserva referencia nula', () => {
  assert.equal(optimizationPayload({
    modoDemanda: 'pronostico', dotacionHabitual: null,
  }).dotacion_referencia, null);
});
