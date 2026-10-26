import React, { memo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Gráfico interactivo adaptado a Modo Claro y Oscuro Cozy Pastel.
 */
export const DemandChart = memo(function DemandChart({ serie7d, servicio, isDark }) {
  return (
    <section
      aria-label="Proyección de demanda semanal"
      className={`rounded-2xl p-6 border shadow-xs transition-colors ${
        isDark ? 'border-[#2e3748] bg-[#1e2536]' : 'border-stone-200 bg-white'
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2
            className={`text-base font-bold font-heading flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-stone-900'
            }`}
          >
            <TrendingUp className={`h-5 w-5 ${isDark ? 'text-indigo-400' : 'text-sky-700'}`} aria-hidden="true" />
            Curva de Demanda Semanal Proyectada
          </h2>
          <p
            className={`text-xs font-medium mt-0.5 ${
              isDark ? 'text-slate-300' : 'text-stone-600'
            }`}
          >
            Proyección horizonte 7 días con banda de tolerancia (p10 - p90)
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-semibold" aria-hidden="true">
          <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-stone-700'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-sky-600'}`} /> Mediana esperada
          </span>
          <span className={`flex items-center gap-1.5 ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
            <span className="h-0.5 w-3 bg-amber-500 inline-block border-t border-dashed" /> Alerta (p75)
          </span>
          <span className={`flex items-center gap-1.5 ${isDark ? 'text-rose-200' : 'text-rose-800'}`}>
            <span className="h-0.5 w-3 bg-rose-500 inline-block border-t border-dashed" /> Saturación (p90)
          </span>
        </div>
      </header>

      <div className="h-72 w-full font-mono-num text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie7d} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isDark ? '#818cf8' : '#0284c7'}
                  stopOpacity={isDark ? 0.35 : 0.25}
                />
                <stop
                  offset="95%"
                  stopColor={isDark ? '#818cf8' : '#0284c7'}
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2e3748' : '#e7e5e4'} />
            <XAxis dataKey="dia" stroke={isDark ? '#94a3b8' : '#57534e'} fontSize={12} tickLine={false} />
            <YAxis stroke={isDark ? '#94a3b8' : '#57534e'} fontSize={12} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1a202c' : '#ffffff',
                borderColor: isDark ? '#4a5568' : '#d6d3d1',
                borderRadius: '12px',
                color: isDark ? '#f8fafc' : '#1c1917',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontFamily: 'var(--font-mono)',
              }}
              formatter={(val, name) => [val, name === 'prediccion' ? 'Mediana (p50)' : name]}
            />
            <ReferenceLine
              y={servicio.p75}
              stroke={isDark ? '#fcd34d' : '#d97706'}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Alerta p75 (${servicio.p75})`,
                fill: isDark ? '#fef3c7' : '#92400e',
                fontSize: 11,
                position: 'right',
              }}
            />
            <ReferenceLine
              y={servicio.p90}
              stroke={isDark ? '#fb7185' : '#e11d48'}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Saturación p90 (${servicio.p90})`,
                fill: isDark ? '#ffe4e6' : '#9f1239',
                fontSize: 11,
                position: 'right',
              }}
            />
            <Area
              type="monotone"
              dataKey="prediccion"
              stroke={isDark ? '#818cf8' : '#0284c7'}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorDemanda)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});
