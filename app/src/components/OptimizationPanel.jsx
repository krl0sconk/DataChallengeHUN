import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Info,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  FECHA_BASE_MAXIMA,
  FECHA_FIN_DATOS,
  FECHA_INICIO_DATOS,
} from '../constants/servicios';
import { getOptimizacion, simularOptimizacion } from '../lib/api';

const formato = (valor, decimales = 1) => (
  typeof valor === 'number' && Number.isFinite(valor)
    ? valor.toLocaleString('es-CO', { maximumFractionDigits: decimales })
    : 'No disponible'
);

const tarjeta = 'rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] p-5 space-y-3';
const palancas = {
  'equipos activos equivalentes': 'Erlang C',
  estancia: 'Ley de Little',
  'horario de alta': 'Altas tempranas',
  transferencia: 'Urgencias → Hospitalización',
};

const DOTACION_POR_DEFECTO = {
  urgencias: 12,
  rehabilitacion: 42,
  tratamiento_urgencia: 1,
};

const JORNADAS_DEMO = [
  { etiqueta: 'Lunes de alta presión (2026-07-06)', fecha: '2026-07-06' },
  { etiqueta: 'Jornada típica media (2026-07-08)', fecha: '2026-07-08' },
  { etiqueta: 'Fin de semana (2026-07-12)', fecha: '2026-07-12' },
];

const ESTILOS_ALERTA = {
  rojo: 'bg-[#FDF0F2] text-[#8A1828] border-[#EBAAB5] dark:bg-[#2E1118] dark:text-[#FFA8B6] dark:border-[#C5304C]/60',
  amarillo: 'bg-[#FEF9E2] text-[#704200] border-[#DFC264] dark:bg-[#241E0D] dark:text-[#FFDF80] dark:border-[#D98A00]/60',
  verde: 'bg-[#E8F6FA] text-[#0C4A62] border-[#71B5CC] dark:bg-[#071B2A] dark:text-[#9FE4F5] dark:border-[#19506B]',
};

const clampDotacion = (valor) => Math.max(1, Math.min(200, Math.round(Number(valor) || 1)));

function Control({ etiqueta, valor, min, max, unidad, onChange }) {
  return (
    <label className="block text-sm font-semibold space-y-2">
      <span className="flex justify-between gap-3">
        <span>{etiqueta}</span><span>{valor} {unidad}</span>
      </span>
      <input
        type="range" min={min} max={max} step="1" value={valor}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#14516B] dark:accent-[#B9E2F0]"
      />
    </label>
  );
}

