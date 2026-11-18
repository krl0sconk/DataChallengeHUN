import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCuellosBotella } from '../lib/api';

export function RadarPresionServicios() {
  const [etapas, setEtapas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    getCuellosBotella()
      .then((data) => { if (activo) { setEtapas(Array.isArray(data.etapas) ? data.etapas : []); setError(false); } })
      .catch(() => activo && setError(true))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);

  return (
    <section className="rounded-3xl border border-[#D1DEE7] bg-white p-6 transition-colors dark:border-[#19506B] dark:bg-[#0E3E5B]">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[#E8F0F5] pb-4 dark:border-[#0B3045]">
        <div>
          <h2 className="text-base font-bold font-heading text-[#102A43] dark:text-[#D8EFF7]">Etapas con mayor demora</h2>
          <p className="mt-1 text-xs text-[#46657A] dark:text-[#B9D4DF]">Duración del 90% de los casos por etapa.</p>
        </div>
        <span className="text-xs font-bold text-[#704200] dark:text-[#FFD875]">p90 · horas</span>
      </header>

      {cargando && <div className="flex h-56 items-center justify-center text-sm text-[#46657A] dark:text-[#B9D4DF]">Cargando etapas…</div>}
      {error && <div className="border border-[#DFC264] bg-[#FEF9E2] p-4 text-sm text-[#704200] dark:border-[#7A5A00] dark:bg-[#201B0E] dark:text-[#FFDF80]">No se pudieron cargar las etapas.</div>}
      {!cargando && !error && !etapas.length && <div className="flex h-56 items-center justify-center text-sm text-[#46657A] dark:text-[#B9D4DF]">La API no devolvió etapas para este análisis.</div>}
      {!cargando && !error && etapas.length > 0 && <div className="h-64 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={etapas} layout="vertical" margin={{ top: 4, right: 52, left: 8, bottom: 4 }} barCategoryGap="28%"><CartesianGrid horizontal={false} stroke="#E8F0F5" /><XAxis type="number" tick={{ fill: '#46657A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#B7C8D5' }} unit=" h" /><YAxis type="category" dataKey="etapa" width={190} tick={{ fill: '#102A43', fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ border: '1px solid #D1DEE7', borderRadius: 8, boxShadow: '0 8px 24px rgba(16,42,67,.12)' }} formatter={(value) => [`${value} h`, 'p90']} /><Bar dataKey="p90_horas" fill="#D98A00" radius={[0, 4, 4, 0]}><LabelList dataKey="p90_horas" position="right" formatter={(value) => `${value} h`} fill="#704200" fontSize={11} fontWeight={700} /></Bar></BarChart></ResponsiveContainer></div>}
    </section>
  );
}
