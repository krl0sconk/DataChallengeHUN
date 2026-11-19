import { useEffect, useState } from 'react';
import { FECHA_BASE_MAXIMA, FECHA_INICIO_DATOS } from '../constants/servicios';
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

function parseDotacionReferencia(texto) {
  const limpio = texto.trim();
  if (!/^\d+$/.test(limpio)) return null;
  const num = Number(limpio);
  return num >= 1 && num <= 500 ? num : null;
}

export function OptimizationPanel({ servicio, fechaSimulacion, onCambiarFecha }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const [modoDemanda, setModoDemanda] = useState('historico');
  const [tiempo, setTiempo] = useState(20);
  const [meta, setMeta] = useState(15);
  const [reduccion, setReduccion] = useState(4);
  const [altas, setAltas] = useState(30);
  const [dotacionRef, setDotacionRef] = useState('');
  const [resultado, setResultado] = useState(null);
  const [errorSimulacion, setErrorSimulacion] = useState(null);

  useEffect(() => {
    let activo = true;
    setError(null);
    getOptimizacion()
      .then((data) => { if (activo) setDatos(data); })
      .catch(() => { if (activo) setError('Optimización no disponible. Verifique el paquete del modelo y la API.'); });
    return () => { activo = false; };
  }, [intento]);

  const dotacionNum = parseDotacionReferencia(dotacionRef);
  const payloadObj = {
    servicio: servicio.id,
    tiempo_servicio_min: tiempo,
    meta_espera_min: meta,
    reduccion_estancia_horas: reduccion,
    pct_altas_tempranas: altas,
  };
  if (modoDemanda === 'pronostico') {
    payloadObj.modo_demanda = 'pronostico';
    payloadObj.fecha = fechaSimulacion;
  }
  if (dotacionNum !== null) {
    payloadObj.dotacion_referencia = dotacionNum;
  }
  const clave = JSON.stringify(payloadObj);

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
  const esModoPronostico = simulacion?.modo_demanda === 'pronostico';
  const demandaPron = simulacion?.demanda_diaria_pronosticada;
  const perfilHorario = simulacion?.perfil_horario;
  const metricasQ = simulacion?.metricas_modelo_cuantilico;
  const umbralesHist = simulacion?.umbrales_historicos;
  const tieneRef = Number.isInteger(simulacion?.dotacion_referencia);

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
                no una duración clínica observada. Los equipos equivalentes representan requerimiento teórico,
                no comparación con plantilla real salvo que aportes una referencia explícita.</p>

              <div className="space-y-2 rounded-xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#14516B] dark:text-[#B9E2F0]">
                  Fuente de demanda para Erlang C
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Modo de demanda Erlang C">
                  <button
                    type="button"
                    aria-pressed={modoDemanda === 'historico'}
                    onClick={() => setModoDemanda('historico')}
                    className={`rounded-lg px-3 py-2 text-xs font-bold border text-left transition-colors cursor-pointer ${
                      modoDemanda === 'historico'
                        ? 'bg-[#102A43] dark:bg-[#176D98] text-white border-[#102A43] dark:border-[#176D98]'
                        : 'bg-white dark:bg-[#0E3E5B] border-[#D1DEE7] dark:border-[#19506B] text-[#102A43] dark:text-[#D8EFF7]'
                    }`}
                  >
                    Demanda histórica
                  </button>
                  <button
                    type="button"
                    aria-pressed={modoDemanda === 'pronostico'}
                    onClick={() => setModoDemanda('pronostico')}
                    className={`rounded-lg px-3 py-2 text-xs font-bold border text-left transition-colors cursor-pointer ${
                      modoDemanda === 'pronostico'
                        ? 'bg-[#102A43] dark:bg-[#176D98] text-white border-[#102A43] dark:border-[#176D98]'
                        : 'bg-white dark:bg-[#0E3E5B] border-[#D1DEE7] dark:border-[#19506B] text-[#102A43] dark:text-[#D8EFF7]'
                    }`}
                  >
                    Pronóstico para la fecha seleccionada
                  </button>
                </div>

                {modoDemanda === 'pronostico' && (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#D1DEE7] dark:border-[#19506B]">
                    <label className="text-xs font-bold flex items-center gap-2">
                      <span>Fecha objetivo:</span>
                      <input
                        type="date"
                        value={fechaSimulacion}
                        min={FECHA_INICIO_DATOS}
                        max={FECHA_BASE_MAXIMA}
                        onChange={(event) => onCambiarFecha?.(event.target.value)}
                        aria-label="Fecha del pronóstico Erlang C"
                        className="rounded-lg border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] px-2.5 py-1.5 font-mono text-xs font-bold"
                      />
                    </label>
                    <span className="text-[11px] font-semibold text-[#46657A] dark:text-[#B9D4DF]">
                      Servicio activo: <strong>{servicio.nombre}</strong>
                    </span>
                  </div>
                )}
              </div>

              <Control etiqueta="Tiempo de servicio (1/μ)" valor={tiempo} min={5} max={120} unidad="min" onChange={setTiempo} />
              <Control etiqueta="Meta de espera" valor={meta} min={1} max={120} unidad="min" onChange={setMeta} />

              <label className="block text-xs font-semibold space-y-1 pt-1">
                <span className="flex items-center justify-between gap-2">
                  <span>Referencia opcional de equipos disponibles (si la conoce el operador)</span>
                  {dotacionNum !== null && (
                    <button type="button" onClick={() => setDotacionRef('')} className="underline text-[#14516B] dark:text-[#B9E2F0]">
                      Limpiar
                    </button>
                  )}
                </span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  placeholder="Sin referencia (OMOP no contiene dotación)"
                  value={dotacionRef}
                  onChange={(event) => setDotacionRef(event.target.value)}
                  className="w-full rounded-lg border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] px-3 py-2 text-xs font-mono"
                />
              </label>

              <p className="text-xs">Nivel de servicio objetivo: {formato(datos.erlang_c?.nivel_servicio_objetivo * 100)} %.
                Consulte sensibilidad del escenario base: 1/μ = {(datos.erlang_c?.tiempos_servicio_min || []).join(', ')} min.</p>
            </article>

            <article className={tarjeta}>
              <h3 className="text-lg font-bold">Liberación de camas · Ley de Little y rondas de alta temprana</h3>
              <p className="text-xs font-bold uppercase tracking-wider text-[#14516B] dark:text-[#B9E2F0]">
                Fuente histórica separada · Hospitalización (Inpatient Visit 9201)
              </p>
              <p className="text-sm">Hospitalización: {formato(little?.ingresos_dia_promedio)} ingresos/día;
                estancia media {formato(little?.estancia_media_horas)} h.
                L = λ × W: {formato(little?.censo_teorico_little)} pacientes simultáneos.</p>
              <Control etiqueta="Reducción de estancia media" valor={reduccion} min={0} max={48} unidad="h" onChange={setReduccion} />
              <Control etiqueta="Altas de la tarde adelantadas a la mañana" valor={altas} min={0} max={80} unidad="%" onChange={setAltas} />
              <p className="text-xs">Simulación horaria histórica de redistribución de altas; mantiene su propia fuente y no se mezcla con el pronóstico por franja.</p>
            </article>
          </div>

          <div aria-live="polite" aria-busy={!simulacion && !errorSimulacion} className="space-y-4">
            {errorSimulacion && <p role="alert">{errorSimulacion}</p>}
            {!simulacion && !errorSimulacion && <p role="status">Calculando escenario seleccionado…</p>}
            {simulacion && (
              <>
                <div className={tarjeta}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base">
                        {esModoPronostico
                          ? `Dimensionamiento Erlang C desde pronóstico · ${servicio.nombre} (${simulacion.fecha})`
                          : `Dimensionamiento Erlang C desde demanda histórica · ${servicio.nombre}`}
                      </h3>
                      <p className="text-xs mt-1">
                        {esModoPronostico
                          ? simulacion.fuente_pronostico
                          : `Fuente: demanda histórica observada (${servicioErlang?.fuente || 'agregados históricos'}).`}
                      </p>
                    </div>
                    {esModoPronostico && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                        simulacion.tipo_evaluacion === 'fuera_de_muestra'
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                      }`}>
                        {simulacion.tipo_evaluacion === 'fuera_de_muestra'
                          ? `Fuera de muestra · origen ${simulacion.origen_pronostico}`
                          : 'Retrospectivo (prueba funcional)'}
                      </span>
                    )}
                  </div>

                  {esModoPronostico && (
                    <div className="grid gap-3 md:grid-cols-2 rounded-xl bg-[#F7FAFC] dark:bg-[#071B2A] border border-[#D1DEE7] dark:border-[#19506B] p-4 text-xs">
                      <div className="space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[#14516B] dark:text-[#B9E2F0]">
                          Pronóstico diario (cuantiles del modelo)
                        </p>
                        {demandaPron ? (
                          <>
                            <p className="text-sm font-bold">
                              Central p50: <span className="font-mono">{demandaPron.p50}</span> pac. ·
                              Escenario alto p90: <span className="font-mono">{demandaPron.p90}</span> pac.
                            </p>
                            <p>
                              Banda de pronóstico (p10–p90): <strong className="font-mono">{demandaPron.p10} – {demandaPron.p90}</strong> pac.
                              {demandaPron.real_observado != null && (
                                <> · Real observado: <strong className="font-mono">{demandaPron.real_observado}</strong> pac.</>
                              )}
                            </p>
                          </>
                        ) : (
                          <p>No hay cuantiles diarios disponibles en el paquete para esta fecha.</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[#704200] dark:text-[#FFDF80]">
                          Umbrales históricos del servicio (distintos del pronóstico)
                        </p>
                        <p>
                          Media histórica: <strong className="font-mono">{umbralesHist?.media_diaria_historica ?? servicio.mediaDiaria}</strong> ·
                          Umbral histórico p75: <strong className="font-mono">{umbralesHist?.umbral_historico_p75 ?? servicio.p75}</strong> ·
                          Umbral histórico p90: <strong className="font-mono">{umbralesHist?.umbral_historico_p90 ?? servicio.p90}</strong> pac./día.
                        </p>
                        {metricasQ && (
                          <p className="text-[11px] opacity-90">
                            Modelo cuantílico web: exactitud {formato(metricasQ.exactitud_pct)} % (WAPE {formato((metricasQ.wape || 0) * 100)} %, cobertura p10–p90 {formato((metricasQ.cobertura_p10_p90 || 0) * 100)} %). {metricasQ.nota_separacion_experimentos}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {esModoPronostico && simulacion.disponible === false && (
                    <div className="rounded-xl border border-[#DFC264] dark:border-[#7A5A00] bg-[#FEF9E2] dark:bg-[#201B0E] p-4 space-y-2" role="alert">
                      <p className="text-sm font-bold text-[#704200] dark:text-[#FFDF80]">
                        Pronóstico por franja no disponible
                      </p>
                      <p className="text-xs text-[#704200]/90 dark:text-[#FFDF80]/90">
                        {simulacion.motivo_no_disponible}
                      </p>
                      <button
                        type="button"
                        onClick={() => setModoDemanda('historico')}
                        className="rounded-lg bg-[#102A43] dark:bg-[#176D98] px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                      >
                        Volver a Demanda histórica
                      </button>
                    </div>
                  )}

                  {esModoPronostico && simulacion.disponible === true && (
                    <>
                      {perfilHorario && (
                        <p className="text-xs">
                          <strong>Perfil horario aplicado:</strong> {perfilHorario.nombre_dia}, corte anterior a{' '}
                          <span className="font-mono">{perfilHorario.corte_perfil}</span> ·{' '}
                          <span className="font-mono">{perfilHorario.dias_observados}</span> días completos observados
                          ({perfilHorario.fecha_inicio_obs} a {perfilHorario.fecha_fin_obs}, incluye ceros).
                        </p>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <caption className="text-left text-xs pb-3">
                            Requerimiento teórico Erlang C (1/μ = {tiempo} min, meta &lt; {meta} min) desde pronóstico central (p50) y escenario alto (reparto del p90 diario)
                          </caption>
                          <thead>
                            <tr>
                              {[
                                'Franja (6 h)',
                                'Perfil (%)',
                                'Vol. p50 / p90',
                                'λ central / alto (pac./h)',
                                'Equipos mín. p50',
                                'Equipos mín. alto (p90)',
                                'Δ teórico (alto − p50)',
                                'Espera media p50 / alto (min)',
                                ...(tieneRef ? [`Brecha vs. ref. (${simulacion.dotacion_referencia})`] : []),
                              ].map((titulo) => (
                                <th key={titulo} className="p-2 border-b border-[#71B5CC]">{titulo}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(simulacion.erlang_c_franjas || []).map((fila) => (
                              <tr key={fila.franja}>
                                <th scope="row" className="p-2">{fila.franja}</th>
                                <td className="p-2 font-mono">{formato(fila.proporcion_franja * 100, 1)} %</td>
                                <td className="p-2 font-mono">{formato(fila.volumen_central, 1)} / {formato(fila.volumen_alto, 1)}</td>
                                <td className="p-2 font-mono">{formato(fila.lambda_central_h, 2)} / {formato(fila.lambda_alto_h, 2)}</td>
                                <td className="p-2 font-mono font-bold">{fila.servidores_central}</td>
                                <td className="p-2 font-mono font-bold">{fila.servidores_alto}</td>
                                <td className="p-2 font-mono">+{fila.delta_alto_vs_central}</td>
                                <td className="p-2 font-mono">{formato(fila.espera_esperada_central_min, 2)} / {formato(fila.espera_esperada_alto_min, 2)}</td>
                                {tieneRef && (
                                  <td className="p-2 font-mono">
                                    {fila.brecha_central_vs_referencia >= 0 ? `+${fila.brecha_central_vs_referencia}` : fila.brecha_central_vs_referencia}
                                    {' / '}
                                    {fila.brecha_alto_vs_referencia >= 0 ? `+${fila.brecha_alto_vs_referencia}` : fila.brecha_alto_vs_referencia}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                          {simulacion.reconciliacion && (
                            <tfoot>
                              <tr className="border-t border-[#71B5CC] font-bold">
                                <th scope="row" className="p-2">Total diario reconciliado</th>
                                <td className="p-2 font-mono">100,0 %</td>
                                <td className="p-2 font-mono">
                                  {formato(simulacion.reconciliacion.suma_franjas_central, 1)} / {formato(simulacion.reconciliacion.suma_franjas_alto, 1)}
                                </td>
                                <td colSpan={tieneRef ? 6 : 5} className="p-2 text-xs font-normal">
                                  Coincide con p50 ({simulacion.reconciliacion.total_central_objetivo}) y p90 ({simulacion.reconciliacion.total_alto_objetivo}).
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                      <p className="text-xs">{simulacion.nota_escenario_pronostico}</p>
                    </>
                  )}

                  {!esModoPronostico && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <caption className="text-left text-xs pb-3">
                          Requerimiento teórico histórico para tasas de llegada normal, umbral histórico p75 y umbral histórico p90 (pacientes/hora)
                        </caption>
                        <thead><tr>
                          {[
                            'Franja',
                            'λ normal / hist. p75 / hist. p90',
                            'Equipos normal',
                            'Equipos hist. p75',
                            'Equipos hist. p90',
                            'Δ teórico (hist. p90 − normal)',
                            'Espera media normal / hist. p90 (min)',
                            'Ocupación hist. p90 (%)',
                            ...(tieneRef ? [`Brecha vs. ref. (${simulacion.dotacion_referencia})`] : []),
                          ].map((titulo) => (
                            <th key={titulo} className="p-2 border-b border-[#71B5CC]">{titulo}</th>
                          ))}
                        </tr></thead>
                        <tbody>{(simulacion.erlang_c_franjas || []).map((fila) => (
                          <tr key={fila.franja}>
                            <th scope="row" className="p-2">{fila.franja}</th>
                            <td className="p-2 font-mono">{[fila.lambda_normal_h, fila.lambda_p75_h, fila.lambda_p90_h].map((v) => formato(v, 2)).join(' / ')}</td>
                            <td className="p-2 font-mono">{fila.servidores_normal}</td>
                            <td className="p-2 font-mono">{fila.servidores_p75}</td>
                            <td className="p-2 font-mono">{fila.servidores_p90}</td>
                            <td className="p-2 font-mono">{fila.delta_p90_vs_normal}</td>
                            <td className="p-2 font-mono">{formato(fila.espera_esperada_normal_min, 2)} / {formato(fila.espera_esperada_p90_min, 2)}</td>
                            <td className="p-2 font-mono">{formato(fila.ocupacion_p90_pct)}</td>
                            {tieneRef && (
                              <td className="p-2 font-mono">
                                {fila.brecha_normal_vs_referencia >= 0 ? `+${fila.brecha_normal_vs_referencia}` : fila.brecha_normal_vs_referencia}
                                {' / '}
                                {fila.brecha_p90_vs_referencia >= 0 ? `+${fila.brecha_p90_vs_referencia}` : fila.brecha_p90_vs_referencia}
                              </td>
                            )}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className={tarjeta}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">Escenarios de estancia y altas tempranas · fuente histórica</h3>
                    <span className="rounded-full bg-[#D8EFF7] dark:bg-[#071B2A] px-2.5 py-0.5 text-xs font-bold">
                      Hospitalización · fuente histórica separada
                    </span>
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
              </>
            )}
          </div>

          {servicioErlang?.sensibilidad?.length > 0 && (
            <details className={tarjeta}>
              <summary className="font-bold cursor-pointer">Sensibilidad de dotación · escenario base</summary>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead><tr>{['1/μ (min)', 'Franja pico', 'Normal', 'Hist. p75', 'Hist. p90', 'Δ hist. p90'].map((t) => <th key={t} className="p-2">{t}</th>)}</tr></thead>
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
