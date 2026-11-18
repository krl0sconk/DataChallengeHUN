import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, CircleHelp, ShieldCheck, Target } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCachedJson } from '../lib/apiCache';
import { apiUrl } from '../lib/api';

function shortDate(value) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`)).replace('.', '');
}

export function PrecisionPanel({ servicio }) {
  const [rango, setRango] = useState({ inicio: '', fin: '' });
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    const params = new URLSearchParams();
    if (rango.inicio) params.set('fecha_inicio', rango.inicio);
    if (rango.fin) params.set('fecha_fin', rango.fin);
    const query = params.toString();
    getCachedJson(apiUrl(`/api/comparacion/${servicio.id}${query ? `?${query}` : ''}`))
      .then((data) => {
        if (!activo) return;
        setResultado(data);
        setError(false);
        if (!rango.inicio && data.serie?.length) setRango({ inicio: data.serie[0].fecha, fin: data.serie[data.serie.length - 1].fecha });
      })
      .catch(() => activo && setError(true))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [servicio.id, rango.inicio, rango.fin]);

  const datos = useMemo(() => (resultado?.serie || []).map((point) => ({ ...point, etiqueta: shortDate(point.fecha) })), [resultado]);
  const minBanda = datos.length ? Math.min(...datos.map((point) => point.min)) : 0;
  const maxBanda = datos.length ? Math.max(...datos.map((point) => point.max)) : 0;
  const metricas = useMemo(() => {
    if (!datos.length) return null;
    const totalReal = datos.reduce((sum, point) => sum + Math.abs(point.real || 0), 0);
    const errorTotal = datos.reduce((sum, point) => sum + Math.abs((point.real || 0) - (point.prediccion || 0)), 0);
    const cobertura = datos.filter((point) => point.real >= point.min && point.real <= point.max).length / datos.length;
    return {
      exactitud_pct: totalReal ? (1 - errorTotal / totalReal) * 100 : 0,
      wape: totalReal ? errorTotal / totalReal : 0,
      cobertura,
      n_dias: datos.length,
    };
  }, [datos, resultado]);

  return (
    <section className="space-y-6" aria-labelledby="precision-title">
      <header className="flex flex-col gap-4 border-b border-[#B7C8D5] pb-5 dark:border-[#19506B] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#14516B] dark:text-[#B9E2F0]">Validación histórica</p>
          <div className="flex items-center gap-2"><h2 id="precision-title" className="font-heading text-2xl font-extrabold tracking-[-0.025em] text-[#102A43] dark:text-[#D8EFF7]">¿Qué tan preciso es?</h2><CircleHelp className="h-4 w-4 text-[#14516B] dark:text-[#B9E2F0]" title="Comparación entre predicción y dato real" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 rounded-md border border-[#D1DEE7] bg-white px-2.5 py-1.5 text-[#294B63] dark:border-[#19506B] dark:bg-[#0E3E5B] dark:text-[#D8EFF7]"><CalendarDays className="h-3.5 w-3.5 text-[#14516B]" /><span>Desde</span><input type="date" value={rango.inicio} max={rango.fin || undefined} onChange={(event) => setRango((current) => ({ ...current, inicio: event.target.value }))} className="bg-transparent font-mono-num font-bold outline-none" /></label>
          <label className="flex items-center gap-1.5 rounded-md border border-[#D1DEE7] bg-white px-2.5 py-1.5 text-[#294B63] dark:border-[#19506B] dark:bg-[#0E3E5B] dark:text-[#D8EFF7]"><span>Hasta</span><input type="date" value={rango.fin} min={rango.inicio || undefined} onChange={(event) => setRango((current) => ({ ...current, fin: event.target.value }))} className="bg-transparent font-mono-num font-bold outline-none" /></label>
        </div>
      </header>

      {cargando && <div className="flex h-80 items-center justify-center text-sm text-[#46657A] dark:text-[#B9D4DF]">Cargando comparación histórica…</div>}
      {error && <div className="border border-[#DFC264] bg-[#FEF9E2] p-4 text-sm text-[#704200] dark:border-[#7A5A00] dark:bg-[#201B0E] dark:text-[#FFDF80]">No se pudo cargar la comparación histórica del servicio.</div>}
      {!cargando && !error && resultado && !datos.length && <div className="border border-[#D1DEE7] bg-white p-6 text-sm text-[#46657A] dark:border-[#19506B] dark:bg-[#0E3E5B] dark:text-[#B9D4DF]">No hay observaciones reales y predichas dentro de ese rango. Prueba con otras fechas.</div>}
      {!cargando && !error && resultado && datos.length > 0 && metricas && <>
        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={Target} label="Exactitud del modelo" value={`${metricas.exactitud_pct.toFixed(1)}%`} note={`${metricas.n_dias} días comparados`} tone="blue" />
          <Metric icon={Activity} label="Error típico" value={`${(metricas.wape * 100).toFixed(1)}%`} note="WAPE del rango elegido" tone="amber" />
          <Metric icon={ShieldCheck} label="Cobertura del intervalo" value={`${(metricas.cobertura * 100).toFixed(1)}%`} note="Dentro de p10–p90" tone="green" />
        </div>
        <article className="min-w-0 rounded-3xl border border-[#D1DEE7] bg-white p-5 dark:border-[#19506B] dark:bg-[#0E3E5B] sm:p-7">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-heading text-base font-extrabold text-[#102A43] dark:text-[#D8EFF7]">Predicción contra llegada real</h3><p className="mt-1 text-xs text-[#46657A] dark:text-[#B9D4DF]">{resultado.nombre} · {datos.length} observaciones disponibles</p></div><div className="flex flex-wrap gap-4 text-xs text-[#294B63] dark:text-[#B9D4DF]"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#0F2942]" />Predicha</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#2C7A9B]" />Real</span><span><i className="mr-2 inline-block h-2 w-2 rounded-sm bg-[#DCEFF7]" />Intervalo</span></div></div>
          <div className="min-h-[20rem] min-w-0 w-full" aria-label="Curva de predicción frente a llegadas reales"><ResponsiveContainer width="100%" height={320} minWidth={0}><LineChart data={datos} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#D1DEE7" vertical={false} /><ReferenceArea y1={minBanda} y2={maxBanda} fill="#DCEFF7" fillOpacity={0.55} /><XAxis dataKey="etiqueta" interval="preserveStartEnd" tick={{ fill: '#46657A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#B7CBD6' }} /><YAxis tick={{ fill: '#46657A', fontSize: 11 }} tickLine={false} axisLine={false} width={42} /><Tooltip contentStyle={{ border: '1px solid #D1DEE7', borderRadius: 8, boxShadow: '0 8px 24px rgba(16,42,67,.12)' }} formatter={(value, name) => [value, name === 'prediccion' ? 'Predicha' : name === 'real' ? 'Real' : name]} /><Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: '#294B63' }} /><Line type="monotone" dataKey="prediccion" name="Predicha" stroke="#0F2942" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#0F2942' }} /><Line type="monotone" dataKey="real" name="Real" stroke="#2C7A9B" strokeWidth={2} dot={{ r: 2.5, fill: '#2C7A9B' }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
        </article>
      </>}
    </section>
  );
}

function Metric({ icon: Icon, label, value, note, tone }) {
  const tones = { blue: 'border-[#71B5CC] bg-[#E8F6FA] text-[#0C4A62]', amber: 'border-[#DFC264] bg-[#FEF9E2] text-[#704200]', green: 'border-[#A9D6B5] bg-[#EDF8F0] text-[#14472C]' };
  return <article className={`rounded-2xl border p-5 ${tones[tone]}`}><Icon className="h-5 w-5" /><p className="mt-4 text-xs font-bold uppercase tracking-wide">{label}</p><p className="mt-1 font-mono-num text-4xl font-extrabold tabular-nums">{value}</p><p className="mt-1 text-xs opacity-80">{note}</p></article>;
}
