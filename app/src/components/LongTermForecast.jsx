import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarRange, CircleHelp } from 'lucide-react';
import { getCachedJson } from '../lib/apiCache';
import { apiUrl } from '../lib/api';

function formatWeek(date) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '')
    .replace(' de ', ' ');
}

export function LongTermForecast({ servicio }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    getCachedJson(apiUrl(`/api/largo-plazo/${servicio.id}?fecha_inicio=2026-08-01&fecha_fin=2026-11-30`))
      .then((result) => {
        if (!activo) return;
        const serieCompleta = result.serie || [];
        const serieSemanal = serieCompleta.filter((_, index) => index % 7 === 0 || index === serieCompleta.length - 1);
        setData(serieSemanal.map((point) => ({
          ...point,
          etiqueta: formatWeek(point.fecha),
          p75: servicio.p75,
          p90: servicio.p90,
          intervaloBase: point.min,
          intervaloAncho: Math.max(0, point.max - point.min),
        })));
        setError(false);
      })
      .catch(() => activo && setError(true))
      .finally(() => activo && setLoading(false));

    return () => { activo = false; };
  }, [servicio.id]);

  const resumen = useMemo(() => {
    if (!data.length) return null;
    const max = data.reduce((item, current) => current.prediccion > item.prediccion ? current : item, data[0]);
    return { max, semanas: data.length };
  }, [data]);

  return (
    <section className="long-term-panel mt-10 space-y-5 rounded-3xl border border-[#D1DEE7] border-t-4 border-t-[#2C7A9B] bg-white p-5 shadow-xs dark:border-[#19506B] dark:border-t-[#71B5CC] dark:bg-[#0E3E5B] sm:p-7" aria-labelledby="long-term-title">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#14516B] dark:text-[#B9E2F0]">
            <CalendarRange className="h-4 w-4" />
            <span>Horizonte largo · agosto–noviembre 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <h2 id="long-term-title" className="font-heading text-xl font-extrabold text-[#102A43] dark:text-[#D8EFF7]">
              Planificación de capacidad
            </h2>
            <span title="Proyección semanal con intervalo ampliado; no sustituye el detalle de 7 días.">
              <CircleHelp className="h-4 w-4 text-[#14516B] dark:text-[#B9E4F2]" />
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#46657A] dark:text-[#B9D4DF]">
            <span className="rounded-md border border-[#71B5CC] bg-[#E8F6FA] px-2 py-1 text-[#0C4A62] dark:border-[#2C7A9B] dark:bg-[#0E3E5B] dark:text-[#B9E2F0]">Intervalo ampliado</span>
          </div>
        </div>
        {resumen && (
          <div className="shrink-0 border-l-2 border-[#71B5CC] pl-4 text-sm dark:border-[#2C7A9B]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#46657A] dark:text-[#B9D4DF]">Pico esperado</p>
            <p className="mt-1 font-mono-num text-2xl font-bold tabular-nums text-[#102A43] dark:text-[#D8EFF7]">{resumen.max.prediccion}</p>
            <p className="text-xs text-[#46657A] dark:text-[#B9D4DF]">{resumen.max.etiqueta} · {resumen.semanas} semanas</p>
          </div>
        )}
      </div>

      <div className="h-72 w-full" aria-label="Pronóstico semanal de largo plazo">
        {loading && <p className="pt-24 text-center text-sm text-[#46657A] dark:text-[#B9D4DF]">Cargando horizonte largo…</p>}
        {error && <p className="pt-24 text-center text-sm text-[#8A1828] dark:text-[#FFA8B6]">Endpoint de largo plazo no disponible.</p>}
        {!loading && !error && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 5" stroke="#D5E1E8" vertical={false} />
              <ReferenceArea y1={0} y2={data[0]?.p75 ?? 0} fill="#A9D6B5" fillOpacity={0.10} ifOverflow="extendDomain" />
              <ReferenceArea y1={data[0]?.p75 ?? 0} y2={data[0]?.p90 ?? 0} fill="#F0C86A" fillOpacity={0.10} ifOverflow="extendDomain" />
              <ReferenceArea y1={data[0]?.p90 ?? 0} y2="auto" fill="#D96B78" fillOpacity={0.08} ifOverflow="extendDomain" />
              <ReferenceLine y={data[0]?.p75} stroke="#B26B00" strokeDasharray="5 4" strokeWidth={1.5} />
              <ReferenceLine y={data[0]?.p90} stroke="#C5304C" strokeDasharray="5 4" strokeWidth={1.5} />
              <XAxis dataKey="etiqueta" interval={0} tick={{ fill: '#46657A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#B7CBD6' }} />
              <YAxis tick={{ fill: '#46657A', fontSize: 12 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip
                contentStyle={{ border: '1px solid #D5E1E8', borderRadius: 6, boxShadow: '0 8px 24px rgba(16,42,67,.12)' }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fecha || label}
                formatter={(value, name) => [value, name === 'prediccion' ? 'p50 esperado' : name === 'intervaloAncho' ? 'Ancho del intervalo' : null]}
              />
              <Area type="monotone" dataKey="intervaloBase" stackId="intervalo" stroke="none" fill="transparent" fillOpacity={0} />
              <Area type="monotone" dataKey="intervaloAncho" stackId="intervalo" stroke="none" fill="#71B5CC" fillOpacity={0.16} />
              <Line type="monotone" dataKey="prediccion" name="prediccion" stroke="#0F2942" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2C7A9B' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#D5E1E8] pt-3 text-xs text-[#46657A] dark:border-[#19506B] dark:text-[#B9D4DF]">
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#0F2942]" />p50 esperado</span>
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#2C7A9B]" />Intervalo ampliado</span>
        <span>Semanal · intervalo de incertidumbre ampliado</span>
      </div>
    </section>
  );
}
