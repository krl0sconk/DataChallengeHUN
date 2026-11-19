import { useEffect, useState } from 'react';
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

export function OptimizationPanel({ servicio }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const [tiempo, setTiempo] = useState(20);
  const [meta, setMeta] = useState(15);
  const [reduccion, setReduccion] = useState(4);
  const [altas, setAltas] = useState(30);
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

  const clave = JSON.stringify({
    servicio: servicio.id, tiempo_servicio_min: tiempo, meta_espera_min: meta,
    reduccion_estancia_horas: reduccion, pct_altas_tempranas: altas,
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
