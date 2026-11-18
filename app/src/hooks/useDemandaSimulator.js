import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CONFIG_ALERTAS,
  DIAS_SEMANA,
  FECHA_BASE_POR_DEFECTO,
  limitarFechaBase,
  SERVICIOS,
} from '../constants/servicios';
import { getServicios, predecirRango } from '../lib/api';

// Diccionario en memoria para respuestas de predicción canónica (0ms)
const prediccionCache = new Map();

export function useDemandaSimulator(servicioDefault = 'urgencias') {
  const [servicioSel, setServicioSel] = useState(servicioDefault);
  const [serviciosApi, setServiciosApi] = useState({});
  const [apiData, setApiData] = useState(null);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Sincronización dinámica de servicios, medias y umbrales p75/p90 desde Python
  useEffect(() => {
    let activo = true;
    getServicios()
      .then((lista) => {
        if (!activo || !Array.isArray(lista)) return;
        const mapa = {};
        lista.forEach((s) => {
          mapa[s.id] = s;
        });
        setServiciosApi(mapa);
      })
      .catch(() => {
        // Si la API aún no responde, se reintenta con el flujo principal
      });
    return () => { activo = false; };
  }, []);

  // La base termina el 2026-07-16: no se usa la fecha de hoy (DEC-002).
  const [fechaSimulacion, setFechaSimulacionCruda] = useState(FECHA_BASE_POR_DEFECTO);
  const setFechaSimulacion = (fecha) => {
    if (fecha) setFechaSimulacionCruda(limitarFechaBase(fecha));
  };

  const servicioBase = SERVICIOS[servicioSel] ?? SERVICIOS.urgencias;
  const servicioRemoto = serviciosApi[servicioBase.id];
  const servicio = {
    ...servicioBase,
    mediaDiaria: servicioRemoto?.mediaDiaria ?? 0,
    p75: servicioRemoto?.p75 ?? 0,
    p90: servicioRemoto?.p90 ?? 0,
  };

  const consultarApi = useCallback(async (forzar = false) => {
    const cacheKey = `${servicioSel}_${fechaSimulacion}`;

    if (!forzar && prediccionCache.has(cacheKey)) {
      setApiData(prediccionCache.get(cacheKey));
      setIsApiConnected(true);
      setIsLoading(false);
      setApiError(null);
      return;
    }

    setApiData(null);
    setIsLoading(true);
    try {
      const data = await predecirRango({
        fecha_inicio: fechaSimulacion,
        dias: 14,
        servicio: servicioSel,
      });
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

  // Calienta la caché para que cambiar de servicio no obligue a esperar el cálculo
  // pesado del modelo si el usuario visita otra pestaña del mismo horizonte.
  useEffect(() => {
    if (!isApiConnected || !apiData) return;
    Object.keys(SERVICIOS).filter((id) => id !== servicioSel).forEach((id, index) => {
      const cacheKey = `${id}_${fechaSimulacion}`;
      if (prediccionCache.has(cacheKey)) return;
      window.setTimeout(async () => {
        try {
          const data = await predecirRango({ fecha_inicio: fechaSimulacion, dias: 14, servicio: id });
          prediccionCache.set(cacheKey, data);
        } catch {
          // La petición principal sigue siendo la fuente de verdad si falla la precarga.
        }
      }, (index + 1) * 150);
    });
  }, [isApiConnected, apiData, fechaSimulacion, servicioSel]);

  const proyeccion = useMemo(() => {
    const { p75, p90 } = servicio;

    const [y, m, d] = fechaSimulacion.split('-').map(Number);
    const baseFecha = new Date(y, m - 1, d);

    // Si la API está conectada, no está cargando y el servicio coincide, usar datos de Python
    const servicioCoincide = !apiData?.servicio || apiData.servicio.toLowerCase() === servicioSel.toLowerCase();
    if (isApiConnected && !isLoading && apiData && servicioCoincide) {
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
          min: punto.min,
          max: punto.max,
          factores: punto.factores || [],
          p75: punto.p75 ?? p75,
          p90: punto.p90 ?? p90,
        };
      });

      return {
        prediccion: apiData.prediccion,
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

