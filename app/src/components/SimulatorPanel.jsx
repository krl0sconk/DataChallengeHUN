import { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Check,
  Copy,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FECHA_BASE_MAXIMA, FECHA_INICIO_DATOS } from '../constants/servicios';
import { getEfectosEventos } from '../lib/api';
import { FlowBandBar } from './FlowBandBar';
import { SectionPanel } from './SectionPanel';

export function SimulatorPanel({
  servicio,
  fechaSimulacion,
  setFechaSimulacion,
  proyeccion,
  isDark,
}) {
  const { prediccion, alerta, factores, deltaTotal, serie7d } = proyeccion;
  const [copiado, setCopiado] = useState(false);
  const [vistaGrafica, setVistaGrafica] = useState('comparativa');
  const [eventos, setEventos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState('');
  const [cargandoEventos, setCargandoEventos] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargandoEventos(true);
    getEfectosEventos(servicio.id)
      .then((data) => {
        if (!activo) return;
        const lista = Array.isArray(data.eventos) ? data.eventos : [];
        setEventos(lista);
        setEventoActivo((actual) =>
          lista.some((evento) => evento.evento === actual) ? actual : lista[0]?.evento || '',
        );
      })
      .catch(() => activo && setEventos([]))
      .finally(() => activo && setCargandoEventos(false));
    return () => {
      activo = false;
    };
  }, [servicio.id]);

  const eventoSeleccionado = eventos.find((evento) => evento.evento === eventoActivo);

  const copiarConfiguracion = () => {
    const textoCompartir = `[Simulación MediFlow · HUN - ${servicio.nombre}]
Fecha base: ${fechaSimulacion}
Demanda estimada: ${prediccion} pac. (${deltaTotal > 0 ? '+' : ''}${deltaTotal} vs. habitual)
Estado: ${alerta.etiqueta} (${alerta.subtitulo})
Factores identificados por el modelo:
${(factores || []).map((f) => `- ${f.nombre}: ${f.aporte > 0 ? '+' : ''}${f.aporte} pac.`).join('\n')}
Recomendación: ${alerta.accion}`;

    navigator.clipboard.writeText(textoCompartir).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  // Paleta de gráficos sincronizada con tokens MediFlow en Turno día / Turno noche
  const chartColors = {
    accent: isDark ? '#149A93' : '#0B7A75',
    series2: isDark ? '#5BA4D6' : '#1D5F8A',
    crit: isDark ? '#FCA5A5' : '#A81C1C',
    warn: isDark ? '#FCD34D' : '#9A4A06',
    grid: isDark ? '#1B3545' : '#DFE8EE',
    axis: isDark ? '#8EB0C2' : '#526D7D',
  };

  const tooltipStyle = {
    backgroundColor: 'var(--mf-surface)',
    borderColor: 'var(--mf-border-strong)',
    borderRadius: '8px',
    color: 'var(--mf-ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
  };

  const copyAction = (
    <button
      type="button"
      onClick={copiarConfiguracion}
      className={copiado ? 'mf-btn-primary' : 'mf-btn-secondary'}
    >
      {copiado ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span>{copiado ? 'Copiado al portapapeles' : 'Copiar resumen'}</span>
    </button>
  );

  return (
    <SectionPanel
      id="simulador-demanda"
      title={`Factores de demanda y proyección · ${servicio.nombre}`}
      subtitle="Evaluación por fecha histórica, descomposición de factores del modelo y escenarios observados por evento."
      actions={copyAction}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna izquierda: Controles del simulador */}
        <div className="space-y-5 lg:col-span-4">
          <div className="mf-subsurface p-4 space-y-2.5">
            <label
              htmlFor="input-fecha"
              className="flex items-center gap-2 text-xs font-semibold text-[var(--mf-ink)] cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-[var(--mf-accent)]" aria-hidden="true" />
              <span>Fecha histórica a evaluar</span>
            </label>
            <input
              id="input-fecha"
              type="date"
              value={fechaSimulacion}
              min={FECHA_INICIO_DATOS}
              max={FECHA_BASE_MAXIMA}
              onChange={(e) => setFechaSimulacion(e.target.value)}
              className="mf-input w-full font-mono-num font-semibold"
            />
            <p className="text-xs text-[var(--mf-ink-3)]">
              Rango de la base: 1 ene 2023 al 16 jul 2026 (ventana de 7 días).
            </p>
          </div>

          <div className="mf-subsurface p-4 space-y-3">
            <label
              htmlFor="select-evento-historico"
              className="flex items-center gap-2 text-xs font-semibold text-[var(--mf-ink)]"
            >
              <Activity className="h-4 w-4 text-[var(--mf-accent)]" aria-hidden="true" />
              <span>Escenario histórico por evento</span>
            </label>

            {cargandoEventos && (
              <div className="space-y-2" role="status">
                <div className="mf-skeleton h-9 w-full" />
                <div className="mf-skeleton h-16 w-full" />
              </div>
            )}

            {!cargandoEventos && !eventos.length && (
              <p className="text-xs text-[var(--mf-ink-2)]">
                La API no devolvió escenarios para este servicio.
              </p>
            )}

            {!cargandoEventos && eventos.length > 0 && (
              <>
                <select
                  id="select-evento-historico"
                  value={eventoActivo}
                  onChange={(e) => setEventoActivo(e.target.value)}
                  className="mf-input w-full font-medium"
                >
                  {eventos.map((evento) => (
                    <option key={evento.evento} value={evento.evento}>
                      {evento.etiqueta}
                    </option>
                  ))}
                </select>

                {eventoSeleccionado && (
                  <div className="space-y-2.5 border-t border-[var(--mf-border)] pt-3 text-xs">
                    <p className="font-medium text-[var(--mf-ink)]">{eventoSeleccionado.frase}</p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[var(--mf-ink-2)]">
                      <div className="flex justify-between gap-2">
                        <dt>Con evento</dt>
                        <dd className="font-mono-num font-semibold text-[var(--mf-ink)]">
                          {eventoSeleccionado.media_evento}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Normal</dt>
                        <dd className="font-mono-num font-semibold text-[var(--mf-ink)]">
                          {eventoSeleccionado.media_normal}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Cambio</dt>
                        <dd className="font-mono-num font-semibold text-[var(--mf-ink)]">
                          {eventoSeleccionado.cambio_visitas > 0 ? '+' : ''}
                          {eventoSeleccionado.cambio_visitas}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Observados</dt>
                        <dd className="font-mono-num font-semibold text-[var(--mf-ink)]">
                          {eventoSeleccionado.n_dias} d
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Columna derecha: Visualización y respuesta */}
        <div className="flex flex-col justify-between space-y-5 lg:col-span-8 lg:border-l lg:border-[var(--mf-border)] lg:pl-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
                Respuesta proyectada en {servicio.nombre}
              </h3>
              <span className="text-xs text-[var(--mf-ink-2)]">
                Fecha evaluada: <strong className="font-mono-num text-[var(--mf-ink)]">{fechaSimulacion}</strong>
              </span>
            </div>

            {/* Franja de lectura rápida KPI + Estado */}
            <div className="mf-subsurface grid grid-cols-1 divide-y divide-[var(--mf-border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <span className="text-xs font-medium text-[var(--mf-ink-3)]">Llegadas estimadas</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono-num text-3xl font-semibold text-[var(--mf-ink)]">
                    {prediccion}
                  </span>
                  <span className="text-xs text-[var(--mf-ink-2)]">pacientes</span>
                </div>
                <p
                  className={`mt-1 text-xs font-medium font-mono-num ${
                    deltaTotal > 0
                      ? 'text-[var(--mf-crit)]'
                      : deltaTotal < 0
                        ? 'text-[var(--mf-ok)]'
                        : 'text-[var(--mf-ink-2)]'
                  }`}
                >
                  {deltaTotal > 0 ? '+' : ''}
                  {deltaTotal} pac. vs. habitual ({servicio.mediaDiaria})
                </p>
              </div>

              <div className="p-4 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--mf-ink-3)]">Nivel de saturación</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${alerta.badgeClass}`}>
                    {alerta.etiqueta}
                  </span>
                </div>
                <p className="text-xs text-[var(--mf-ink-2)]">{alerta.subtitulo}</p>
                <FlowBandBar
                  value={prediccion ?? 0}
                  p75={servicio.p75}
                  p90={servicio.p90}
                  min={proyeccion.min}
                  max={proyeccion.max}
                  compact
                  label={`Nivel de saturación en ${servicio.nombre}`}
                />
              </div>
            </div>

            {/* Selector de vista de gráfica */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mf-border)] pb-3">
              <span className="text-xs font-semibold text-[var(--mf-ink-2)]">
                {vistaGrafica === 'comparativa'
                  ? 'Curva proyectada: simulación vs. volumen habitual'
                  : 'Desglose por factor externo del modelo'}
              </span>
              <div className="mf-subsurface inline-flex items-center gap-1 p-1">
                <button
                  type="button"
                  onClick={() => setVistaGrafica('comparativa')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    vistaGrafica === 'comparativa'
                      ? 'bg-[var(--mf-surface)] text-[var(--mf-ink)] shadow-2xs'
                      : 'text-[var(--mf-ink-2)] hover:text-[var(--mf-ink)]'
                  }`}
                >
                  <LineChartIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Curva comparativa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVistaGrafica('factores')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    vistaGrafica === 'factores'
                      ? 'bg-[var(--mf-surface)] text-[var(--mf-ink)] shadow-2xs'
                      : 'text-[var(--mf-ink-2)] hover:text-[var(--mf-ink)]'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Aporte factores</span>
                </button>
              </div>
            </div>

            {/* Gráfica 1: Curva comparativa */}
            {vistaGrafica === 'comparativa' && (
              <div>
                <div className="h-56 w-full font-mono-num text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={serie7d} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSimuladoMf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.accent} stopOpacity={0.28} />
                          <stop offset="95%" stopColor={chartColors.accent} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="dia" stroke={chartColors.axis} fontSize={12} tickLine={false} />
                      <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val, name) => [
                          `${val} pacientes`,
                          name === 'simulado' ? 'Simulación con factores' : 'Volumen habitual',
                        ]}
                      />
                      <ReferenceLine
                        y={servicio.p90}
                        stroke={chartColors.crit}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: `Saturación p90 (${servicio.p90})`,
                          fill: chartColors.crit,
                          fontSize: 12,
                          position: 'insideTopRight',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="habitual"
                        stroke={chartColors.series2}
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fillOpacity={0}
                        name="habitual"
                      />
                      <Area
                        type="monotone"
                        dataKey="simulado"
                        stroke={chartColors.accent}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorSimuladoMf)"
                        name="simulado"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--mf-ink-2)]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-4 bg-[var(--mf-accent)] inline-block" aria-hidden="true" />
                    Simulación actual
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-4 border-t-2 border-dashed border-[var(--mf-series-2)] inline-block" aria-hidden="true" />
                    Promedio habitual
                  </span>
                </div>
              </div>
            )}

            {/* Gráfica 2: Desglose por factor */}
            {vistaGrafica === 'factores' && (
              <div>
                {factores.length > 0 ? (
                  <div className="h-56 w-full font-mono-num text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={factores}
                        margin={{ top: 5, right: 32, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                        <XAxis
                          type="number"
                          stroke={chartColors.axis}
                          fontSize={12}
                          tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                        />
                        <YAxis
                          dataKey="nombre"
                          type="category"
                          stroke={chartColors.axis}
                          fontSize={12}
                          width={165}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(val) => [`${val > 0 ? '+' : ''}${val} pacientes`, 'Variación']}
                        />
                        <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                          {factores.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.aporte > 0 ? chartColors.warn : chartColors.accent}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mf-subsurface p-8 text-center text-xs font-medium text-[var(--mf-ink-2)]">
                    Todos los factores externos están en su valor basal. No hay variación sobre la media histórica.
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="border-t border-[var(--mf-border)] pt-3.5 text-xs text-[var(--mf-ink-2)] leading-relaxed">
            <strong className="font-semibold text-[var(--mf-ink)]">Acción recomendada:</strong> {alerta.accion}
          </footer>
        </div>
      </div>
    </SectionPanel>
  );
}
