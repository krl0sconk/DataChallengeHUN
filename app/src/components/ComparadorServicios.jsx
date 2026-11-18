import { useEffect, useState } from 'react';
import { BarChart3, CircleHelp } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import { apiUrl } from '../lib/api';

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
        const res = await fetch(apiUrl('/api/ocupacion'));
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
    <section className="rounded-3xl p-6 border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] transition-colors flex flex-col justify-between">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-2">
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#102A43] dark:text-[#D8EFF7]">
              <BarChart3 className="h-5 w-5 text-[#14516B] dark:text-[#B9E2F0]" />
              Ocupación por Servicio
            </h2>
            <CircleHelp className="mt-1 h-4 w-4 shrink-0 text-[#14516B] dark:text-[#B9E2F0]" title="Verde: bajo p75 · amarillo: p75–p90 · rojo: sobre p90" />
          </div>
          <CircleHelp className="h-4 w-4 text-[#14516B] dark:text-[#B9E2F0]" title="Verde: bajo p75 · amarillo: p75–p90 · rojo: sobre p90" />
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#14516B] dark:text-[#D8EFF7]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#14516B] dark:bg-[#B9E2F0]" /> Nivel de carga
            </span>
            <span className="flex items-center gap-1.5 text-[#8C5800] dark:text-[#FFD875]">
              <span className="h-0.5 w-3 bg-[#8C5800] dark:bg-[#FFD875] inline-block border-t border-dashed" /> Alerta (p75)
            </span>
          </div>
        </header>

        {/* Gráfico horizontal intuitivo de barras */}
        <div className="h-60 w-full font-sans tabular-nums text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={lista}
              margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke={isDark ? '#D8EFF7' : '#102A43'}
                fontSize={11}
                tickFormatter={(val) => `${val}%`}
              />
              <YAxis
                dataKey="nombreCorto"
                type="category"
                stroke={isDark ? '#D8EFF7' : '#102A43'}
                fontSize={11}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#071B2A' : '#FFFFFF',
                  borderColor: isDark ? '#176D98' : '#71B5CC',
                  borderRadius: '12px',
                  color: isDark ? '#D8EFF7' : '#102A43',
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
                strokeWidth={2}
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
                barSize={24}
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(entry) => onSeleccionarServicio(entry.id)}
              >
                {lista.map((s) => {
                  let barColor = s.esActivo
                    ? isDark ? '#B9E2F0' : '#14516B'
                    : isDark ? '#1B8CC9' : '#8CC5D9';
                  if (s.ocupacion >= 90) barColor = '#C5304C';
                  return <Cell key={s.id} fill={barColor} />;
                })}
                <LabelList dataKey="ocupacion" position="right" formatter={(value) => `${value}%`} fill={isDark ? '#D8EFF7' : '#102A43'} fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Botones interactivos para cambiar de servicio con un clic */}
        <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#D1DEE7] dark:border-[#19506B]">
          {lista.map((s) => (
            <button
              key={s.id}
              onClick={() => onSeleccionarServicio(s.id)}
              className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                s.esActivo
                  ? 'bg-[#E7F4FA] dark:bg-[#176D98]/40 border-[#176D98] shadow-2xs ring-1 ring-[#176D98]'
                  : 'bg-[#F7FAFC] dark:bg-[#071B2A] border-[#D1DEE7] dark:border-[#19506B] hover:border-[#14516B]'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs truncate text-[#102A43] dark:text-[#D8EFF7]">
                  {s.nombreCorto}
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#DCEFF7] dark:bg-[#071B2A] text-[#14516B] dark:text-[#B9E2F0]">
                  {s.ocupacion}%
                </span>
              </div>
              <p className="text-[10px] font-semibold text-[#102A43] dark:text-[#D8EFF7] mt-1">
                {s.mediaDiaria} pac. promedio
              </p>
            </button>
          ))}
        </div>
      </div>

      <footer className="mt-3 border-t border-[#D1DEE7] pt-3 text-xs font-sans font-medium leading-relaxed text-[#294B63] dark:border-[#19506B] dark:text-[#B9E2F0]">
        Selecciona un servicio para ver su pronóstico.
      </footer>
    </section>
  );
}

