import { Compass } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export function RadarPresionServicios({ servicios, servicioActivoId, isDark }) {
  const data = Object.values(servicios).map((s) => {
    const presion = Math.round((s.mediaDiaria / s.p90) * 100);
    const margenSeguridad = Math.round(((s.p90 - s.mediaDiaria) / s.p90) * 100);
    const alertaPct = Math.round((s.p75 / s.p90) * 100);

    return {
      servicio: s.nombre.replace('Tratamiento Urgencias', 'Tratamiento Urg.'),
      presion,
      umbralAlerta: alertaPct,
      margenSeguridad,
      id: s.id,
    };
  });

  const radarFill = isDark ? '#2A835F' : '#6EADBC';
  const radarStroke = isDark ? '#8BBB92' : '#3B7D8C';

  return (
    <section className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] transition-colors">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
            <Compass className="h-5 w-5 text-[#3B7D8C] dark:text-[#8BBB92]" />
            Capacidad por Servicio
          </h2>
          <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
            Comparación de ocupación simultánea frente al límite p90
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[#3B7D8C] dark:text-[#8BBB92]">
            <span className="h-2 w-2 rounded-full bg-[#3B7D8C] dark:bg-[#8BBB92]" /> Actual
          </span>
          <span className="flex items-center gap-1.5 text-[#D98A00] dark:text-[#F1F7D4]">
            <span className="h-2 w-2 rounded-full bg-[#D98A00]" /> Alerta (p75)
          </span>
        </div>
      </header>

      <div className="h-64 w-full font-mono-num text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke={isDark ? '#0E3B39' : '#EDF3DC'} />
            <PolarAngleAxis
              dataKey="servicio"
              tick={{ fill: isDark ? '#8BBB92' : '#4A4466', fontSize: 11, fontWeight: 700 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: isDark ? '#8BBB92' : '#4A4466', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#092328' : '#FAFCF6',
                borderColor: isDark ? '#2A835F' : '#9FCBAD',
                borderRadius: '12px',
                color: isDark ? '#8BBB92' : '#4A4466',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
              formatter={(val, name) => [
                `${val}%`,
                name === 'presion' ? 'Ocupación' : 'Umbral Alerta',
              ]}
            />
            <Radar
              name="presion"
              dataKey="presion"
              stroke={radarStroke}
              fill={radarFill}
              fillOpacity={0.4}
            />
            <Radar
              name="umbralAlerta"
              dataKey="umbralAlerta"
              stroke="#D98A00"
              fill="#D98A00"
              fillOpacity={0.15}
              strokeDasharray="4 4"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <footer className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-[#EDF3DC] dark:border-[#0E3B39] text-center text-xs">
        {data.map((item) => (
          <div
            key={item.id}
            className={`p-2 rounded-xl transition-all ${
              item.id === servicioActivoId
                ? 'bg-[#F1F7D4]/50 dark:bg-[#2A835F]/40 border border-[#9FCBAD] dark:border-[#2A835F]'
                : 'bg-transparent'
            }`}
          >
            <span className="block font-bold truncate text-[#4A4466] dark:text-[#8BBB92]">
              {item.servicio}
            </span>
            <span className="font-mono-num font-extrabold text-sm text-[#3B7D8C] dark:text-[#8BBB92]">
              {item.presion}%
            </span>
            <span className="block text-[10px] text-[#4A4466]/70 dark:text-[#8BBB92]/60">
              de p90
            </span>
          </div>
        ))}
      </footer>
    </section>
  );
}
