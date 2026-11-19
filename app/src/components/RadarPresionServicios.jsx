import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getCuellosBotella } from '../lib/api';
import { SectionPanel } from './SectionPanel';

function EtapasTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface)] px-3 py-2.5 text-xs text-[var(--mf-ink)]">
      <p className="font-semibold text-[var(--mf-ink)]">{item.etapa}</p>
      <div className="mt-1.5 space-y-1 font-mono-num text-[var(--mf-ink-2)]">
        <p>
          p90: <strong className="font-semibold text-[var(--mf-ink)]">{item.p90_horas} h</strong>
        </p>
        {Number.isFinite(Number(item.mediana_horas)) && (
          <p>
            Mediana: <strong className="font-semibold text-[var(--mf-ink)]">{item.mediana_horas} h</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export function RadarPresionServicios({ isDark = false }) {
  const [etapas, setEtapas] = useState([]);
  const [etapaCritica, setEtapaCritica] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    getCuellosBotella()
      .then((data) => {
        if (!activo) return;
        setEtapas(Array.isArray(data?.etapas) ? data.etapas : []);
        setEtapaCritica(typeof data?.etapa_critica === 'string' ? data.etapa_critica : '');
        setError(false);
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
  }, []);

  const etapasOrdenadas = useMemo(() => {
    if (!etapas.length) return [];
    return [...etapas].sort((a, b) => (Number(b.p90_horas) || 0) - (Number(a.p90_horas) || 0));
  }, [etapas]);

  const maxP90 = useMemo(() => {
    if (!etapasOrdenadas.length) return 0;
    return Math.max(...etapasOrdenadas.map((e) => Number(e.p90_horas) || 0));
  }, [etapasOrdenadas]);

  const colores = isDark
    ? {
        top: '#FCD34D',
        primary: '#149A93',
        secondary: '#5BA4D6',
        grid: '#1B3545',
        axis: '#8EB0C2',
        axisLine: '#2F556B',
        label: '#E8F2F6',
      }
    : {
        top: '#9A4A06',
        primary: '#0B7A75',
        secondary: '#1D5F8A',
        grid: '#DFE8EE',
        axis: '#385262',
        axisLine: '#B5C7D3',
        label: '#0D222E',
      };

  const getBarColor = (item, idx) => {
    if ((Number(item.p90_horas) || 0) === maxP90 && maxP90 > 0) return colores.top;
    if (idx <= Math.ceil(etapasOrdenadas.length / 2)) return colores.primary;
    return colores.secondary;
  };

  const chartHeight = Math.max(256, etapasOrdenadas.length * 46);

  return (
    <SectionPanel
      id="radar-presion-etapas"
      title="Etapas con mayor demora"
      subtitle="Duración en el percentil 90 (p90) por etapa asistencial; el 90% de los episodios resuelve por debajo de este umbral."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {etapaCritica && (
            <span className="mf-badge-warn inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {etapaCritica}
            </span>
          )}
          <span className="rounded-lg bg-[var(--mf-surface-2)] px-2.5 py-1 font-mono-num text-xs font-semibold text-[var(--mf-ink-2)]">
            p90 · horas
          </span>
        </div>
      }
    >
      {cargando && (
        <div role="status" aria-busy="true" className="space-y-3">
          <span className="sr-only">Cargando etapas…</span>
          <div className="mf-skeleton h-8 w-3/4" />
          <div className="mf-skeleton h-8 w-2/3" />
          <div className="mf-skeleton h-8 w-1/2" />
          <div className="mf-skeleton h-8 w-2/5" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--mf-warn-border)] bg-[var(--mf-warn-soft)] p-4 text-sm text-[var(--mf-warn)]"
        >
          No se pudieron cargar las etapas de permanencia.
        </div>
      )}

      {!cargando && !error && !etapasOrdenadas.length && (
        <div
          role="status"
          className="flex h-48 items-center justify-center text-sm text-[var(--mf-ink-2)]"
        >
          La API no devolvió etapas para este análisis.
        </div>
      )}

      {!cargando && !error && etapasOrdenadas.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--mf-ink-2)]">
            <span className="inline-flex items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: colores.top }}
              />
              <span>Mayor cuello de botella (p90 máx.)</span>
            </span>
            <span className="inline-flex items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: colores.primary }}
              />
              <span>Permanencia elevada</span>
            </span>
            <span className="inline-flex items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: colores.secondary }}
              />
              <span>Permanencia moderada</span>
            </span>
          </div>

          <div
            className="w-full min-w-0"
            style={{ height: `${chartHeight}px` }}
            aria-label="Gráfico de barras horizontales con duración p90 en horas por etapa clínica"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={etapasOrdenadas}
                layout="vertical"
                margin={{ top: 4, right: 64, left: 8, bottom: 4 }}
                barCategoryGap="26%"
              >
                <CartesianGrid horizontal={false} stroke={colores.grid} />
                <XAxis
                  type="number"
                  tick={{ fill: colores.axis, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: colores.axisLine }}
                  unit=" h"
                />
                <YAxis
                  type="category"
                  dataKey="etapa"
                  width={196}
                  tick={{ fill: colores.label, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<EtapasTooltip />} cursor={{ fill: isDark ? '#152D3B' : '#EBF1F4', opacity: 0.5 }} />
                <Bar dataKey="p90_horas" radius={[0, 4, 4, 0]}>
                  {etapasOrdenadas.map((entry, idx) => (
                    <Cell
                      key={entry.concept_id ?? entry.etapa ?? idx}
                      fill={getBarColor(entry, idx)}
                    />
                  ))}
                  <LabelList
                    dataKey="p90_horas"
                    position="right"
                    formatter={(value) => `${value} h`}
                    fill={colores.label}
                    fontSize={12}
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </SectionPanel>
  );
}
