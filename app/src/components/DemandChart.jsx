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

export function DemandChart({ serie7d, servicio }) {
  const { p75, p90 } = servicio;

  return (
    <section className="rounded-3xl p-6 border border-[#FFEBB8] bg-white">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#601D49]">
            <TrendingUp className="h-5 w-5 text-[#BD5579]" />
            Curva de Demanda Semanal Proyectada
          </h2>
          <p className="text-xs font-medium mt-0.5 text-[#BD5579]">
            Proyección horizonte 7 días con banda de tolerancia (p10 - p90)
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[#286B94]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#286B94]" /> Mediana esperada
          </span>
          <span className="flex items-center gap-1.5 text-[#D98A00]">
            <span className="h-0.5 w-3 bg-[#D98A00] inline-block border-t border-dashed" /> Alerta (p75)
          </span>
          <span className="flex items-center gap-1.5 text-[#C5304C]">
            <span className="h-0.5 w-3 bg-[#C5304C] inline-block border-t border-dashed" /> Saturación (p90)
          </span>
        </div>
      </header>

      <div className="h-72 w-full font-mono-num text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie7d} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#286B94" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#286B94" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#FFEBB8" />
            <XAxis dataKey="dia" stroke="#601D49" fontSize={12} tickLine={false} />
            <YAxis stroke="#601D49" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFDF9',
                borderColor: '#EA9D9D',
                borderRadius: '12px',
                color: '#601D49',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
              formatter={(val, name) => [val, name === 'prediccion' ? 'Mediana (p50)' : name]}
            />
            <ReferenceLine
              y={p75}
              stroke="#D98A00"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Alerta p75 (${p75})`, fill: '#8A5800', fontSize: 11, position: 'right' }}
            />
            <ReferenceLine
              y={p90}
              stroke="#C5304C"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Saturación p90 (${p90})`, fill: '#C5304C', fontSize: 11, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="prediccion"
              stroke="#286B94"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorDemanda)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