export function OptimizationPanel({
  servicio,
  fechaSimulacion,
  onCambiarFecha,
  proyeccion,
}) {
  const dotacionBase = DOTACION_POR_DEFECTO[servicio.id] ?? 12;

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const [tiempo, setTiempo] = useState(20);
  const [meta, setMeta] = useState(15);
  const [reduccion, setReduccion] = useState(4);
  const [altas, setAltas] = useState(30);
  const [fechaJornada, setFechaJornada] = useState(() => fechaSimulacion || '2026-07-06');
  const [usarDotacionManual, setUsarDotacionManual] = useState(true);
  const [dotacionHabitual, setDotacionHabitual] = useState(dotacionBase);
  const [usarAlternativaManual, setUsarAlternativaManual] = useState(false);
  const [dotacionAlternativa, setDotacionAlternativa] = useState(Math.min(200, dotacionBase + 2));
  const [resultado, setResultado] = useState(null);
  const [errorSimulacion, setErrorSimulacion] = useState(null);

  useEffect(() => {
    if (fechaSimulacion) {
      setFechaJornada(fechaSimulacion);
    }
  }, [fechaSimulacion]);

  const seleccionarFechaJornada = (nuevaFecha) => {
    if (!nuevaFecha) return;
    setFechaJornada(nuevaFecha);
    if (onCambiarFecha && nuevaFecha >= FECHA_INICIO_DATOS && nuevaFecha <= FECHA_BASE_MAXIMA) {
      onCambiarFecha(nuevaFecha);
    }
  };

  useEffect(() => {
    let activo = true;
    setError(null);
    getOptimizacion()
      .then((data) => { if (activo) setDatos(data); })
      .catch(() => { if (activo) setError('Optimización no disponible. Verifique el paquete del modelo y la API.'); });
    return () => { activo = false; };
  }, [intento]);

  const clave = JSON.stringify({
    servicio: servicio.id,
    tiempo_servicio_min: tiempo,
    meta_espera_min: meta,
    reduccion_estancia_horas: reduccion,
    pct_altas_tempranas: altas,
    fecha: fechaJornada || null,
    dotacion_habitual: usarDotacionManual ? clampDotacion(dotacionHabitual) : null,
    dotacion_alternativa: usarAlternativaManual ? clampDotacion(dotacionAlternativa) : null,
  });

  useEffect(() => {
    if (!datos) return;
    let activo = true;
    setErrorSimulacion(null);
    // Agrupar movimientos del control y descartar respuestas de configuraciones anteriores.
    const timer = window.setTimeout(() => {
      simularOptimizacion(JSON.parse(clave))
        .then((data) => { if (activo) setResultado({ clave, datos: data }); })
        .catch(() => {
          if (activo) {
            setResultado(null);
            setErrorSimulacion('No se pudo calcular el escenario. Cambie un control para reintentar.');
          }
        });
    }, 250);
    return () => { activo = false; window.clearTimeout(timer); };
  }, [datos, clave]);

  const simulacion = resultado?.clave === clave ? resultado.datos : null;
  const little = datos?.ley_little_camas;
  const cuello = datos?.cuello_urgencias_hospitalizacion;
  const servicioErlang = datos?.erlang_c?.servicios?.[servicio.id];
  const escenario = simulacion?.escenario_altas_tempranas;
  const decision = simulacion?.decision_jornada;
  const pronosticoDia = decision?.pronostico_diario;

  return (
    <section className="space-y-5 text-[#102A43] dark:text-[#D8EFF7]" aria-label="Optimización operacional">
      <header>
        <h2 className="font-heading text-2xl font-bold">Optimización operacional</h2>
        <p className="text-sm mt-2">
          Escenarios de planificación, no órdenes clínicas ni mediciones de personal disponible.
          Los efectos de estancia y altas se evalúan por separado; no deben sumarse.
        </p>
      </header>
      {error && (
        <div className={tarjeta} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setIntento((n) => n + 1)} className="underline font-bold">
            Reintentar carga
          </button>
        </div>
      )}
      {!datos && !error && <p role="status">Cargando recomendaciones cuantificadas…</p>}
      {datos && (
        <>
          {/* Tarjeta destacada: Decisión del turno con pronóstico acoplado (Demo de principio a fin) */}
          <article className={`${tarjeta} border-2 border-[#2C7A9B] dark:border-[#1B8CC9] shadow-xs space-y-4`}>
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D1DEE7] dark:border-[#19506B] pb-4">
              <div className="space-y-1">
                <h3 className="font-heading text-xl font-bold">
                  Decisión del turno con pronóstico acoplado (Demo de principio a fin)
                </h3>
                <p className="text-xs text-[#46657A] dark:text-[#B9D4DF]">
                  Conecta el pronóstico diario LightGBM (p10/p50/p90) con los perfiles horarios del día y Erlang C
                  (1/μ = {tiempo} min, meta {meta} min) para {servicio.nombre}.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F6FA] dark:bg-[#071B2A] border border-[#71B5CC] dark:border-[#19506B] px-3 py-1 text-xs font-bold text-[#0C4A62] dark:text-[#9FE4F5]">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Comparación paramétrica · Información disponible al inicio de la jornada (sin fuga de datos)
              </span>
            </header>

            {/* Controles de fecha y dotación paramétrica */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-3.5 space-y-2.5">
                <label htmlFor="fecha-decision-jornada" className="flex items-center gap-1.5 text-xs font-bold">
                  <Calendar className="h-4 w-4 text-[#14516B] dark:text-[#B9E2F0]" />
                  <span>Fecha de la jornada</span>
                </label>
                <input
                  id="fecha-decision-jornada"
                  type="date"
                  value={fechaJornada}
                  min={FECHA_INICIO_DATOS}
                  max={FECHA_FIN_DATOS}
                  onChange={(event) => seleccionarFechaJornada(event.target.value)}
                  className="w-full rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] px-3 py-1.5 text-xs font-bold font-mono-num"
                />
                <div className="flex flex-wrap gap-1.5">
                  {JORNADAS_DEMO.map((preset) => {
                    const activo = fechaJornada === preset.fecha;
                    return (
                      <button
                        key={preset.fecha}
                        type="button"
                        onClick={() => seleccionarFechaJornada(preset.fecha)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
                          activo
                            ? 'bg-[#14516B] dark:bg-[#1B8CC9] text-white border-[#14516B] dark:border-[#1B8CC9]'
                            : 'bg-white dark:bg-[#0E3E5B] text-[#102A43] dark:text-[#D8EFF7] border-[#D1DEE7] dark:border-[#19506B] hover:border-[#2C7A9B]'
                        }`}
                      >
                        {preset.etiqueta}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">Dotación habitual (equipos equivalentes)</span>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarDotacionManual}
                      onChange={(event) => setUsarDotacionManual(event.target.checked)}
                      className="accent-[#14516B]"
                    />
                    <span>Manual</span>
                  </label>
                </div>
                {usarDotacionManual ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={Math.min(100, dotacionHabitual)}
                        onChange={(event) => setDotacionHabitual(clampDotacion(event.target.value))}
                        aria-label="Deslizador de dotación habitual"
                        className="w-full accent-[#14516B] dark:accent-[#B9E2F0]"
                      />
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={dotacionHabitual}
                        onChange={(event) => setDotacionHabitual(clampDotacion(event.target.value))}
                        aria-label="Dotación habitual en equipos equivalentes"
                        className="w-20 rounded-lg border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] px-2 py-1 text-xs font-bold font-mono-num text-right"
                      />
                    </div>
                    <p className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">
                      Supuesto paramétrico introducido: <strong>{dotacionHabitual}</strong> equipos (OMOP no incluye plantilla real).
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#46657A] dark:text-[#B9D4DF]">
                    Modo automático: usa la dotación normal histórica calculada por franja como línea base paramétrica.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">Dotación alternativa</span>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarAlternativaManual}
                      onChange={(event) => setUsarAlternativaManual(event.target.checked)}
                      className="accent-[#14516B]"
                    />
                    <span>Fijar manual</span>
                  </label>
                </div>
                {usarAlternativaManual ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={Math.min(100, dotacionAlternativa)}
                        onChange={(event) => setDotacionAlternativa(clampDotacion(event.target.value))}
                        aria-label="Deslizador de dotación alternativa"
                        className="w-full accent-[#14516B] dark:accent-[#B9E2F0]"
                      />
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={dotacionAlternativa}
                        onChange={(event) => setDotacionAlternativa(clampDotacion(event.target.value))}
                        aria-label="Dotación alternativa en equipos equivalentes"
                        className="w-20 rounded-lg border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] px-2 py-1 text-xs font-bold font-mono-num text-right"
                      />
                    </div>
                    <p className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">
                      Alternativa manual: <strong>{dotacionAlternativa}</strong> equipos equivalentes por franja.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#46657A] dark:text-[#B9D4DF]">
                    Modo automático: asigna en cada franja el requerimiento para cubrir la cota alta prevista (<strong>p90</strong>).
                  </p>
                )}
              </div>
            </div>

            {/* Estado y salida de decision_jornada */}
            {!simulacion && !errorSimulacion && (
              <p role="status" className="text-xs text-[#46657A] dark:text-[#B9D4DF]">
                Calculando decisión del turno acoplada al pronóstico…
              </p>
            )}

            {simulacion && !decision && (
              <div className="rounded-xl border border-[#DFC264] dark:border-[#D98A00]/60 bg-[#FEF9E2] dark:bg-[#241E0D] p-3.5 text-xs space-y-1" role="status">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="h-4 w-4 shrink-0" />
                  El motor devolvió el escenario agregado sin el bloque <code>decision_jornada</code> para esta consulta.
                </p>
                {proyeccion?.conectado && (
                  <p>
                    Referencia activa del tablero para {fechaJornada}: <strong>{proyeccion.prediccion}</strong> llegadas
                    (banda p10–p90: {proyeccion.min}–{proyeccion.max}).
                  </p>
                )}
              </div>
            )}

            {decision && (
              <div className="space-y-4">
                {/* Resumen diario del pronóstico acoplado */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#46657A] dark:text-[#B9D4DF]">
                      Jornada evaluada
                    </span>
                    <p className="text-base font-extrabold font-mono-num mt-0.5">
                      {decision.fecha} · {decision.dia_semana}
                    </p>
                    <p className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">
                      Franja crítica: <strong>{decision.franja_critica}</strong>
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#46657A] dark:text-[#B9D4DF]">
                      Demanda prevista (p50)
                    </span>
                    <p className="text-2xl font-extrabold font-mono-num mt-0.5">
                      {formato(pronosticoDia?.p50, 0)}{' '}
                      <span className="text-xs font-normal">pac/día</span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#46657A] dark:text-[#B9D4DF]">
                      Incertidumbre (p10 – p90)
                    </span>
                    <p className="text-xl font-extrabold font-mono-num mt-0.5">
                      {formato(pronosticoDia?.p10, 0)} – {formato(pronosticoDia?.p90, 0)}
                    </p>
                    <p className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">
                      Banda de cuantiles del día
                    </p>
                  </div>

                  <div className={`rounded-xl border p-3 ${ESTILOS_ALERTA[pronosticoDia?.alerta] || ESTILOS_ALERTA.verde}`}>
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Alerta del pronóstico
                    </span>
                    <p className="text-xl font-black uppercase tracking-tight mt-0.5">
                      {pronosticoDia?.alerta || 'verde'}
                    </p>
                    <p className="text-[11px]">
                      Comparación: <strong>{decision.tipo_comparacion || 'parametrica'}</strong>
                    </p>
                  </div>
                </div>

                {pronosticoDia?.llegadas_reales_observadas != null && (
                  <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#46657A] dark:text-[#B9D4DF]">
                      Llegadas reales observadas al cierre (solo contraste retrospectivo, no usado para decidir):
                    </span>
                    <span className="font-mono-num font-extrabold text-sm">
                      {formato(pronosticoDia.llegadas_reales_observadas, 0)} pacientes
                    </span>
                  </div>
                )}

                {/* Tabla comparativa por franja */}
                <div className="overflow-x-auto rounded-xl border border-[#D1DEE7] dark:border-[#19506B]">
                  <table className="w-full text-xs text-left">
                    <caption className="text-left text-xs p-3 font-semibold bg-[#F7FAFC] dark:bg-[#071B2A] border-b border-[#D1DEE7] dark:border-[#19506B]">
                      Comparación paramétrica por franja horaria: demanda prevista, equipos requeridos y espera modelada
                    </caption>
                    <thead className="bg-[#F7FAFC] dark:bg-[#071B2A]">
                      <tr>
                        {[
                          'Franja y peso',
                          'λ prevista (p10 / p50 / p90)',
                          'Equipos req. (p10 / p50 / p90)',
                          'Habitual vs. Alternativa',
                          'Espera habitual (p50 / p90)',
                          'Espera alternativa (p50 / p90)',
                          'Acción recomendada',
                        ].map((titulo) => (
                          <th key={titulo} className="p-2.5 border-b border-[#71B5CC] font-bold">
                            {titulo}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(decision.franjas || []).map((fila) => {
                        const esCritica = fila.franja === decision.franja_critica;
                        return (
                          <tr
                            key={fila.franja}
                            className={`border-b border-[#D1DEE7]/60 dark:border-[#19506B]/60 ${
                              esCritica ? 'bg-[#E8F6FA]/60 dark:bg-[#071B2A]/80' : ''
                            }`}
                          >
                            <th scope="row" className="p-2.5 font-bold align-top">
                              <div>{fila.franja}</div>
                              <div className="text-[11px] font-normal text-[#46657A] dark:text-[#B9D4DF] font-mono-num">
                                Peso: {formato((fila.peso_franja ?? 0) * 100, 1)} %
                              </div>
                            </th>
                            <td className="p-2.5 font-mono-num align-top">
                              <div>
                                {[
                                  fila.lambda_prevista_p10_h,
                                  fila.lambda_prevista_p50_h,
                                  fila.lambda_prevista_p90_h,
                                ].map((v) => formato(v)).join(' / ')}
                              </div>
                              <div className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">pac/h</div>
                            </td>
                            <td className="p-2.5 font-mono-num align-top">
                              <div className="font-bold">
                                {fila.servidores_previstos_p10} / {fila.servidores_previstos_p50} / {fila.servidores_previstos_p90}
                              </div>
                              <div className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">
                                Incert.: ±{fila.brecha_incertidumbre_equipos} · Δ vs hist.:{' '}
                                {fila.delta_p90_previsto_vs_historico >= 0 ? '+' : ''}
                                {fila.delta_p90_previsto_vs_historico}
                              </div>
                            </td>
                            <td className="p-2.5 font-mono-num align-top">
                              <div className="font-bold">
                                {fila.dotacion_habitual} vs. {fila.dotacion_alternativa}
                              </div>
                              <div className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">
                                Δ: {fila.delta_alternativa_vs_habitual >= 0 ? '+' : ''}
                                {fila.delta_alternativa_vs_habitual} eq
                              </div>
                            </td>
                            <td className="p-2.5 font-mono-num align-top">
                              <div>p50: {formato(fila.espera_habitual_p50_min)} min</div>
                              {fila.cola_inestable_habitual_p90 ? (
                                <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#FDF0F2] dark:bg-[#2E1118] px-1.5 py-0.5 text-[11px] font-bold text-[#C5304C] dark:text-[#FFA8B6]">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>Cola inestable (ρ ≥ 1)</span>
                                </div>
                              ) : (
                                <div>p90: {formato(fila.espera_habitual_p90_min)} min</div>
                              )}
                              <div className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">
                                Ocup. p90: {formato(fila.ocupacion_habitual_p90_pct)} %
                              </div>
                            </td>
                            <td className="p-2.5 font-mono-num align-top">
                              <div>p50: {formato(fila.espera_alternativa_p50_min)} min</div>
                              {fila.cola_inestable_alternativa_p90 ? (
                                <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#FDF0F2] dark:bg-[#2E1118] px-1.5 py-0.5 text-[11px] font-bold text-[#C5304C] dark:text-[#FFA8B6]">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>Cola inestable (ρ ≥ 1)</span>
                                </div>
                              ) : (
                                <div>p90: {formato(fila.espera_alternativa_p90_min)} min</div>
                              )}
                              <div className="text-[11px] text-[#46657A] dark:text-[#B9D4DF]">
                                NS p90: {formato((fila.nivel_servicio_alternativa_p90 ?? 0) * 100, 0)} % · Ocup.: {formato(fila.ocupacion_alternativa_p90_pct)} %
                              </div>
                            </td>
                            <td className="p-2.5 align-top max-w-[230px]">
                              {fila.accion_franja}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Síntesis y requisitos de validación */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#71B5CC] dark:border-[#19506B] bg-[#E8F6FA] dark:bg-[#071B2A] p-4 space-y-2">
                    <h4 className="text-sm font-extrabold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-[#14516B] dark:text-[#9FE4F5]" />
                      Síntesis de decisión recomendada
                    </h4>
                    <p className="text-xs leading-relaxed font-semibold">
                      {decision.decision_recomendada}
                    </p>
                    {decision.nota_metodologica && (
                      <p className="text-[11px] text-[#46657A] dark:text-[#B9D4DF] leading-relaxed">
                        {decision.nota_metodologica}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-4 space-y-2">
                    <h4 className="text-sm font-extrabold">
                      Qué tendría que validar el hospital para operarlo
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-[#102A43] dark:text-[#D8EFF7]">
                      {(decision.requisitos_validacion_hospital || []).map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Hoja de ruta en 3 etapas */}
                <div className="rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-3.5 space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-[#14516B] dark:text-[#B9E2F0]">
                    <Layers className="h-3.5 w-3.5" />
                    Hoja de ruta evolutiva (Urgencias → Hospitalización)
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-3 text-xs">
                    <div className="rounded-lg border border-[#2C7A9B] bg-white dark:bg-[#0E3E5B] p-2.5">
                      <strong className="text-[#14516B] dark:text-[#9FE4F5]">Etapa 1 [Activa]:</strong>{' '}
                      Pronóstico → decisión por franja con perfiles históricos e incertidumbre p10–p90.
                    </div>
                    <div className="rounded-lg border border-[#D1DEE7] dark:border-[#19506B] bg-white/70 dark:bg-[#0E3E5B]/60 p-2.5">
                      <strong>Etapa 2:</strong> Simulador del recorrido con marcas de decisión, asignación y traslado.
                    </div>
                    <div className="rounded-lg border border-[#D1DEE7] dark:border-[#19506B] bg-white/70 dark:bg-[#0E3E5B]/60 p-2.5">
                      <strong>Etapa 3:</strong> Piloto prospectivo en paralelo para validar anticipación y beneficio real.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </article>

          <h3 className="text-lg font-bold">Recomendaciones cuantificadas · escenario base</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(datos.recomendaciones || []).map((rec) => (
              <article key={rec.id} className={tarjeta}>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span>{rec.id}</span>
                  <span className="rounded-full bg-[#D8EFF7] text-[#14516B] px-2 py-1">{palancas[rec.palanca] || rec.palanca}</span>
                </div>
                <h4 className="font-bold">{rec.titulo}</h4>
                <p className="text-sm">{rec.accion}</p>
                <p className="text-sm font-bold">{rec.impacto_cuantificado}</p>
                <p className="text-xs">{rec.area} · {rec.horizonte}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className={tarjeta}>
              <h3 className="text-lg font-bold">Dotación por franja · Erlang C</h3>
              <p className="text-sm">{servicio.nombre}: el tiempo de servicio 1/μ es un supuesto configurable,
                no una duración clínica observada. La dotación es el total teórico de servidores,
                no personal adicional frente a una plantilla conocida.</p>
              <Control etiqueta="Tiempo de servicio (1/μ)" valor={tiempo} min={5} max={120} unidad="min" onChange={setTiempo} />
              <Control etiqueta="Meta de espera" valor={meta} min={1} max={120} unidad="min" onChange={setMeta} />
              <p className="text-xs">Nivel de servicio objetivo: {formato(datos.erlang_c?.nivel_servicio_objetivo * 100)} %.
                Consulte sensibilidad del escenario base: 1/μ = {(datos.erlang_c?.tiempos_servicio_min || []).join(', ')} min.</p>
            </article>
            <article className={tarjeta}>
              <h3 className="text-lg font-bold">Liberación de camas · Ley de Little y rondas de alta temprana</h3>
              <p className="text-sm">Hospitalización: {formato(little?.ingresos_dia_promedio)} ingresos/día;
                estancia media {formato(little?.estancia_media_horas)} h.
                L = λ × W: {formato(little?.censo_teorico_little)} pacientes simultáneos.</p>
              <Control etiqueta="Reducción de estancia media" valor={reduccion} min={0} max={48} unidad="h" onChange={setReduccion} />
              <Control etiqueta="Altas de la tarde adelantadas a la mañana" valor={altas} min={0} max={80} unidad="%" onChange={setAltas} />
              <p className="text-xs">Simulación horaria de redistribución de altas; no modifica la demanda ni garantiza capacidad física disponible.</p>
            </article>
          </div>

          <div aria-live="polite" aria-busy={!simulacion && !errorSimulacion}>
            {errorSimulacion && <p role="alert">{errorSimulacion}</p>}
            {!simulacion && !errorSimulacion && <p role="status">Calculando escenario seleccionado…</p>}
            {simulacion && (
              <div className={tarjeta}>
                <h3 className="font-bold">Resultado del escenario · {servicio.nombre}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <caption className="text-left text-xs pb-3">Dotación teórica para tasas de llegada normal, p75 y p90 (pacientes/hora)</caption>
                    <thead><tr>
                      {['Franja', 'λ normal / p75 / p90', 'Personal normal', 'Personal p75', 'Personal p90', 'Δ p90 vs. normal', 'Espera p90 (min)', 'Ocupación p90 (%)'].map((titulo) => (
                        <th key={titulo} className="p-2 border-b border-[#71B5CC]">{titulo}</th>
                      ))}
                    </tr></thead>
                    <tbody>{(simulacion.erlang_c_franjas || []).map((fila) => (
                      <tr key={fila.franja}>
                        <th scope="row" className="p-2">{fila.franja}</th>
                        <td className="p-2">{[fila.lambda_normal_h, fila.lambda_p75_h, fila.lambda_p90_h].map((v) => formato(v)).join(' / ')}</td>
                        {[fila.servidores_normal, fila.servidores_p75, fila.servidores_p90,
                          fila.delta_p90_vs_normal, fila.espera_esperada_p90_min, fila.ocupacion_p90_pct].map((v, i) => (
                          <td key={i} className="p-2">{formato(v)}</td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 bg-[#D8EFF7] dark:bg-[#071B2A] rounded-xl p-4 text-sm">
                  <p><strong>{formato(simulacion.camas_liberadas_estancia)}</strong> camas equivalentes liberadas por menor estancia</p>
                  <p><strong>{formato(escenario?.camas_pico_liberadas)}</strong> camas liberadas en el pico por altas tempranas</p>
                  <p>Horas rojas: {formato(escenario?.pct_horas_rojo_base)} % → {formato(escenario?.pct_horas_rojo_simulado)} %.
                    Reducción relativa: <strong>{formato(escenario?.reduccion_horas_rojo_pct)} %</strong>.</p>
                </div>
                <p className="text-xs">Ventana de altas: {escenario?.ventana_origen} → {escenario?.ventana_destino}.</p>
                <p className="text-xs">Método del escenario de altas: {escenario?.metodo || 'No disponible'}.
                  Los valores intermedios pueden ser interpolaciones de escenarios horarios precalculados.</p>
              </div>
            )}
          </div>

          {servicioErlang?.sensibilidad?.length > 0 && (
            <details className={tarjeta}>
              <summary className="font-bold cursor-pointer">Sensibilidad de dotación · escenario base</summary>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead><tr>{['1/μ (min)', 'Franja pico', 'Normal', 'p75', 'p90', 'Δ p90'].map((t) => <th key={t} className="p-2">{t}</th>)}</tr></thead>
                  <tbody>{servicioErlang.sensibilidad.map((fila) => (
                    <tr key={fila.tiempo_servicio_min}>
                      <td className="p-2">{fila.tiempo_servicio_min}</td><td className="p-2">{fila.franja_pico}</td>
                      {[fila.servidores_normal, fila.servidores_p75, fila.servidores_p90, fila.delta_p90].map((v, i) => <td className="p-2" key={i}>{formato(v)}</td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          )}
          {cuello && (
            <article className={tarjeta}>
              <h3 className="text-lg font-bold">Cuello de botella · Urgencias → Hospitalización</h3>
              <p>Espera p90: <strong>{formato(cuello.espera_p90_horas)} h</strong> ·
                correlación entre censo y espera p90: <strong>{formato(cuello.correlacion_censo_espera_p90, 3)}</strong>.</p>
              <p className="text-sm">p90 con censo normal: {formato(cuello.espera_p90_censo_normal_horas)} h;
                con censo alto: {formato(cuello.espera_p90_censo_alto_horas)} h.</p>
              <p className="text-xs">{cuello.nota_metodologica}</p>
              <p className="text-xs">Asociación observacional, no efecto causal de una intervención.</p>
            </article>
          )}
        </>
      )}
    </section>
  );
}
