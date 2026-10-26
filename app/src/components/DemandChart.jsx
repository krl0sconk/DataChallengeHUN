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
 * Gráfico interactivo de demanda semanal proyectada con tipografía mono y contraste aumentado.
 */
export const DemandChart = memo(function DemandChart({ serie7d, servicio }) {
  return (
    <section
      aria-label="Proyección de demanda semanal"
      className="rounded-2xl p-6 border border-slate-700/80 bg-[#0d1736] shadow-xl"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-400" aria-hidden="true" />
            Curva de Demanda Semanal Proyectada
          </h2>
          <p className="text-xs font-medium text-slate-300 mt-0.5">
            Proyección horizonte 7 días con banda de tolerancia (p10 - p90)
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-medium" aria-hidden="true">
          <span className="flex items-center gap-1.5 text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Mediana esperada
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="h-0.5 w-3 bg-amber-400 inline-block border-t border-dashed" /> Alerta (p75)
          </span>
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="h-0.5 w-3 bg-rose-400 inline-block border-t border-dashed" /> Saturación (p90)
          </span>
        </div>
      </header>

      <div className="h-72 w-full font-mono-num text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie7d} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="dia" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#070e24',
                borderColor: '#475569',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
              formatter={(val, name) => [val, name === 'prediccion' ? 'Mediana (p50)' : name]}
            />
            <ReferenceLine
              y={servicio.p75}
              stroke="#fbbf24"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Alerta p75 (${servicio.p75})`, fill: '#fef08a', fontSize: 11, position: 'right' }}
            />
            <ReferenceLine
              y={servicio.p90}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Saturación p90 (${servicio.p90})`, fill: '#fecdd3', fontSize: 11, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="prediccion"
              stroke="#38bdf8"
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
