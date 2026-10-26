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

export function DemandChart({ serie7d, servicio, isDark }) {
  const { p75, p90 } = servicio;

  return (
    <section className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#1F4436] bg-white dark:bg-[#285A48] transition-colors">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#B0E4CC]">
            <TrendingUp className="h-5 w-5 text-[#6EADBC]" />
            Curva de Demanda Semanal Proyectada
          </h2>
          <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#B0E4CC]/70">
            Proyección horizonte 7 días con banda de tolerancia (p10 - p90)
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[#3B7D8C] dark:text-[#9FCBAD]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6EADBC]" /> Mediana esperada
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
                <stop offset="5%" stopColor="#6EADBC" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6EADBC" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1F4436' : '#EDF3DC'} />
            <XAxis dataKey="dia" stroke={isDark ? '#B0E4CC' : '#4A4466'} fontSize={12} tickLine={false} />
            <YAxis stroke={isDark ? '#B0E4CC' : '#4A4466'} fontSize={12} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#091413' : '#FAFCF6',
                borderColor: isDark ? '#408A71' : '#9FCBAD',
                borderRadius: '12px',
                color: isDark ? '#B0E4CC' : '#4A4466',
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
              label={{ value: `Alerta p75 (${p75})`, fill: '#D98A00', fontSize: 11, position: 'right' }}
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
              stroke="#6EADBC"
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
