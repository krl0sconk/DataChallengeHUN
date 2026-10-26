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
 * Gráfico interactivo de demanda semanal proyectada con bandas de alerta.
 */
export const DemandChart = memo(function DemandChart({ serie7d, servicio }) {
  return (
    <section
      aria-label="Proyección de demanda semanal"
      className="rounded-2xl p-6 border border-slate-800 bg-[#0e1733]/50 shadow-xl"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" aria-hidden="true" />
            Curva de Demanda Semanal Proyectada
          </h2>
          <p className="text-xs text-slate-400">
            Proyección horizonte 7 días con banda de tolerancia (p10 - p90)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs" aria-hidden="true">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Mediana esperada
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="h-0.5 w-3 bg-amber-500 inline-block border-t border-dashed" /> Alerta (p75)
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="h-0.5 w-3 bg-rose-500 inline-block border-t border-dashed" /> Saturación (p90)
          </span>
        </div>
      </header>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie7d} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="dia" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                color: '#f8fafc',
              }}
              formatter={(val, name) => [val, name === 'prediccion' ? 'Mediana (p50)' : name]}
            />
            <ReferenceLine
              y={servicio.p75}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: 'Alerta p75', fill: '#f59e0b', fontSize: 10, position: 'right' }}
            />
            <ReferenceLine
              y={servicio.p90}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: 'Saturación p90', fill: '#ef4444', fontSize: 10, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="prediccion"
              stroke="#3b82f6"
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
