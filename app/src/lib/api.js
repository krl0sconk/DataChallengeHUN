import { getCachedJson } from './apiCache';

// En desarrollo se usa el proxy de Vite; en producción se inyecta VITE_API_URL.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function postJson(path, payload) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${path}`);
  }
  return response.json();
}

export function predecirRango(payload) {
  return postJson('/api/predecir-rango', payload);
}

export function enviarMensajeChat(payload) {
  return postJson('/api/chat', payload);
}

export function getServicios() {
  return getCachedJson(apiUrl('/api/servicios'));
}

export function getOptimizacion() {
  return getCachedJson(apiUrl('/api/optimizacion'));
}

export function simularOptimizacion(payload) {
  return postJson('/api/optimizacion/simular', payload);
}

export function getOcupacion() {
  return getCachedJson(apiUrl('/api/ocupacion'));
}

export function getEfectosEventos(servicioId) {
  return getCachedJson(apiUrl(`/api/efectos-eventos/${servicioId}`));
}

export function getTurnos(servicioId) {
  return getCachedJson(apiUrl(`/api/turnos/${servicioId}`));
}

export function getLargoPlazo(servicioId, params = {}) {
  const query = new URLSearchParams(params).toString();
  const path = query ? `/api/largo-plazo/${servicioId}?${query}` : `/api/largo-plazo/${servicioId}`;
  return getCachedJson(apiUrl(path));
}

export function getParametros() {
  return getCachedJson(apiUrl('/api/parametros'));
}

export function getComparacion(servicioId, query = '') {
  const path = query ? `/api/comparacion/${servicioId}?${query}` : `/api/comparacion/${servicioId}`;
  return getCachedJson(apiUrl(path));
}

export function getCuellosBotella() {
  return getCachedJson(apiUrl('/api/cuellos-botella'));
}
