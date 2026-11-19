import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getLargoPlazo } from '../lib/api';
import { SectionPanel } from './SectionPanel';

function formatWeek(date) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '')
    .replace(' de ', ' ');
}

export function LongTermForecast({ servicio, isDark = false }) {
  const [rawSeries, setRawSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    getLargoPlazo(servicio.id, { fecha_inicio: '2026-08-01', fecha_fin: '2026-11-30' })
      .then((result) => {
        if (!activo) return;
        const serieCompleta = result.serie || [];
        const serieSemanal = serieCompleta.filter(
          (_, index) => index % 7 === 0 || index === serieCompleta.length - 1,
        );
        setRawSeries(serieSemanal);
        setError(false);
      })
      .catch(() => {
        if (activo) setError(true);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => { activo = false; };
  }, [servicio.id]);

  const data = useMemo(
    () =>
      rawSeries.map((point) => ({
        ...point,
        etiqueta: formatWeek(point.fecha),
        p75: servicio.p75,
        p90: servicio.p90,
        intervaloBase: point.min,
        intervaloAncho: Math.max(0, point.max - point.min),
      })),
    [rawSeries, servicio.p75, servicio.p90],
  );

  const resumen = useMemo(() => {
    if (!data.length) return null;
    const max = data.reduce(
      (item, current) => (current.prediccion > item.prediccion ? current : item),
      data[0],
    );
    return { max, semanas: data.length };
  }, [data]);

  const theme = isDark
    ? {
        accent: '#149A93',
        series2: '#5BA4D6',
        grid: '#1B3545',
        axis: '#8EB0C2',
        warn: '#FCD34D',
        crit: '#FCA5A5',
        okFill: '#149A93',
        warnFill: '#FCD34D',
        critFill: '#FCA5A5',
      }
    : {
        accent: '#0B7A75',
        series2: '#1D5F8A',
        grid: '#DFE8EE',
        axis: '#526D7D',
        warn: '#9A4A06',
        crit: '#A81C1C',
        okFill: '#0B7A75',
        warnFill: '#9A4A06',
        critFill: '#A81C1C',
      };

  const peakActions = resumen ? (
    <div className="mf-subsurface inline-flex items-center gap-3 px-3.5 py-2 text-xs">
      <span className="text-[var(--mf-ink-2)]">Pico semanal esperado</span>
      <span className="font-mono-num text-base font-semibold text-[var(--mf-ink)]">
        {resumen.max.prediccion}
      </span>
      <span className="font-mono-num text-[var(--mf-ink-3)]">
        {resumen.max.etiqueta} · {resumen.semanas} sem.
      </span>
    </div>
  ) : null;

  return (
    <SectionPanel
      id="long-term"
      title="Planificación de capacidad"
      subtitle="Horizonte largo semanal · agosto–noviembre 2026 · intervalo ampliado"
      actions={peakActions}
      className="h-full flex flex-col justify-between"
    >
      <div className="space-y-4">
        <div className="h-72 w-full font-mono-num text-xs" aria-label="Pronóstico semanal de largo plazo">
          {loading && (
            <div className="space-y-3 py-6" aria-busy="true">
              <div className="mf-skeleton h-4 w-44" />
              <div className="mf-skeleton h-52 w-full" />
            </div>
          )}

          {error && !loading && (
            <div role="alert" className="mf-subsurface flex h-full items-center justify-center p-6 text-center text-sm font-medium text-[var(--mf-crit)]">
              Endpoint de largo plazo no disponible en este momento.
            </div>
          )}

          {!loading && !error && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="2 5" stroke={theme.grid} vertical={false} />
                <ReferenceArea y1={0} y2={data[0]?.p75 ?? 0} fill={theme.okFill} fillOpacity={0.05} ifOverflow="extendDomain" />
                <ReferenceArea y1={data[0]?.p75 ?? 0} y2={data[0]?.p90 ?? 0} fill={theme.warnFill} fillOpacity={0.06} ifOverflow="extendDomain" />
                <ReferenceArea y1={data[0]?.p90 ?? 0} y2="auto" fill={theme.critFill} fillOpacity={0.06} ifOverflow="extendDomain" />
                <ReferenceLine y={data[0]?.p75} stroke={theme.warn} strokeDasharray="5 4" strokeWidth={1.5} />
                <ReferenceLine y={data[0]?.p90} stroke={theme.crit} strokeDasharray="5 4" strokeWidth={1.5} />
                <XAxis
                  dataKey="etiqueta"
                  interval={0}
                  tick={{ fill: theme.axis, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: theme.grid }}
                />
                <YAxis
                  tick={{ fill: theme.axis, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
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
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fecha || label}
                  formatter={(value, name) => [
                    value,
                    name === 'prediccion' ? 'p50 esperado' : name === 'intervaloAncho' ? 'Ancho del intervalo' : null,
                  ]}
                />
                <Area type="monotone" dataKey="intervaloBase" stackId="intervalo" stroke="none" fill="transparent" fillOpacity={0} />
                <Area type="monotone" dataKey="intervaloAncho" stackId="intervalo" stroke="none" fill={theme.series2} fillOpacity={0.18} />
                <Line
                  type="monotone"
                  dataKey="prediccion"
                  name="prediccion"
                  stroke={theme.accent}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: theme.accent }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--mf-border)] pt-3 text-xs text-[var(--mf-ink-2)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full bg-[var(--mf-accent)]" />
            p50 esperado
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-xs bg-[var(--mf-chart-band)] border border-[var(--mf-ok-border)]" />
            Intervalo ampliado
          </span>
          <span className="text-[var(--mf-ink-3)]">
            Muestreo semanal · no sustituye el detalle diario de 7 días
          </span>
        </div>
      </div>
    </SectionPanel>
  );
}
