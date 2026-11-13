import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CONFIG_ALERTAS,
  DIAS_SEMANA,
  FECHA_BASE_POR_DEFECTO,
  limitarFechaBase,
  SERVICIOS,
} from '../constants/servicios';

const API_BASE_URL = 'http://localhost:8000';

// Diccionario en memoria para respuestas de predicción canónica (0ms)
const prediccionCache = new Map();

export function useDemandaSimulator(servicioDefault = 'urgencias') {
  const [servicioSel, setServicioSel] = useState(servicioDefault);
  const [apiData, setApiData] = useState(null);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // La base termina el 2026-07-16: no se usa la fecha de hoy (DEC-002).
  const [fechaSimulacion, setFechaSimulacionCruda] = useState(FECHA_BASE_POR_DEFECTO);
  const setFechaSimulacion = (fecha) => {
    if (fecha) setFechaSimulacionCruda(limitarFechaBase(fecha));
  };

  const servicio = SERVICIOS[servicioSel] ?? SERVICIOS.urgencias;

  const consultarApi = useCallback(async (forzar = false) => {
    const cacheKey = `${servicioSel}_${fechaSimulacion}`;

    if (!forzar && prediccionCache.has(cacheKey)) {
      setApiData(prediccionCache.get(cacheKey));
      setIsApiConnected(true);
      setIsLoading(false);
      setApiError(null);
      return;
    }

    setIsLoading(true);
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/predecir-rango`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha_inicio: fechaSimulacion,
          dias: 14,
          servicio: servicioSel,
        }),
      });

      if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
      }

      const data = await respuesta.json();
      prediccionCache.set(cacheKey, data);
      setApiData(data);
      setIsApiConnected(true);
      setIsLoading(false);
      setApiError(null);
    } catch (err) {
      setIsApiConnected(false);
      setIsLoading(false);
      setApiError(err.message || 'Error de conexión');
    }
  }, [fechaSimulacion, servicioSel]);

  // Consulta al cambiar fecha o servicio
  useEffect(() => {
    consultarApi();
  }, [consultarApi]);

  // Reconexión automática cada 4 segundos si el servidor estaba desconectado
  useEffect(() => {
    if (isApiConnected) return;

    const intervalo = setInterval(() => {
      consultarApi(true);
    }, 4000);

    return () => clearInterval(intervalo);
  }, [isApiConnected, consultarApi]);

  const proyeccion = useMemo(() => {
    const { p75, p90 } = servicio;

    const [y, m, d] = fechaSimulacion.split('-').map(Number);
    const baseFecha = new Date(y, m - 1, d);

    // Si la API está conectada, toda la proyección proviene exclusivamente de Python
    if (isApiConnected && apiData) {
      const alertaNivel = apiData.alerta;
      const timeline = (apiData.serie || []).map((punto, i) => {
        const fecha = new Date(baseFecha);
        fecha.setDate(baseFecha.getDate() + i);
        const diaSem = fecha.getDay();

        return {
          dia: `${DIAS_SEMANA[diaSem]} ${fecha.getDate()}`,
          simulado: punto.simulado ?? punto.prediccion,
          habitual: punto.habitual ?? punto.prediccion,
          prediccion: punto.prediccion,
          real: punto.real ?? null,
          min: punto.min,
          max: punto.max,
          factores: punto.factores || [],
          p75: punto.p75 ?? p75,
          p90: punto.p90 ?? p90,
        };
      });

      return {
        prediccion: apiData.prediccion,
        real: apiData.real ?? null,
        min: apiData.min,
        max: apiData.max,
        deltaTotal: apiData.delta_total ?? 0,
        factores: apiData.factores || [],
        alerta: CONFIG_ALERTAS[alertaNivel] || CONFIG_ALERTAS.verde,
        serie7d: timeline,
        fechaBase: fechaSimulacion,
        origenModelo: 'fastapi',
        conectado: true,
      };
    }

    // Sin conexión: no se inventan cálculos en frontend
    return {
      prediccion: 0,
      real: null,
      min: 0,
      max: 0,
      deltaTotal: 0,
      factores: [],
      alerta: CONFIG_ALERTAS.verde,
      serie7d: [],
      fechaBase: fechaSimulacion,
      origenModelo: 'desconectado',
      conectado: false,
    };
  }, [
    servicio,
    fechaSimulacion,
    apiData,
    isApiConnected,
  ]);

  return {
    servicio,
    listaServicios: Object.values(SERVICIOS),
    servicioSel,
    setServicioSel,
    fechaSimulacion,
    setFechaSimulacion,
    proyeccion,
    isApiConnected,
    isLoading,
    apiError,
    reintentarConexion: () => consultarApi(true),
  };
}
