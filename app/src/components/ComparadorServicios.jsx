import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function ComparadorServicios({ servicios, servicioActivoId, onSeleccionarServicio, isDark }) {
  const lista = Object.values(servicios).map((s) => {
    const ocupacion = Math.round((s.mediaDiaria / s.p90) * 100);
    const alertaPct = Math.round((s.p75 / s.p90) * 100);

    return {
      id: s.id,
      nombreCorto: s.nombre.replace('Tratamiento Urgencias', 'Tratamiento Urg.'),
      nombreCompleto: s.nombre,
      ocupacion,
      mediaDiaria: s.mediaDiaria,
      p75: s.p75,
      p90: s.p90,
      alertaPct,
      esActivo: s.id === servicioActivoId,
    };
  });

  return (
    <section className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] transition-colors flex flex-col justify-between">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <BarChart3 className="h-5 w-5 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Ocupación por Servicio
            </h2>
            <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
              Presión hospitalaria en cada área frente a su límite máximo (p90)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[#3B7D8C] dark:text-[#8BBB92]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#3B7D8C] dark:bg-[#8BBB92]" /> Nivel de carga
            </span>
            <span className="flex items-center gap-1.5 text-[#D98A00] dark:text-[#FFD875]">
              <span className="h-0.5 w-3 bg-[#D98A00] inline-block border-t border-dashed" /> Alerta (p75)
            </span>
          </div>
        </header>

        {/* Gráfico horizontal intuitivo de barras */}
        <div className="h-48 w-full font-mono-num text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={lista}
              margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke={isDark ? '#8BBB92' : '#4A4466'}
                fontSize={11}
                tickFormatter={(val) => `${val}%`}
              />
              <YAxis
                dataKey="nombreCorto"
                type="category"
                stroke={isDark ? '#8BBB92' : '#4A4466'}
                fontSize={11}
                width={120}
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
                formatter={(val, name, item) => [
                  `${val}% (${item.payload.mediaDiaria} pac. / límite p90: ${item.payload.p90})`,
                  'Ocupación',
                ]}
              />
              <ReferenceLine
                x={85}
                stroke="#D98A00"
                strokeDasharray="4 4"
                label={{
                  value: 'Umbral Alerta (~85%)',
                  fill: isDark ? '#FFD875' : '#D98A00',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <Bar
                dataKey="ocupacion"
                radius={[0, 8, 8, 0]}
                className="cursor-pointer"
                onClick={(entry) => onSeleccionarServicio(entry.id)}
              >
                {lista.map((s) => {
                  let barColor = s.esActivo
                    ? isDark ? '#8BBB92' : '#3B7D8C'
                    : isDark ? '#2A835F' : '#9FCBAD';
                  if (s.ocupacion >= 90) barColor = '#C5304C';
                  return <Cell key={s.id} fill={barColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Botones interactivos para cambiar de servicio con un clic */}
        <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#EDF3DC] dark:border-[#0E3B39]">
          {lista.map((s) => (
            <button
              key={s.id}
              onClick={() => onSeleccionarServicio(s.id)}
              className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                s.esActivo
                  ? 'bg-[#F1F7D4]/60 dark:bg-[#2A835F]/40 border-[#2A835F] shadow-2xs ring-1 ring-[#2A835F]'
                  : 'bg-transparent border-transparent hover:bg-[#EDF3DC]/40 dark:hover:bg-[#092328]/40'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs truncate text-[#4A4466] dark:text-[#8BBB92]">
                  {s.nombreCorto}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#EDF3DC] dark:bg-[#092328] text-[#3B7D8C] dark:text-[#8BBB92]">
                  {s.ocupacion}%
                </span>
              </div>
              <p className="text-[10px] text-[#4A4466]/70 dark:text-[#8BBB92]/60 mt-1">
                {s.mediaDiaria} pac. promedio
              </p>
            </button>
          ))}
        </div>
      </div>

      <footer className="mt-3 pt-3 border-t border-[#EDF3DC] dark:border-[#0E3B39] text-[11px] text-[#4A4466]/80 dark:text-[#8BBB92]/80 leading-relaxed font-sans">
        💡 <strong>Haz clic en cualquier servicio</strong> para seleccionarlo e inspeccionar su pronóstico detallado y simulaciones.
      </footer>
    </section>
  );
}
