import { useEffect, useState } from 'react';
import {
  BarChart as BarChartIcon,
  Calendar,
  LineChart as LineChartIcon,
  Palmtree,
  PartyPopper,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getEfectosEventos } from '../lib/api';
import { SectionPanel } from './SectionPanel';

export function DemandChart({
  serie7d = [],
  factores = [],
  servicio,
  isDark,
  fechaSimulacion,
  onCambiarFecha,
  minFecha,
  maxFecha,
  isApiConnected,
  isLoading,
}) {
  const [horizonte, setHorizonte] = useState(7); // 3, 5, 7, 10, 14 días
  const [vista, setVista] = useState('curva'); // 'curva' | 'factores'
  const [efectosEventos, setEfectosEventos] = useState([]);

  useEffect(() => {
    let activo = true;
    getEfectosEventos(servicio.id)
      .then((data) => {
        if (activo) setEfectosEventos(Array.isArray(data.eventos) ? data.eventos : []);
      })
      .catch(() => {
        if (activo) setEfectosEventos([]);
      });
    return () => { activo = false; };
  }, [servicio.id]);

  const theme = isDark
    ? {
        accent: '#149A93',
        series2: '#5BA4D6',
        grid: '#1B3545',
        axis: '#8EB0C2',
        warn: '#FCD34D',
        crit: '#FCA5A5',
      }
    : {
        accent: '#0B7A75',
        series2: '#1D5F8A',
        grid: '#DFE8EE',
        axis: '#526D7D',
        warn: '#9A4A06',
        crit: '#A81C1C',
      };

  const datosFiltrados = (serie7d || []).slice(0, horizonte);
  const datosGrafica = datosFiltrados.map((d) => ({
    ...d,
    banda: [d.min ?? d.prediccion, d.max ?? d.prediccion],
  }));
  const p75 = datosFiltrados.find((d) => d.p75 != null)?.p75 ?? servicio.p75;
  const p90 = datosFiltrados.find((d) => d.p90 != null)?.p90 ?? servicio.p90;

  // Ajuste del eje Y: evita aplastar la curva cuando la demanda está por debajo de p90
  const maxDato = datosFiltrados.length > 0
    ? Math.max(...datosFiltrados.map((d) => d.max ?? d.prediccion))
    : (p90 || 540);
  const techoVisible = Math.max(
    Math.ceil(maxDato * 1.25),
    Math.min(p75 || maxDato, Math.ceil(maxDato * 1.5)),
  );
  const yMax = p75 > 0 && maxDato >= p75 * 0.8
    ? Math.max(Math.ceil(maxDato * 1.1), (p90 || maxDato) + 20)
    : techoVisible;
  const yDomain = [0, yMax];

  // Detección de eventos especiales en la ventana
  const eventosActivos = datosFiltrados.reduce((acc, d) => {
    const factoresDia = d.factores || [];
    const esCarnaval = d.es_carnaval === true
      || factoresDia.some((f) => f.nombre.toLowerCase().includes('carnaval') && Math.abs(f.aporte) >= 1.0);
    const esFestivo = d.es_festivo === true
      || factoresDia.some((f) => f.nombre.toLowerCase().includes('festivo') && Math.abs(f.aporte) >= 1.0);
    const esVacaciones = d.es_vacaciones === true
      || factoresDia.some((f) => f.nombre.toLowerCase().includes('vacacion') && Math.abs(f.aporte) >= 1.0);

    if (esCarnaval) {
      acc.push({
        dia: d.dia,
        tipo: 'carnaval',
        etiqueta: 'Carnaval',
        fill: theme.series2,
        fillOpacity: 0.14,
        Icon: PartyPopper,
        badgeClass: 'bg-[var(--mf-accent-soft)] text-[var(--mf-accent-ink)] border border-[var(--mf-border)]',
      });
    } else if (esFestivo) {
      acc.push({
        dia: d.dia,
        tipo: 'festivo',
        etiqueta: 'Festivo',
        fill: theme.warn,
        fillOpacity: 0.12,
        Icon: Sparkles,
        badgeClass: 'mf-badge-warn',
      });
    } else if (esVacaciones) {
      acc.push({
        dia: d.dia,
        tipo: 'vacaciones',
        etiqueta: 'Vacaciones',
        fill: theme.accent,
        fillOpacity: 0.10,
        Icon: Palmtree,
        badgeClass: 'mf-badge-ok',
      });
    }
    return acc;
  }, []);

  // Frase dinámica con datos reales de /api/efectos-eventos
  const eventoFestivo = efectosEventos.find((e) => /festiv/i.test(e.evento || e.nombre || ''));
  const pctFestivo = eventoFestivo && eventoFestivo.media_normal > 0
    ? Math.round(((eventoFestivo.media_evento - eventoFestivo.media_normal) / eventoFestivo.media_normal) * 100)
    : null;

  const tooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const dato = payload[0]?.payload;
    if (!dato) return null;
    const minVal = dato.min ?? dato.prediccion;
    const maxVal = dato.max ?? dato.prediccion;
    return (
      <div className="rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface)] p-3 text-xs text-[var(--mf-ink)]">
        <p className="mb-2 font-semibold text-[var(--mf-ink)]">{label}</p>
        <div className="space-y-1.5">
          <div className="flex min-w-[210px] items-center justify-between gap-4">
            <span className="text-[var(--mf-ink-2)]">Proyección p50:</span>
            <strong className="font-mono-num text-[var(--mf-ink)]">{dato.prediccion} pac.</strong>
          </div>
          <div className="flex min-w-[210px] items-center justify-between gap-4">
            <span className="text-[var(--mf-ink-2)]">Rango p10–p90:</span>
            <strong className="font-mono-num text-[var(--mf-ink)]">{minVal} – {maxVal} pac.</strong>
          </div>
        </div>
      </div>
    );
  };

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mf-border-strong)] bg-[var(--mf-surface)] px-2.5 py-1.5 text-xs text-[var(--mf-ink-2)]">
        <Calendar className="h-3.5 w-3.5 text-[var(--mf-accent)]" aria-hidden="true" />
        <span className="sr-only">Fecha base de simulación</span>
        <input
          type="date"
          value={fechaSimulacion}
          min={minFecha}
          max={maxFecha}
          onChange={(e) => onCambiarFecha(e.target.value)}
          className="bg-transparent font-mono-num text-xs font-semibold text-[var(--mf-ink)] focus:outline-none cursor-pointer"
        />
      </label>

      <div
        role="group"
        aria-label="Horizonte de días"
        className="mf-subsurface inline-flex items-center gap-0.5 p-1"
      >
        {[3, 5, 7, 10, 14].map((dias) => {
          const activo = horizonte === dias;
          return (
            <button
              key={dias}
              type="button"
              onClick={() => setHorizonte(dias)}
              aria-pressed={activo}
              className={`rounded-md px-2.5 py-1 font-mono-num text-xs font-semibold transition-colors cursor-pointer ${
                activo
                  ? 'bg-[var(--mf-surface)] text-[var(--mf-ink)] border border-[var(--mf-border)]'
                  : 'text-[var(--mf-ink-2)] hover:text-[var(--mf-ink)] border border-transparent'
              }`}
            >
              {dias}d
            </button>
          );
        })}
      </div>

      <div
        role="group"
        aria-label="Modo de visualización"
        className="mf-subsurface inline-flex items-center gap-0.5 p-1"
      >
        <button
          type="button"
          onClick={() => setVista('curva')}
          aria-pressed={vista === 'curva'}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
            vista === 'curva'
              ? 'bg-[var(--mf-surface)] text-[var(--mf-ink)] border border-[var(--mf-border)]'
              : 'text-[var(--mf-ink-2)] hover:text-[var(--mf-ink)] border border-transparent'
          }`}
        >
          <LineChartIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Curva</span>
        </button>
        <button
          type="button"
          onClick={() => setVista('factores')}
          aria-pressed={vista === 'factores'}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
            vista === 'factores'
              ? 'bg-[var(--mf-surface)] text-[var(--mf-ink)] border border-[var(--mf-border)]'
              : 'text-[var(--mf-ink-2)] hover:text-[var(--mf-ink)] border border-transparent'
          }`}
        >
          <BarChartIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Factores</span>
        </button>
      </div>
    </div>
  );

  return (
    <SectionPanel
      id="demand-chart"
      title="Pronóstico y descomposición de demanda"
      subtitle={`Corto plazo (${horizonte} días) desde ${fechaSimulacion} · ${servicio.nombre}`}
      actions={controls}
    >
      {!isApiConnected && !isLoading ? (
        <div className="mf-subsurface flex h-64 w-full flex-col items-center justify-center gap-2 p-6 text-center">
          <WifiOff className="h-7 w-7 text-[var(--mf-warn)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--mf-ink)]">
            Curva de demanda no disponible
          </p>
          <p className="max-w-md text-xs text-[var(--mf-ink-2)]">
            Esperando conexión con el servicio analítico de proyecciones hospitalarias.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Leyenda técnica */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--mf-border)] pb-3 text-xs text-[var(--mf-ink-2)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full bg-[var(--mf-accent)]" />
              Proyección esperada (p50)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-4 rounded-xs bg-[var(--mf-chart-band)] border border-[var(--mf-ok-border)]" />
              Intervalo p10–p90
            </span>
            <span className="inline-flex items-center gap-2 font-mono-num">
              <span className="h-0.5 w-4 bg-[var(--mf-warn)]" />
              Alerta p75 ({p75})
            </span>
            <span className="inline-flex items-center gap-2 font-mono-num">
              <span className="h-0.5 w-4 bg-[var(--mf-crit)]" />
              Saturación p90 ({p90})
            </span>
          </div>

          {vista === 'curva' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-3 py-4" aria-busy="true">
                  <div className="mf-skeleton h-4 w-48" />
                  <div className="mf-skeleton h-56 w-full" />
                </div>
              ) : (
                <div className="h-64 w-full font-mono-num text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datosGrafica} margin={{ top: 14, right: 16, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.accent} stopOpacity={0.22} />
                          <stop offset="95%" stopColor={theme.accent} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={theme.grid} />
                      {eventosActivos.map((ev) => (
                        <ReferenceArea
                          key={`banda-${ev.tipo}-${ev.dia}`}
                          x1={ev.dia}
                          x2={ev.dia}
                          y1={yDomain[0]}
                          y2={yDomain[1]}
                          fill={ev.fill}
                          fillOpacity={ev.fillOpacity}
                          stroke="none"
                        />
                      ))}
                      <XAxis
                        dataKey="dia"
                        stroke={theme.axis}
                        tick={{ fill: theme.axis, fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={theme.axis}
                        tick={{ fill: theme.axis, fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        domain={yDomain}
                      />
                      <Tooltip content={tooltipContent} />
                      <ReferenceLine
                        y={p75}
                        stroke={theme.warn}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        label={{
                          value: `Alerta p75 · ${p75}`,
                          fill: theme.warn,
                          fontSize: 12,
                          fontWeight: 600,
                          position: 'insideTopLeft',
                        }}
                      />
                      <ReferenceLine
                        y={p90}
                        stroke={theme.crit}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        label={{
                          value: `Saturación p90 · ${p90}`,
                          fill: theme.crit,
                          fontSize: 12,
                          fontWeight: 600,
                          position: 'insideTopLeft',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="banda"
                        stroke="none"
                        fill={theme.series2}
                        fillOpacity={0.14}
                        name="Intervalo p10–p90"
                      />
                      <Area
                        type="monotone"
                        dataKey="prediccion"
                        stroke={theme.accent}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorDemanda)"
                        name="prediccion"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Badges de eventos especiales en la ventana */}
              {eventosActivos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {eventosActivos.map((ev) => {
                    const Icon = ev.Icon;
                    return (
                      <span
                        key={`chip-${ev.tipo}-${ev.dia}`}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ev.badgeClass}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{ev.etiqueta}</span>
                        <span className="font-mono-num">· {ev.dia}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Frase calculada con datos reales del endpoint /api/efectos-eventos */}
              {pctFestivo !== null && (
                <div className="mf-subsurface flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[var(--mf-ink-2)]">
                  <Sparkles className="h-4 w-4 shrink-0 text-[var(--mf-warn)]" aria-hidden="true" />
                  <span>
                    En festivos, <strong className="font-semibold text-[var(--mf-ink)]">{servicio.nombre.toLowerCase()}</strong>{' '}
                    {pctFestivo >= 0 ? 'sube' : 'baja'} en promedio{' '}
                    <strong className="font-mono-num font-semibold text-[var(--mf-ink)]">{Math.abs(pctFestivo)}%</strong> frente a un día normal.
                  </span>
                </div>
              )}
            </div>
          )}

          {vista === 'factores' && (
            <div className="flex h-64 w-full flex-col justify-center font-mono-num text-xs">
              {factores.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={factores} margin={{ top: 10, right: 32, left: 20, bottom: 5 }}>
                    <CartesianGrid horizontal={false} stroke={theme.grid} />
                    <XAxis
                      type="number"
                      stroke={theme.axis}
                      tick={{ fill: theme.axis, fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                    />
                    <YAxis
                      dataKey="nombre"
                      type="category"
                      stroke={theme.axis}
                      tick={{ fill: theme.axis, fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={175}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--mf-surface)',
                        borderColor: 'var(--mf-border)',
                        borderRadius: '8px',
                        color: 'var(--mf-ink)',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                      }}
                      formatter={(val) => [`${val > 0 ? '+' : ''}${val} pacientes`, 'Aporte al modelo']}
                    />
                    <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                      {factores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.aporte > 0 ? theme.crit : theme.accent}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="mf-subsurface p-6 text-center text-xs font-medium text-[var(--mf-ink-2)]">
                  Esta fecha opera en su valor basal histórico. No hay ajustes estacionales de lunes, fin de semana o quincena.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </SectionPanel>
  );
}
