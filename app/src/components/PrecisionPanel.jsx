import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getComparacion } from '../lib/api';
import { SectionPanel } from './SectionPanel';

function shortDate(value) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })
    .format(new Date(`${value}T12:00:00`))
    .replace('.', '');
}

function PrecisionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface)] px-3 py-2.5 text-xs text-[var(--mf-ink)]">
      <p className="font-mono-num font-semibold text-[var(--mf-ink)]">{point.fecha}</p>
      <div className="mt-1.5 space-y-1 font-mono-num text-[var(--mf-ink-2)]">
        <p>
          Real observada: <strong className="font-semibold text-[var(--mf-ink)]">{point.real} pac.</strong>
        </p>
        <p>
          Predicha (p50): <strong className="font-semibold text-[var(--mf-ink)]">{point.prediccion} pac.</strong>
        </p>
        <p>
          Intervalo p10–p90: <strong className="font-semibold text-[var(--mf-ink)]">{point.min}–{point.max} pac.</strong>
        </p>
      </div>
    </div>
  );
}

export function PrecisionPanel({ servicio, isDark = false }) {
  const [rango, setRango] = useState({ inicio: '', fin: '' });
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    const params = new URLSearchParams();
    if (rango.inicio) params.set('fecha_inicio', rango.inicio);
    if (rango.fin) params.set('fecha_fin', rango.fin);
    const query = params.toString();

    getComparacion(servicio.id, query)
      .then((data) => {
        if (!activo) return;
        setResultado(data);
        setError(false);
        if (!rango.inicio && data.serie?.length) {
          setRango({
            inicio: data.serie[0].fecha,
            fin: data.serie[data.serie.length - 1].fecha,
          });
        }
      })
      .catch(() => {
        if (activo) setError(true);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [servicio.id, rango.inicio, rango.fin]);

  const datos = useMemo(
    () =>
      (resultado?.serie || []).map((point) => ({
        ...point,
        etiqueta: shortDate(point.fecha),
        intervalo: [point.min, point.max],
      })),
    [resultado],
  );

  const metricas = useMemo(() => {
    if (!datos.length) return null;
    const totalReal = datos.reduce((sum, point) => sum + Math.abs(point.real || 0), 0);
    const errorTotal = datos.reduce(
      (sum, point) => sum + Math.abs((point.real || 0) - (point.prediccion || 0)),
      0,
    );
    const cobertura =
      datos.filter((point) => point.real >= point.min && point.real <= point.max).length /
      datos.length;
    const wape = totalReal ? errorTotal / totalReal : 0;
    const mae = datos.length ? errorTotal / datos.length : 0;

    return {
      exactitud_pct: totalReal ? (1 - wape) * 100 : 0,
      wape,
      mae,
      cobertura,
      n_dias: datos.length,
    };
  }, [datos]);

  const chartColors = isDark
    ? {
        prediccion: '#149A93',
        real: '#5BA4D6',
        banda: '#149A93',
        bandaOpacity: 0.22,
        grid: '#1B3545',
        axis: '#8EB0C2',
        axisLine: '#2F556B',
      }
    : {
        prediccion: '#0B7A75',
        real: '#1D5F8A',
        banda: '#0B7A75',
        bandaOpacity: 0.14,
        grid: '#DFE8EE',
        axis: '#526D7D',
        axisLine: '#B5C7D3',
      };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--mf-ink-2)]">
        <CalendarDays className="h-3.5 w-3.5 text-[var(--mf-accent)] shrink-0" aria-hidden="true" />
        <span>Desde</span>
        <input
          type="date"
          aria-label="Fecha inicial de validación"
          value={rango.inicio}
          max={rango.fin || undefined}
          onChange={(event) =>
            setRango((current) => ({ ...current, inicio: event.target.value }))
          }
          className="mf-input font-mono-num text-xs"
        />
      </label>
      <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--mf-ink-2)]">
        <span>Hasta</span>
        <input
          type="date"
          aria-label="Fecha final de validación"
          value={rango.fin}
          min={rango.inicio || undefined}
          onChange={(event) =>
            setRango((current) => ({ ...current, fin: event.target.value }))
          }
          className="mf-input font-mono-num text-xs"
        />
      </label>
    </div>
  );

  return (
    <SectionPanel
      id="precision-panel"
      title={`Validación histórica en ${servicio.nombre}`}
      subtitle="Evaluación walk-forward entre llegadas observadas y pronóstico diario p50 con intervalo de incertidumbre p10–p90."
      actions={toolbar}
      noPadding
    >
      {cargando && (
        <div role="status" aria-busy="true" className="space-y-4 p-5 sm:p-6">
          <span className="sr-only">Cargando comparación histórica…</span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="mf-skeleton h-16 w-full" />
            <div className="mf-skeleton h-16 w-full" />
            <div className="mf-skeleton h-16 w-full" />
            <div className="mf-skeleton h-16 w-full" />
          </div>
          <div className="mf-skeleton h-80 w-full" />
        </div>
      )}

      {error && (
        <div className="p-5 sm:p-6">
          <div
            role="alert"
            className="rounded-lg border border-[var(--mf-warn-border)] bg-[var(--mf-warn-soft)] p-4 text-sm text-[var(--mf-warn)]"
          >
            No se pudo cargar la comparación histórica del servicio.
          </div>
        </div>
      )}

      {!cargando && !error && resultado && !datos.length && (
        <div role="status" className="p-6 text-sm text-[var(--mf-ink-2)]">
          No hay observaciones reales y predichas dentro de ese rango. Prueba con otras fechas.
        </div>
      )}

      {!cargando && !error && resultado && datos.length > 0 && metricas && (
        <>
          {/* Franja métrica horizontal dividida por hairlines (sin tarjetas anidadas) */}
          <dl className="grid grid-cols-1 divide-y divide-[var(--mf-border)] border-b border-[var(--mf-border)] bg-[var(--mf-surface-2)]/40 sm:grid-cols-2 lg:grid-cols-4 sm:divide-y-0 sm:divide-x">
            <div className="px-5 py-4 sm:px-6">
              <dt className="text-xs font-medium text-[var(--mf-ink-2)]">
                Exactitud del modelo
              </dt>
              <dd className="mt-1 font-mono-num text-2xl font-semibold tracking-tight text-[var(--mf-ink)]">
                {metricas.exactitud_pct.toFixed(1)}%
              </dd>
              <p className="mt-0.5 text-xs text-[var(--mf-ink-3)] font-mono-num">
                {metricas.n_dias} días comparados
              </p>
            </div>

            <div className="px-5 py-4 sm:px-6">
              <dt className="text-xs font-medium text-[var(--mf-ink-2)]">
                Error WAPE
              </dt>
              <dd className="mt-1 font-mono-num text-2xl font-semibold tracking-tight text-[var(--mf-ink)]">
                {(metricas.wape * 100).toFixed(1)}%
              </dd>
              <p className="mt-0.5 text-xs text-[var(--mf-ink-3)]">
                Error porcentual ponderado
              </p>
            </div>

            <div className="px-5 py-4 sm:px-6">
              <dt className="text-xs font-medium text-[var(--mf-ink-2)]">
                Error medio (MAE)
              </dt>
              <dd className="mt-1 font-mono-num text-2xl font-semibold tracking-tight text-[var(--mf-ink)]">
                {metricas.mae.toFixed(1)}{' '}
                <span className="text-sm font-medium text-[var(--mf-ink-2)]">pac./día</span>
              </dd>
              <p className="mt-0.5 text-xs text-[var(--mf-ink-3)]">
                Desviación absoluta media
              </p>
            </div>

            <div className="px-5 py-4 sm:px-6">
              <dt className="text-xs font-medium text-[var(--mf-ink-2)]">
                Cobertura p10–p90
              </dt>
              <dd className="mt-1 font-mono-num text-2xl font-semibold tracking-tight text-[var(--mf-ok)]">
                {(metricas.cobertura * 100).toFixed(1)}%
              </dd>
              <p className="mt-0.5 text-xs text-[var(--mf-ink-3)]">
                Días dentro de la banda
              </p>
            </div>
          </dl>

          <div className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
                  Predicción p50 contra llegada real
                </h3>
                <p className="mt-0.5 text-xs text-[var(--mf-ink-2)]">
                  {resultado.nombre} ·{' '}
                  <span className="font-mono-num">{datos.length}</span> observaciones disponibles
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--mf-ink-2)]">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chartColors.prediccion }}
                  />
                  <span>Predicha (p50)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chartColors.real }}
                  />
                  <span>Real observada</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-3.5 rounded-sm"
                    style={{
                      backgroundColor: chartColors.banda,
                      opacity: isDark ? 0.35 : 0.25,
                    }}
                  />
                  <span>Intervalo p10–p90</span>
                </span>
              </div>
            </div>

            <div
              className="h-80 w-full min-w-0"
              aria-label="Curva de predicción frente a llegadas reales"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart data={datos} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                    vertical={false}
                  />
                  <Area
                    type="linear"
                    dataKey="intervalo"
                    name="Intervalo p10–p90"
                    fill={chartColors.banda}
                    fillOpacity={chartColors.bandaOpacity}
                    stroke="none"
                    activeDot={false}
                  />
                  <XAxis
                    dataKey="etiqueta"
                    interval="preserveStartEnd"
                    tick={{ fill: chartColors.axis, fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.axisLine }}
                  />
                  <YAxis
                    tick={{ fill: chartColors.axis, fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={46}
                  />
                  <Tooltip content={<PrecisionTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="prediccion"
                    name="Predicha (p50)"
                    stroke={chartColors.prediccion}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: chartColors.prediccion }}
                  />
                  <Line
                    type="monotone"
                    dataKey="real"
                    name="Real observada"
                    stroke={chartColors.real}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: chartColors.real }}
                    activeDot={{ r: 5, fill: chartColors.real }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </SectionPanel>
  );
}
