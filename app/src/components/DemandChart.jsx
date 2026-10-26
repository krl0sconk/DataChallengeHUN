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
 * Gráfico interactivo estilo Cozy Pastel con líneas y fondos cálidos.
 */
export const DemandChart = memo(function DemandChart({ serie7d, servicio }) {
  return (
    <section
      aria-label="Proyección de demanda semanal"
      className="rounded-2xl p-6 border border-stone-200 bg-white shadow-xs"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-stone-900 font-heading flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-700" aria-hidden="true" />
            Curva de Demanda Semanal Proyectada
          </h2>
          <p className="text-xs font-medium text-stone-600 mt-0.5">
            Proyección horizonte 7 días con banda de tolerancia (p10 - p90)
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-semibold" aria-hidden="true">
          <span className="flex items-center gap-1.5 text-stone-700">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600" /> Mediana esperada
          </span>
          <span className="flex items-center gap-1.5 text-amber-800">
            <span className="h-0.5 w-3 bg-amber-600 inline-block border-t border-dashed" /> Alerta (p75)
          </span>
          <span className="flex items-center gap-1.5 text-rose-800">
            <span className="h-0.5 w-3 bg-rose-600 inline-block border-t border-dashed" /> Saturación (p90)
          </span>
        </div>
      </header>

      <div className="h-72 w-full font-mono-num text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie7d} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="dia" stroke="#57534e" fontSize={12} tickLine={false} />
            <YAxis stroke="#57534e" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#d6d3d1',
                borderRadius: '12px',
                color: '#1c1917',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontFamily: 'var(--font-mono)',
              }}
              formatter={(val, name) => [val, name === 'prediccion' ? 'Mediana (p50)' : name]}
            />
            <ReferenceLine
              y={servicio.p75}
              stroke="#d97706"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Alerta p75 (${servicio.p75})`, fill: '#92400e', fontSize: 11, position: 'right' }}
            />
            <ReferenceLine
              y={servicio.p90}
              stroke="#e11d48"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Saturación p90 (${servicio.p90})`, fill: '#9f1239', fontSize: 11, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="prediccion"
              stroke="#0284c7"
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
