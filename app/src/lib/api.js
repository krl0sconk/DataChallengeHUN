// En desarrollo se usa el proxy de Vite; en producción se inyecta VITE_API_URL.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
