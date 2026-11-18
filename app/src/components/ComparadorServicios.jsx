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
import { getOcupacion } from '../lib/api';

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
        const data = await getOcupacion();
        ocupacionCache = data; // Guardado en el diccionario
        if (!cancelado) setDatosBackend(data);
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
    mediaDiaria: s.mediaDiaria ?? 0,
    p75: s.p75 ?? 0,
    p90: s.p90 ?? 0,
  }))).map((item) => {
    const demanda = item.prediccion ?? item.mediaDiaria ?? 0;
    const p75 = item.p75 || 1;
    const p90 = item.p90 || 1;
    const pctAlerta = Math.round((demanda / p75) * 100);
    const nivel = demanda >= p90 ? 'rojo' : demanda >= p75 ? 'amarillo' : 'verde';
    const estado = nivel === 'rojo' ? 'SATURACIÓN' : nivel === 'amarillo' ? 'ALERTA' : 'NORMAL';
    const badgeClass = nivel === 'rojo'
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
      : nivel === 'amarillo'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';

    return {
      ...item,
      demanda,
      pctAlerta,
      nivel,
      estado,
      badgeClass,
      etiquetaBarra: `${demanda} pac. / Alerta: ${item.p75 ?? 0}`,
      esActivo: item.id === servicioActivoId,
    };
  });

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80 flex flex-col justify-between">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-2">
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
              <BarChart3 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Presión Asistencial por Servicio
            </h2>
            <CircleHelp className="mt-1 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" title="Afluencia proyectada frente a umbrales institucionales (p75 y p90)" />
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Normal (&lt; p75)
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="h-0.5 w-3 bg-amber-500 inline-block" /> Alerta (100% p75)
            </span>
          </div>
        </header>

        {/* Gráfico horizontal de presión frente a umbrales institucionales */}
        <div className="h-60 w-full font-sans tabular-nums text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={lista}
              margin={{ top: 14, right: 120, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, (dataMax) => Math.max(120, Math.ceil(dataMax * 1.15))]}
                stroke={isDark ? '#94a3b8' : '#64748b'}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <YAxis
                dataKey="nombreCorto"
                type="category"
                stroke={isDark ? '#e2e8f0' : '#0f172a'}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                  borderRadius: '10px',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '12px',
                }}
                formatter={(val, name, item) => [
                  `${item.payload.demanda} pac. (${val}% del umbral p75: ${item.payload.p75} · p90: ${item.payload.p90})`,
                  'Afluencia proyectada frente a umbrales institucionales',
                ]}
              />
              <ReferenceLine
                x={100}
                stroke="#f59e0b"
                strokeWidth={1.5}
                label={{
                  value: 'Umbral Alerta (p75)',
                  fill: isDark ? '#fbbf24' : '#d97706',
                  fontSize: 10,
                  position: 'top',
                  fontWeight: 600,
                }}
              />
              <Bar
                dataKey="pctAlerta"
                barSize={22}
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(entry) => onSeleccionarServicio(entry.id)}
              >
                {lista.map((s) => {
                  const barColor = s.nivel === 'rojo'
                    ? '#e11d48'
                    : s.nivel === 'amarillo'
                      ? '#f59e0b'
                      : '#10b981';
                  return <Cell key={s.id} fill={barColor} />;
                })}
                <LabelList dataKey="etiquetaBarra" position="right" fill={isDark ? '#e2e8f0' : '#0f172a'} fontSize={11} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Botones interactivos para cambiar de servicio con un clic */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
          {lista.map((s) => (
            <button
              key={s.id}
              onClick={() => onSeleccionarServicio(s.id)}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                s.esActivo
                  ? 'ring-1 ring-sky-500 bg-sky-50/50 border-sky-300 dark:bg-sky-950/30 dark:border-sky-800'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center gap-1.5">
                <span className="font-semibold text-xs truncate text-slate-900 dark:text-white">
                  {s.nombreCorto}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${s.badgeClass}`}>
                  {s.estado}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1.5 font-mono">
                {s.mediaDiaria} pac. promedio (Umbral: {s.p75})
              </p>
            </button>
          ))}
        </div>
      </div>

      <footer className="mt-3 border-t border-slate-200/80 pt-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Afluencia proyectada frente a umbrales institucionales. Selecciona un servicio para ver su pronóstico.
      </footer>
    </section>
  );
}

