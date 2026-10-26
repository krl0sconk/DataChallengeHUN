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

  const areaStroke = isDark ? '#8BBB92' : '#3B7D8C';
  const gradStop = isDark ? '#2A835F' : '#6EADBC';

  return (
    <section className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] transition-colors">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
            <TrendingUp className="h-5 w-5 text-[#3B7D8C] dark:text-[#8BBB92]" />
            Pronóstico a 7 Días
          </h2>
          <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
            Estimación diaria de llegadas y bandas de alerta histórica
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[#3B7D8C] dark:text-[#8BBB92]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3B7D8C] dark:bg-[#8BBB92]" /> Esperado
          </span>
          <span className="flex items-center gap-1.5 text-[#D98A00] dark:text-[#F1F7D4]">
            <span className="h-0.5 w-3 bg-[#D98A00] inline-block border-t border-dashed" /> Alerta (p75)
          </span>
          <span className="flex items-center gap-1.5 text-[#C5304C] dark:text-[#F4C5CD]">
            <span className="h-0.5 w-3 bg-[#C5304C] inline-block border-t border-dashed" /> Saturación (p90)
          </span>
        </div>
      </header>

      <div className="h-72 w-full font-mono-num text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie7d} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradStop} stopOpacity={0.4} />
                <stop offset="95%" stopColor={gradStop} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#0E3B39' : '#EDF3DC'} />
            <XAxis dataKey="dia" stroke={isDark ? '#8BBB92' : '#4A4466'} fontSize={12} tickLine={false} />
            <YAxis stroke={isDark ? '#8BBB92' : '#4A4466'} fontSize={12} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#092328' : '#FAFCF6',
                borderColor: isDark ? '#2A835F' : '#9FCBAD',
                borderRadius: '12px',
                color: isDark ? '#8BBB92' : '#4A4466',
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
              label={{ value: `Alerta (${p75})`, fill: '#D98A00', fontSize: 11, position: 'right' }}
            />
            <ReferenceLine
              y={p90}
              stroke="#C5304C"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Saturación (${p90})`, fill: '#C5304C', fontSize: 11, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="prediccion"
              stroke={areaStroke}
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
