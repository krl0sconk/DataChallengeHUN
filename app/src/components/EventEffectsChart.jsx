import { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { getEfectosEventos } from '../lib/api';

export function EventEffectsChart({ servicio }) {
  const [eventos, setEventos] = useState([]);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    let activo = true;
    setEstado('cargando');
    getEfectosEventos(servicio.id)
      .then((data) => { if (activo) { setEventos(Array.isArray(data.eventos) ? data.eventos : []); setEstado('ok'); } })
      .catch(() => activo && setEstado('error'));
    return () => { activo = false; };
  }, [servicio.id]);

  const escala = Math.max(...eventos.flatMap((evento) => [evento.media_normal, evento.media_evento]), 1);

  return (
    <section className="min-w-0 rounded-3xl border border-[#D1DEE7] bg-white p-6 dark:border-[#19506B] dark:bg-[#0E3E5B]">
      <header className="mb-5 flex items-start justify-between gap-3 border-b border-[#E8F0F5] pb-4 dark:border-[#0B3045]">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold font-heading text-[#102A43] dark:text-[#D8EFF7]">Efectos históricos por evento <CircleHelp className="h-4 w-4 text-[#14516B] dark:text-[#B9E2F0]" title="Promedios observados por la API, no una simulación" /></h2>
          <p className="mt-1 text-xs text-[#46657A] dark:text-[#B9D4DF]">{servicio.nombre} · promedio de llegadas observadas.</p>
        </div>
        <span className="text-xs font-bold text-[#46657A] dark:text-[#B9D4DF]">Histórico</span>
      </header>
      {estado === 'cargando' && <div className="flex h-64 items-center justify-center text-sm text-[#46657A] dark:text-[#B9D4DF]">Cargando efectos…</div>}
      {estado === 'error' && <div className="border border-[#DFC264] bg-[#FEF9E2] p-4 text-sm text-[#704200] dark:border-[#7A5A00] dark:bg-[#201B0E] dark:text-[#FFDF80]">No se pudieron cargar los efectos históricos.</div>}
      {estado === 'ok' && !eventos.length && <div className="flex h-64 items-center justify-center text-sm text-[#46657A] dark:text-[#B9D4DF]">La API no devolvió eventos.</div>}
      {estado === 'ok' && eventos.length > 0 && <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] items-end border-b border-[#E8F0F5] pb-2 text-[11px] font-bold uppercase tracking-wider text-[#46657A] dark:border-[#0B3045] dark:text-[#B9D4DF]"><span>Evento</span><span>Impacto histórico</span></div>
        {eventos.map((evento) => {
          const diferencia = Number(evento.cambio_visitas || 0);
          const positivo = diferencia > 0;
          const porcentaje = Number(evento.cambio_pct || 0);
          return <article key={evento.evento} className="grid gap-3 border-b border-[#E8F0F5] pb-3 last:border-0 last:pb-0 dark:border-[#0B3045] sm:grid-cols-[minmax(12rem,1fr)_minmax(15rem,2fr)_auto] sm:items-center">
            <div><h3 className="text-sm font-bold text-[#102A43] dark:text-[#D8EFF7]">{evento.etiqueta}</h3><p className="mt-0.5 text-xs text-[#46657A] dark:text-[#B9D4DF]">{evento.n_dias} días observados</p></div>
            <div className="space-y-1.5"><div className="flex items-center gap-2 text-[11px] text-[#46657A] dark:text-[#B9D4DF]"><span className="w-16">Normal</span><span className="h-2 flex-1 rounded-full bg-[#E3EBF0]"><span className="block h-2 rounded-full bg-[#9FB5C2]" style={{ width: `${(evento.media_normal / escala) * 100}%` }} /></span><strong className="w-14 text-right font-mono-num">{evento.media_normal}</strong></div><div className="flex items-center gap-2 text-[11px] text-[#46657A] dark:text-[#B9D4DF]"><span className="w-16">Evento</span><span className={`h-2 flex-1 rounded-full ${positivo ? 'bg-[#DCEFF7]' : 'bg-[#EDF8F0]'}`}><span className={`block h-2 rounded-full ${positivo ? 'bg-[#2C7A9B]' : 'bg-[#5D9A72]'}`} style={{ width: `${(evento.media_evento / escala) * 100}%` }} /></span><strong className="w-14 text-right font-mono-num">{evento.media_evento}</strong></div></div>
            <div className={`text-right font-mono-num text-sm font-extrabold ${positivo ? 'text-[#2C7A9B]' : diferencia < 0 ? 'text-[#5D9A72]' : 'text-[#46657A] dark:text-[#B9D4DF]'}`}>{diferencia > 0 ? '+' : ''}{diferencia} <span className="text-xs font-bold">({porcentaje > 0 ? '+' : ''}{porcentaje}%)</span></div>
          </article>;
        })}
      </div>}
    </section>
  );
}
