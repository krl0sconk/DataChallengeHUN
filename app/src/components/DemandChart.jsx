import { useState } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
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
  const [horizonte, setHorizonte] = useState(7); // 3, 5 o 7 días

  const datosFiltrados = serie7d.slice(0, horizonte);

  // Calcula el dominio Y para que p75 y p90 SIEMPRE estén dentro del gráfico visible
  const maxDato = Math.max(...datosFiltrados.map((d) => d.prediccion), p90);
  const minDato = Math.min(...datosFiltrados.map((d) => d.prediccion), p75);
  const yDomain = [Math.floor(minDato * 0.85), Math.ceil(maxDato * 1.1)];

  const areaStroke = isDark ? '#8BBB92' : '#3B7D8C';
  const gradStop = isDark ? '#2A835F' : '#6EADBC';

  return (
    <section className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] transition-colors">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
            <TrendingUp className="h-5 w-5 text-[#3B7D8C] dark:text-[#8BBB92]" />
            Pronóstico de Demanda Asistencial
          </h2>
          <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
            Llegadas proyectadas de pacientes en {servicio.nombre}
          </p>
        </div>

        {/* Selector interactivo de horizonte temporal */}
        <div className="flex items-center rounded-xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] p-1 text-xs font-bold">
          <span className="px-2 text-[11px] text-[#4A4466]/60 dark:text-[#8BBB92]/60 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Horizonte:
          </span>
          {[3, 5, 7].map((dias) => (
            <button
              key={dias}
              onClick={() => setHorizonte(dias)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                horizonte === dias
                  ? 'bg-[#3B7D8C] dark:bg-[#2A835F] text-white shadow-2xs'
                  : 'text-[#4A4466] dark:text-[#8BBB92] hover:bg-[#EDF3DC] dark:hover:bg-[#12544F]'
              }`}
            >
              {dias} días
            </button>
          ))}
        </div>
      </header>

      {/* Explicación en lenguaje directo */}
      <div className="mb-4 p-3 rounded-2xl bg-[#FAFCF6] dark:bg-[#092328]/60 border border-[#EDF3DC] dark:border-[#0E3B39] flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-[#4A4466] dark:text-[#8BBB92]">
          📌 <strong>Interpretación:</strong> La curva azul/verde representa la llegada de pacientes estimada día a día.
        </span>
        <div className="flex items-center gap-4 font-semibold text-[11px]">
          <span className="flex items-center gap-1.5 text-[#3B7D8C] dark:text-[#8BBB92]">
            <span className="h-2 w-2 rounded-full bg-[#3B7D8C] dark:bg-[#8BBB92]" /> Estimado
          </span>
          <span className="flex items-center gap-1.5 text-[#D98A00] dark:text-[#FFD875]">
            <span className="h-0.5 w-3 bg-[#D98A00] inline-block border-t border-dashed" /> Alerta p75 ({p75} pac.)
          </span>
          <span className="flex items-center gap-1.5 text-[#C5304C] dark:text-[#FFA8B6]">
            <span className="h-0.5 w-3 bg-[#C5304C] inline-block border-t border-dashed" /> Saturación p90 ({p90} pac.)
          </span>
        </div>
      </div>

      <div className="h-72 w-full font-mono-num text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datosFiltrados} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradStop} stopOpacity={0.4} />
                <stop offset="95%" stopColor={gradStop} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#0E3B39' : '#EDF3DC'} />
            <XAxis dataKey="dia" stroke={isDark ? '#8BBB92' : '#4A4466'} fontSize={12} tickLine={false} />
            <YAxis
              stroke={isDark ? '#8BBB92' : '#4A4466'}
              fontSize={12}
              tickLine={false}
              domain={yDomain}
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
              formatter={(val) => [`${val} pacientes`, 'Demanda Esperada']}
            />
            {/* Línea horizontal de Alerta p75 fija y siempre visible */}
            <ReferenceLine
              y={p75}
              stroke="#D98A00"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Alerta (${p75})`,
                fill: isDark ? '#FFD875' : '#D98A00',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />
            {/* Línea horizontal de Saturación p90 fija y siempre visible */}
            <ReferenceLine
              y={p90}
              stroke="#C5304C"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Saturación (${p90})`,
                fill: isDark ? '#FFA8B6' : '#C5304C',
                fontSize: 11,
                position: 'insideTopRight',
              }}
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
