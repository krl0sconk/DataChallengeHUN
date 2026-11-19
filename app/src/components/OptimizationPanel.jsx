import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Info,
  Layers,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  CONFIG_ALERTAS,
  FECHA_BASE_MAXIMA,
  FECHA_FIN_DATOS,
  FECHA_INICIO_DATOS,
} from '../constants/servicios';
import { getOptimizacion, simularOptimizacion } from '../lib/api';
import { FlowBandBar } from './FlowBandBar';
import { SectionPanel } from './SectionPanel';

const formato = (valor, decimales = 1) => (
  typeof valor === 'number' && Number.isFinite(valor)
    ? valor.toLocaleString('es-CO', { maximumFractionDigits: decimales })
    : 'No disponible'
);

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

const clampDotacion = (valor) => Math.max(1, Math.min(200, Math.round(Number(valor) || 1)));

function Control({ id, etiqueta, valor, min, max, unidad, onChange }) {
  return (
    <label htmlFor={id} className="block space-y-2 text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-[var(--mf-ink)]">{etiqueta}</span>
        <span className="font-mono-num text-xs font-semibold text-[var(--mf-accent-ink)]">
          {valor} {unidad}
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step="1"
        value={valor}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-[var(--mf-accent)]"
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
      .then((data) => {
        if (activo) setDatos(data);
      })
      .catch(() => {
        if (activo) setError('Optimización no disponible. Verifique el paquete del modelo y la API.');
      });
    return () => {
      activo = false;
    };
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
        .then((data) => {
          if (activo) setResultado({ clave, datos: data });
        })
        .catch(() => {
          if (activo) {
            setResultado(null);
            setErrorSimulacion('No se pudo calcular el escenario. Cambie un control para reintentar.');
          }
        });
    }, 250);
    return () => {
      activo = false;
      window.clearTimeout(timer);
    };
  }, [datos, clave]);

  const simulacion = resultado?.clave === clave ? resultado.datos : null;
  const little = datos?.ley_little_camas;
  const cuello = datos?.cuello_urgencias_hospitalizacion;
  const servicioErlang = datos?.erlang_c?.servicios?.[servicio.id];
  const escenario = simulacion?.escenario_altas_tempranas;
  const decision = simulacion?.decision_jornada;
  const pronosticoDia = decision?.pronostico_diario;
  const alertaPronostico = CONFIG_ALERTAS[pronosticoDia?.alerta] || CONFIG_ALERTAS.verde;

  if (error) {
    return (
      <SectionPanel
        id="optimizacion-operacional"
        title="Optimización operacional"
        subtitle="Escenarios de planificación paramétrica para dotación y flujo de camas."
      >
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-[var(--mf-warn-border)] bg-[var(--mf-warn-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-[var(--mf-warn)]">{error}</p>
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className="mf-btn-secondary shrink-0 self-start sm:self-center"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Reintentar carga</span>
          </button>
        </div>
      </SectionPanel>
    );
  }

  if (!datos) {
    return (
      <SectionPanel
        id="optimizacion-operacional"
        title="Optimización operacional"
        subtitle="Escenarios de planificación paramétrica para dotación y flujo de camas."
      >
        <div className="space-y-4" role="status" aria-label="Cargando recomendaciones cuantificadas">
          <div className="mf-skeleton h-20 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="mf-skeleton h-28 w-full" />
            <div className="mf-skeleton h-28 w-full" />
            <div className="mf-skeleton h-28 w-full" />
          </div>
        </div>
      </SectionPanel>
    );
  }

  return (
    <section className="space-y-6" aria-label="Optimización operacional">
      {/* Bloque 1: Decisión del turno con pronóstico acoplado */}
      <SectionPanel
        id="decision-jornada"
        title="Decisión del turno con pronóstico acoplado"
        subtitle={`Conecta el pronóstico diario LightGBM (p10/p50/p90) con los perfiles horarios del día y Erlang C (1/μ = ${tiempo} min, meta ${meta} min) para ${servicio.nombre}.`}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-1 text-xs font-medium text-[var(--mf-ink-2)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--mf-accent)] shrink-0" aria-hidden="true" />
            <span>Comparación paramétrica · Sin fuga de datos</span>
          </span>
        }
      >
        <div className="space-y-6">
          <p className="text-xs text-[var(--mf-ink-2)] max-w-[75ch]">
            Escenarios de planificación, no órdenes clínicas ni mediciones de personal disponible. Los efectos de estancia y altas se evalúan por separado y no deben sumarse.
          </p>

          {/* Barra de controles agrupados en subsuperficies limpias */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="mf-subsurface p-4 space-y-3">
              <label htmlFor="fecha-decision-jornada" className="flex items-center gap-2 text-xs font-semibold text-[var(--mf-ink)]">
                <Calendar className="h-4 w-4 text-[var(--mf-accent)]" aria-hidden="true" />
                <span>Fecha de la jornada</span>
              </label>
              <input
                id="fecha-decision-jornada"
                type="date"
                value={fechaJornada}
                min={FECHA_INICIO_DATOS}
                max={FECHA_FIN_DATOS}
                onChange={(event) => seleccionarFechaJornada(event.target.value)}
                className="mf-input w-full font-mono-num font-semibold"
              />
              <div className="flex flex-wrap gap-1.5">
                {JORNADAS_DEMO.map((preset) => {
                  const activo = fechaJornada === preset.fecha;
                  return (
                    <button
                      key={preset.fecha}
                      type="button"
                      onClick={() => seleccionarFechaJornada(preset.fecha)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                        activo
                          ? 'border-[var(--mf-accent)] bg-[var(--mf-accent)] text-white'
                          : 'border-[var(--mf-border)] bg-[var(--mf-surface)] text-[var(--mf-ink-2)] hover:border-[var(--mf-accent)] hover:text-[var(--mf-ink)]'
                      }`}
                    >
                      {preset.etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mf-subsurface p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--mf-ink)]">
                  Dotación habitual (equipos eq.)
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--mf-ink-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usarDotacionManual}
                    onChange={(event) => setUsarDotacionManual(event.target.checked)}
                    className="accent-[var(--mf-accent)]"
                  />
                  <span>Manual</span>
                </label>
              </div>
              {usarDotacionManual ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={Math.min(100, dotacionHabitual)}
                      onChange={(event) => setDotacionHabitual(clampDotacion(event.target.value))}
                      aria-label="Deslizador de dotación habitual"
                      className="w-full cursor-pointer accent-[var(--mf-accent)]"
                    />
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={dotacionHabitual}
                      onChange={(event) => setDotacionHabitual(clampDotacion(event.target.value))}
                      aria-label="Dotación habitual en equipos equivalentes"
                      className="mf-input w-20 font-mono-num font-semibold text-right"
                    />
                  </div>
                  <p className="text-xs text-[var(--mf-ink-3)]">
                    Supuesto paramétrico: <strong className="font-mono-num text-[var(--mf-ink)]">{dotacionHabitual}</strong> equipos (OMOP no incluye plantilla real).
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--mf-ink-2)]">
                  Modo automático: usa la dotación normal histórica calculada por franja como línea base paramétrica.
                </p>
              )}
            </div>

            <div className="mf-subsurface p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--mf-ink)]">Dotación alternativa</span>
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--mf-ink-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usarAlternativaManual}
                    onChange={(event) => setUsarAlternativaManual(event.target.checked)}
                    className="accent-[var(--mf-accent)]"
                  />
                  <span>Fijar manual</span>
                </label>
              </div>
              {usarAlternativaManual ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={Math.min(100, dotacionAlternativa)}
                      onChange={(event) => setDotacionAlternativa(clampDotacion(event.target.value))}
                      aria-label="Deslizador de dotación alternativa"
                      className="w-full cursor-pointer accent-[var(--mf-accent)]"
                    />
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={dotacionAlternativa}
                      onChange={(event) => setDotacionAlternativa(clampDotacion(event.target.value))}
                      aria-label="Dotación alternativa en equipos equivalentes"
                      className="mf-input w-20 font-mono-num font-semibold text-right"
                    />
                  </div>
                  <p className="text-xs text-[var(--mf-ink-3)]">
                    Alternativa manual: <strong className="font-mono-num text-[var(--mf-ink)]">{dotacionAlternativa}</strong> equipos equivalentes por franja.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--mf-ink-2)]">
                  Modo automático: asigna en cada franja el requerimiento para cubrir la cota alta prevista (<strong className="text-[var(--mf-ink)]">p90</strong>).
                </p>
              )}
            </div>
          </div>

          {/* Estado y salida de decision_jornada */}
          {!simulacion && !errorSimulacion && (
            <div className="space-y-2" role="status">
              <p className="text-xs text-[var(--mf-ink-2)]">
                Calculando decisión del turno acoplada al pronóstico…
              </p>
              <div className="mf-skeleton h-16 w-full" />
            </div>
          )}

          {simulacion && !decision && (
            <div
              role="status"
              className="rounded-lg border border-[var(--mf-warn-border)] bg-[var(--mf-warn-soft)] p-3.5 text-xs space-y-1 text-[var(--mf-warn)]"
            >
              <p className="font-semibold flex items-center gap-1.5">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  El motor devolvió el escenario agregado sin el bloque <code>decision_jornada</code> para esta consulta.
                </span>
              </p>
              {proyeccion?.conectado && (
                <p className="text-[var(--mf-ink-2)]">
                  Referencia activa del tablero para {fechaJornada}:{' '}
                  <strong className="font-mono-num text-[var(--mf-ink)]">{proyeccion.prediccion}</strong> llegadas
                  (banda p10–p90: <span className="font-mono-num">{proyeccion.min}–{proyeccion.max}</span>).
                </p>
              )}
            </div>
          )}

          {decision && (
            <div className="space-y-5 border-t border-[var(--mf-border)] pt-5">
              {/* Franja de resumen diario y veredicto clínico */}
              <div className="mf-subsurface grid divide-y divide-[var(--mf-border)] sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
                <div className="p-4">
                  <span className="text-xs font-medium text-[var(--mf-ink-3)]">Jornada evaluada</span>
                  <p className="mt-1 font-mono-num text-base font-semibold text-[var(--mf-ink)]">
                    {decision.fecha} · {decision.dia_semana}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--mf-ink-2)]">
                    Franja crítica: <strong className="text-[var(--mf-ink)]">{decision.franja_critica}</strong>
                  </p>
                </div>

                <div className="p-4">
                  <span className="text-xs font-medium text-[var(--mf-ink-3)]">Demanda prevista (p50)</span>
                  <p className="mt-1 font-mono-num text-2xl font-semibold text-[var(--mf-ink)]">
                    {formato(pronosticoDia?.p50, 0)}{' '}
                    <span className="text-xs font-sans font-normal text-[var(--mf-ink-2)]">pac/día</span>
                  </p>
                </div>

                <div className="p-4">
                  <span className="text-xs font-medium text-[var(--mf-ink-3)]">Incertidumbre (p10 – p90)</span>
                  <p className="mt-1 font-mono-num text-xl font-semibold text-[var(--mf-ink)]">
                    {formato(pronosticoDia?.p10, 0)} – {formato(pronosticoDia?.p90, 0)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--mf-ink-3)]">Banda de cuantiles del día</p>
                </div>

                <div className="p-4 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--mf-ink-3)]">Alerta del pronóstico</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${alertaPronostico.badgeClass}`}>
                      {pronosticoDia?.alerta ? alertaPronostico.etiqueta : 'NORMAL'}
                    </span>
                  </div>
                  <FlowBandBar
                    value={pronosticoDia?.p50 ?? 0}
                    p75={servicio.p75}
                    p90={servicio.p90}
                    min={pronosticoDia?.p10}
                    max={pronosticoDia?.p90}
                    compact
                    label={`Pronóstico para ${decision.fecha}`}
                  />
                  <p className="text-xs text-[var(--mf-ink-3)]">
                    Comparación: <strong className="text-[var(--mf-ink-2)]">{decision.tipo_comparacion || 'parametrica'}</strong>
                  </p>
                </div>
              </div>

              {pronosticoDia?.llegadas_reales_observadas != null && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[var(--mf-border)] py-2.5 text-xs">
                  <span className="font-medium text-[var(--mf-ink-2)]">
                    Llegadas reales observadas al cierre (solo contraste retrospectivo, no usado para decidir):
                  </span>
                  <span className="font-mono-num text-sm font-semibold text-[var(--mf-ink)]">
                    {formato(pronosticoDia.llegadas_reales_observadas, 0)} pacientes
                  </span>
                </div>
              )}

              {/* Tabla comparativa por franja */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <caption className="pb-3 text-left text-xs font-semibold text-[var(--mf-ink-2)]">
                    Comparación paramétrica por franja horaria: demanda prevista, equipos requeridos y espera modelada
                  </caption>
                  <thead>
                    <tr className="border-y border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-ink-2)]">
                      {[
                        'Franja y peso',
                        'λ prevista (p10 / p50 / p90)',
                        'Equipos req. (p10 / p50 / p90)',
                        'Habitual vs. Alternativa',
                        'Espera habitual (p50 / p90)',
                        'Espera alternativa (p50 / p90)',
                        'Acción recomendada',
                      ].map((titulo) => (
                        <th key={titulo} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mf-border)]">
                    {(decision.franjas || []).map((fila) => {
                      const esCritica = fila.franja === decision.franja_critica;
                      return (
                        <tr
                          key={fila.franja}
                          className={esCritica ? 'bg-[var(--mf-accent-soft)]/50' : ''}
                        >
                          <th scope="row" className="px-3 py-3 font-semibold text-[var(--mf-ink)] align-top">
                            <div className="flex items-center gap-1.5">
                              <span>{fila.franja}</span>
                              {esCritica && (
                                <span className="inline-flex rounded-full bg-[var(--mf-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--mf-accent-ink)]">
                                  Crítica
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs font-normal text-[var(--mf-ink-3)] font-mono-num">
                              Peso: {formato((fila.peso_franja ?? 0) * 100, 1)} %
                            </div>
                          </th>
                          <td className="px-3 py-3 font-mono-num align-top text-[var(--mf-ink)]">
                            <div>
                              {[
                                fila.lambda_prevista_p10_h,
                                fila.lambda_prevista_p50_h,
                                fila.lambda_prevista_p90_h,
                              ]
                                .map((v) => formato(v))
                                .join(' / ')}
                            </div>
                            <div className="mt-0.5 text-xs text-[var(--mf-ink-3)]">pac/h</div>
                          </td>
                          <td className="px-3 py-3 font-mono-num align-top text-[var(--mf-ink)]">
                            <div className="font-semibold">
                              {fila.servidores_previstos_p10} / {fila.servidores_previstos_p50} / {fila.servidores_previstos_p90}
                            </div>
                            <div className="mt-0.5 text-xs text-[var(--mf-ink-3)]">
                              Incert.: ±{fila.brecha_incertidumbre_equipos} · Δ vs. hist.:{' '}
                              {fila.delta_p90_previsto_vs_historico >= 0 ? '+' : ''}
                              {fila.delta_p90_previsto_vs_historico}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono-num align-top text-[var(--mf-ink)]">
                            <div className="font-semibold">
                              {fila.dotacion_habitual} vs. {fila.dotacion_alternativa}
                            </div>
                            <div className="mt-0.5 text-xs text-[var(--mf-ink-3)]">
                              Δ: {fila.delta_alternativa_vs_habitual >= 0 ? '+' : ''}
                              {fila.delta_alternativa_vs_habitual} eq
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono-num align-top text-[var(--mf-ink)]">
                            <div>p50: {formato(fila.espera_habitual_p50_min)} min</div>
                            {fila.cola_inestable_habitual_p90 ? (
                              <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold mf-badge-crit">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>Cola inestable (ρ ≥ 1)</span>
                              </div>
                            ) : (
                              <div>p90: {formato(fila.espera_habitual_p90_min)} min</div>
                            )}
                            <div className="mt-0.5 text-xs text-[var(--mf-ink-3)]">
                              Ocup. p90: {formato(fila.ocupacion_habitual_p90_pct)} %
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono-num align-top text-[var(--mf-ink)]">
                            <div>p50: {formato(fila.espera_alternativa_p50_min)} min</div>
                            {fila.cola_inestable_alternativa_p90 ? (
                              <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold mf-badge-crit">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>Cola inestable (ρ ≥ 1)</span>
                              </div>
                            ) : (
                              <div>p90: {formato(fila.espera_alternativa_p90_min)} min</div>
                            )}
                            <div className="mt-0.5 text-xs text-[var(--mf-ink-3)]">
                              NS p90: {formato((fila.nivel_servicio_alternativa_p90 ?? 0) * 100, 0)} % · Ocup.:{' '}
                              {formato(fila.ocupacion_alternativa_p90_pct)} %
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top max-w-[230px] text-[var(--mf-ink-2)]">
                            {fila.accion_franja}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Síntesis de decisión y requisitos de validación */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-[var(--mf-ok-border)] bg-[var(--mf-ok-soft)] p-4 space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--mf-ok)]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Síntesis de decisión recomendada</span>
                  </h3>
                  <p className="text-xs leading-relaxed font-medium text-[var(--mf-ink)]">
                    {decision.decision_recomendada}
                  </p>
                  {decision.nota_metodologica && (
                    <p className="text-xs text-[var(--mf-ink-2)] leading-relaxed">
                      {decision.nota_metodologica}
                    </p>
                  )}
                </div>

                <div className="mf-subsurface p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-[var(--mf-ink)]">
                    Qué tendría que validar el hospital para operarlo
                  </h3>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-[var(--mf-ink-2)]">
                    {(decision.requisitos_validacion_hospital || []).map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Hoja de ruta evolutiva en 3 etapas */}
              <div className="border-t border-[var(--mf-border)] pt-4 space-y-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5 text-[var(--mf-ink-2)]">
                  <Layers className="h-4 w-4 text-[var(--mf-accent)]" aria-hidden="true" />
                  <span>Hoja de ruta evolutiva (Urgencias → Hospitalización)</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-lg bg-[var(--mf-accent-soft)] p-3 text-[var(--mf-ink)]">
                    <strong className="text-[var(--mf-accent-ink)]">Etapa 1 [Activa]:</strong>{' '}
                    Pronóstico → decisión por franja con perfiles históricos e incertidumbre p10–p90.
                  </div>
                  <div className="mf-subsurface p-3 text-[var(--mf-ink-2)]">
                    <strong className="text-[var(--mf-ink)]">Etapa 2:</strong> Simulador del recorrido con marcas de decisión, asignación y traslado.
                  </div>
                  <div className="mf-subsurface p-3 text-[var(--mf-ink-2)]">
                    <strong className="text-[var(--mf-ink)]">Etapa 3:</strong> Piloto prospectivo en paralelo para validar anticipación y beneficio real.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionPanel>

      {/* Bloque 2: Recomendaciones base, simulador de capacidad y cuellos de botella */}
      <SectionPanel
        id="escenarios-capacidad"
        title={`Capacidad, Ley de Little y recomendaciones · ${servicio.nombre}`}
        subtitle="Ajuste paramétrico de tiempos de atención, reducción de estancia y redistribución horaria de altas."
      >
        <div className="space-y-6">
          {/* Recomendaciones cuantificadas · escenario base */}
          <div className="space-y-3">
            <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
              Recomendaciones cuantificadas · escenario base
            </h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(datos.recomendaciones || []).map((rec) => (
                <article key={rec.id} className="mf-subsurface p-4 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono-num font-semibold text-[var(--mf-ink-3)]">{rec.id}</span>
                      <span className="inline-flex rounded-full bg-[var(--mf-accent-soft)] px-2.5 py-0.5 font-medium text-[var(--mf-accent-ink)]">
                        {palancas[rec.palanca] || rec.palanca}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--mf-ink)]">{rec.titulo}</h4>
                    <p className="text-xs leading-relaxed text-[var(--mf-ink-2)]">{rec.accion}</p>
                  </div>
                  <div className="border-t border-[var(--mf-border)] pt-2.5 space-y-0.5">
                    <p className="text-xs font-semibold text-[var(--mf-ink)]">{rec.impacto_cuantificado}</p>
                    <p className="text-xs text-[var(--mf-ink-3)]">
                      {rec.area} · {rec.horizonte}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Controles paramétricos Erlang C y Ley de Little */}
          <div className="grid gap-4 lg:grid-cols-2 border-t border-[var(--mf-border)] pt-5">
            <div className="mf-subsurface p-4 space-y-4">
              <div>
                <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
                  Dotación por franja · Erlang C
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--mf-ink-2)]">
                  {servicio.nombre}: el tiempo de servicio 1/μ es un supuesto configurable, no una duración clínica observada. La dotación es el total teórico de servidores, no personal adicional frente a una plantilla conocida.
                </p>
              </div>
              <Control
                id="ctrl-tiempo-servicio"
                etiqueta="Tiempo de servicio (1/μ)"
                valor={tiempo}
                min={5}
                max={120}
                unidad="min"
                onChange={setTiempo}
              />
              <Control
                id="ctrl-meta-espera"
                etiqueta="Meta de espera"
                valor={meta}
                min={1}
                max={120}
                unidad="min"
                onChange={setMeta}
              />
              <p className="text-xs text-[var(--mf-ink-3)]">
                Nivel de servicio objetivo:{' '}
                <strong className="font-mono-num text-[var(--mf-ink-2)]">
                  {formato(datos.erlang_c?.nivel_servicio_objetivo * 100)} %
                </strong>
                . Sensibilidad base: 1/μ = {(datos.erlang_c?.tiempos_servicio_min || []).join(', ')} min.
              </p>
            </div>

            <div className="mf-subsurface p-4 space-y-4">
              <div>
                <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
                  Liberación de camas · Ley de Little y altas tempranas
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--mf-ink-2)]">
                  Hospitalización: <strong className="font-mono-num text-[var(--mf-ink)]">{formato(little?.ingresos_dia_promedio)}</strong> ingresos/día; estancia media{' '}
                  <strong className="font-mono-num text-[var(--mf-ink)]">{formato(little?.estancia_media_horas)} h</strong>.{' '}
                  L = λ × W: <strong className="font-mono-num text-[var(--mf-ink)]">{formato(little?.censo_teorico_little)}</strong> pacientes simultáneos.
                </p>
              </div>
              <Control
                id="ctrl-reduccion-estancia"
                etiqueta="Reducción de estancia media"
                valor={reduccion}
                min={0}
                max={48}
                unidad="h"
                onChange={setReduccion}
              />
              <Control
                id="ctrl-altas-tempranas"
                etiqueta="Altas de la tarde adelantadas a la mañana"
                valor={altas}
                min={0}
                max={80}
                unidad="%"
                onChange={setAltas}
              />
              <p className="text-xs text-[var(--mf-ink-3)]">
                Simulación horaria de redistribución de altas; no modifica la demanda ni garantiza capacidad física disponible.
              </p>
            </div>
          </div>

          {/* Resultado calculado del escenario */}
          <div aria-live="polite" aria-busy={!simulacion && !errorSimulacion} className="border-t border-[var(--mf-border)] pt-5">
            {errorSimulacion && (
              <div
                role="alert"
                className="rounded-lg border border-[var(--mf-warn-border)] bg-[var(--mf-warn-soft)] p-3.5 text-xs text-[var(--mf-warn)]"
              >
                {errorSimulacion}
              </div>
            )}

            {!simulacion && !errorSimulacion && (
              <div className="space-y-3" role="status">
                <p className="text-xs text-[var(--mf-ink-2)]">Calculando escenario seleccionado…</p>
                <div className="mf-skeleton h-28 w-full" />
              </div>
            )}

            {simulacion && (
              <div className="space-y-4">
                <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
                  Resultado del escenario · {servicio.nombre}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <caption className="pb-2.5 text-left text-xs text-[var(--mf-ink-2)]">
                      Dotación teórica para tasas de llegada normal, p75 y p90 (pacientes/hora)
                    </caption>
                    <thead>
                      <tr className="border-y border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-ink-2)]">
                        {[
                          'Franja',
                          'λ normal / p75 / p90',
                          'Personal normal',
                          'Personal p75',
                          'Personal p90',
                          'Δ p90 vs. normal',
                          'Espera p90 (min)',
                          'Ocupación p90 (%)',
                        ].map((titulo) => (
                          <th key={titulo} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                            {titulo}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--mf-border)] font-mono-num">
                      {(simulacion.erlang_c_franjas || []).map((fila) => (
                        <tr key={fila.franja}>
                          <th scope="row" className="px-3 py-2.5 font-sans font-semibold text-[var(--mf-ink)]">
                            {fila.franja}
                          </th>
                          <td className="px-3 py-2.5 text-[var(--mf-ink)]">
                            {[fila.lambda_normal_h, fila.lambda_p75_h, fila.lambda_p90_h]
                              .map((v) => formato(v))
                              .join(' / ')}
                          </td>
                          {[
                            fila.servidores_normal,
                            fila.servidores_p75,
                            fila.servidores_p90,
                            fila.delta_p90_vs_normal,
                            fila.espera_esperada_p90_min,
                            fila.ocupacion_p90_pct,
                          ].map((v, i) => (
                            <td key={i} className="px-3 py-2.5 text-[var(--mf-ink)]">
                              {formato(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mf-subsurface grid gap-4 p-4 text-xs sm:grid-cols-3 sm:divide-x sm:divide-[var(--mf-border)]">
                  <p className="text-[var(--mf-ink-2)]">
                    <strong className="block font-mono-num text-base font-semibold text-[var(--mf-ink)]">
                      {formato(simulacion.camas_liberadas_estancia)}
                    </strong>
                    camas equivalentes liberadas por menor estancia
                  </p>
                  <p className="sm:pl-4 text-[var(--mf-ink-2)]">
                    <strong className="block font-mono-num text-base font-semibold text-[var(--mf-ink)]">
                      {formato(escenario?.camas_pico_liberadas)}
                    </strong>
                    camas liberadas en el pico por altas tempranas
                  </p>
                  <p className="sm:pl-4 text-[var(--mf-ink-2)]">
                    <strong className="block font-mono-num text-base font-semibold text-[var(--mf-ink)]">
                      {formato(escenario?.reduccion_horas_rojo_pct)} %
                    </strong>
                    reducción relativa de horas rojas ({formato(escenario?.pct_horas_rojo_base)} % →{' '}
                    {formato(escenario?.pct_horas_rojo_simulado)} %)
                  </p>
                </div>

                <div className="text-xs text-[var(--mf-ink-3)] space-y-1">
                  <p>
                    Ventana de altas: <span className="font-mono-num text-[var(--mf-ink-2)]">{escenario?.ventana_origen} → {escenario?.ventana_destino}</span>.
                  </p>
                  <p>
                    Método del escenario de altas: {escenario?.metodo || 'No disponible'}. Los valores intermedios pueden ser interpolaciones de escenarios horarios precalculados.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sensibilidad de dotación */}
          {servicioErlang?.sensibilidad?.length > 0 && (
            <details className="border-t border-[var(--mf-border)] pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--mf-ink)] hover:text-[var(--mf-accent)]">
                Sensibilidad de dotación · escenario base
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono-num">
                  <thead>
                    <tr className="border-y border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-ink-2)] font-sans">
                      {['1/μ (min)', 'Franja pico', 'Normal', 'p75', 'p90', 'Δ p90'].map((t) => (
                        <th key={t} className="px-3 py-2 font-semibold">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mf-border)]">
                    {servicioErlang.sensibilidad.map((fila) => (
                      <tr key={fila.tiempo_servicio_min}>
                        <td className="px-3 py-2 text-[var(--mf-ink)]">{fila.tiempo_servicio_min}</td>
                        <td className="px-3 py-2 font-sans text-[var(--mf-ink-2)]">{fila.franja_pico}</td>
                        {[fila.servidores_normal, fila.servidores_p75, fila.servidores_p90, fila.delta_p90].map((v, i) => (
                          <td className="px-3 py-2 text-[var(--mf-ink)]" key={i}>
                            {formato(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Cuello de botella observacional */}
          {cuello && (
            <div className="border-t border-[var(--mf-border)] pt-4 space-y-2">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
                Cuello de botella · Urgencias → Hospitalización
              </h3>
              <p className="text-sm text-[var(--mf-ink-2)]">
                Espera p90:{' '}
                <strong className="font-mono-num text-[var(--mf-ink)]">{formato(cuello.espera_p90_horas)} h</strong> ·
                correlación entre censo y espera p90:{' '}
                <strong className="font-mono-num text-[var(--mf-ink)]">
                  {formato(cuello.correlacion_censo_espera_p90, 3)}
                </strong>
                .
              </p>
              <p className="text-xs text-[var(--mf-ink-2)]">
                p90 con censo normal:{' '}
                <span className="font-mono-num font-semibold text-[var(--mf-ink)]">
                  {formato(cuello.espera_p90_censo_normal_horas)} h
                </span>
                ; con censo alto:{' '}
                <span className="font-mono-num font-semibold text-[var(--mf-ink)]">
                  {formato(cuello.espera_p90_censo_alto_horas)} h
                </span>
                .
              </p>
              <p className="text-xs text-[var(--mf-ink-3)]">{cuello.nota_metodologica}</p>
              <p className="text-xs text-[var(--mf-ink-3)]">
                Asociación observacional, no efecto causal de una intervención.
              </p>
            </div>
          )}
        </div>
      </SectionPanel>
    </section>
  );
}
