import { useEffect, useState } from 'react';
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

const API_BASE_URL = 'http://localhost:8000';

// Diccionario en memoria para las métricas de ocupación (se descarga una sola vez)
let ocupacionCache = null;

export function ComparadorServicios({ servicios, servicioActivoId, onSeleccionarServicio, isDark }) {
  const [datosBackend, setDatosBackend] = useState(() => ocupacionCache);

  // Consulta al backend para obtener las métricas de ocupación ya calculadas
  useEffect(() => {
    let cancelado = false;

    // Si ya está en memoria, evita la petición HTTP
    if (ocupacionCache) {
      setDatosBackend(ocupacionCache);
      return;
    }

    async function cargarOcupacion() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ocupacion`);
        if (res.ok) {
          const data = await res.json();
          ocupacionCache = data; // Guardado en el diccionario
          if (!cancelado) setDatosBackend(data);
        }
      } catch {
        // Fallback local defensivo
      }
    }
    cargarOcupacion();
    return () => {
      cancelado = true;
    };
  }, []);

  const lista = (datosBackend || Object.values(servicios).map((s) => ({
    id: s.id,
    nombreCorto: s.nombre.replace('Tratamiento Urgencias', 'Tratamiento Urg.'),
    nombreCompleto: s.nombre,
    ocupacion: Math.round((s.mediaDiaria / s.p90) * 100),
    mediaDiaria: s.mediaDiaria,
    p75: s.p75,
    p90: s.p90,
    alertaPct: Math.round((s.p75 / s.p90) * 100),
  }))).map((item) => ({
    ...item,
    esActivo: item.id === servicioActivoId,
  }));

  return (
    <section className="rounded-3xl p-6 border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] transition-colors flex flex-col justify-between">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#2D283E] dark:text-[#C4E5CA]">
              <BarChart3 className="h-5 w-5 text-[#1E4D57] dark:text-[#A8E2AF]" />
              Ocupación por Servicio
            </h2>
            <p className="text-xs font-semibold mt-0.5 text-[#2D283E] dark:text-[#C4E5CA]">
              Presión hospitalaria en cada área frente a su límite máximo (p90)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#1E4D57] dark:text-[#C4E5CA]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#1E4D57] dark:bg-[#8BBB92]" /> Nivel de carga
            </span>
            <span className="flex items-center gap-1.5 text-[#8C5800] dark:text-[#FFD875]">
              <span className="h-0.5 w-3 bg-[#8C5800] dark:bg-[#FFD875] inline-block border-t border-dashed" /> Alerta (p75)
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
                stroke={isDark ? '#C4E5CA' : '#2D283E'}
                fontSize={11}
                tickFormatter={(val) => `${val}%`}
              />
              <YAxis
                dataKey="nombreCorto"
                type="category"
                stroke={isDark ? '#C4E5CA' : '#2D283E'}
                fontSize={11}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#071D22' : '#FFFFFF',
                  borderColor: isDark ? '#206E4E' : '#7CB592',
                  borderRadius: '12px',
                  color: isDark ? '#C4E5CA' : '#2D283E',
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
                stroke="#B26B00"
                strokeDasharray="4 4"
                label={{
                  value: 'Umbral Alerta (~85%)',
                  fill: isDark ? '#FFD875' : '#8C5800',
                  fontSize: 10,
                  position: 'top',
                  fontWeight: 'bold',
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
        <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#D6E0C2] dark:border-[#1B524F]">
          {lista.map((s) => (
            <button
              key={s.id}
              onClick={() => onSeleccionarServicio(s.id)}
              className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                s.esActivo
                  ? 'bg-[#F1F7D4] dark:bg-[#206E4E]/40 border-[#206E4E] shadow-2xs ring-1 ring-[#206E4E]'
                  : 'bg-[#FAFCF6] dark:bg-[#071D22] border-[#D6E0C2] dark:border-[#1B524F] hover:border-[#1E4D57]'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs truncate text-[#2D283E] dark:text-[#C4E5CA]">
                  {s.nombreCorto}
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#E3ECCB] dark:bg-[#071D22] text-[#1E4D57] dark:text-[#A8E2AF]">
                  {s.ocupacion}%
                </span>
              </div>
              <p className="text-[10px] font-semibold text-[#2D283E] dark:text-[#C4E5CA] mt-1">
                {s.mediaDiaria} pac. promedio
              </p>
            </button>
          ))}
        </div>
      </div>

      <footer className="mt-3 pt-3 border-t border-[#D6E0C2] dark:border-[#1B524F] text-[11px] text-[#2D283E] dark:text-[#C4E5CA] leading-relaxed font-sans font-medium">
        💡 <strong>Haz clic en cualquier servicio</strong> para seleccionarlo e inspeccionar su pronóstico detallado y simulaciones.
      </footer>
    </section>
  );
}
