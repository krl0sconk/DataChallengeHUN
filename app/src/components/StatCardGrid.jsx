import { AlertTriangle, CheckCircle2, ShieldAlert, Users } from 'lucide-react';

export function StatCardGrid({ alerta, prediccion, p10, p90, servicio }) {
  const { etiqueta, subtitulo, accion, colorBg, colorBorder, colorDot, colorTexto, iconoColor, nivel } = alerta;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Estado y semáforo asistencial con color semántico real */}
      <article className={`rounded-3xl p-6 border transition-colors ${colorBg} ${colorBorder} dark:bg-[#285A48] dark:border-[#1F4436]`}>
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#4A4466] dark:text-[#B0E4CC]">
            Estado de Capacidad
          </h2>
          <span className={`h-3.5 w-3.5 rounded-full ${colorDot}`} />
        </header>

        <p className={`mt-3 text-3xl font-black font-heading ${colorTexto} dark:brightness-125`}>
          {etiqueta}
        </p>
        <p className="mt-1 text-xs text-[#4A4466]/70 dark:text-[#B0E4CC]/70 font-medium">
          Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
        </p>

        <footer className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 text-xs flex items-center gap-2 text-[#4A4466] dark:text-[#B0E4CC] font-medium">
          {nivel === 'rojo' && <ShieldAlert className={`h-5 w-5 ${iconoColor} shrink-0`} />}
          {nivel === 'amarillo' && <AlertTriangle className={`h-5 w-5 ${iconoColor} shrink-0`} />}
          {nivel === 'verde' && <CheckCircle2 className={`h-5 w-5 ${iconoColor} shrink-0`} />}
          <span>{accion}</span>
        </footer>
      </article>

      {/* Proyección puntual del día con acento azul sereno */}
      <article className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#1F4436] bg-white dark:bg-[#285A48] transition-colors">
        <header>
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#3B7D8C] dark:text-[#9FCBAD]">
            Llegadas Proyectadas (Hoy)
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold font-mono-num text-[#4A4466] dark:text-[#B0E4CC]">
            {prediccion}
          </span>
          <span className="text-sm font-bold text-[#3B7D8C] dark:text-[#9FCBAD]">pacientes</span>
        </div>
        <footer className="mt-3.5 flex items-center justify-between text-xs p-2.5 rounded-xl border border-[#EDF3DC] dark:border-[#1F4436] bg-[#F1F7D4]/40 dark:bg-[#091413] text-[#4A4466] dark:text-[#B0E4CC] font-mono-num font-semibold">
          <span>p10: <strong>{p10}</strong></span>
          <span className="text-[#9FCBAD] dark:text-[#408A71]">|</span>
          <span>Mediana: <strong className="text-[#3B7D8C] dark:text-[#9FCBAD]">{prediccion}</strong></span>
          <span className="text-[#9FCBAD] dark:text-[#408A71]">|</span>
          <span>p90: <strong>{p90}</strong></span>
        </footer>
      </article>

      {/* Base histórica de referencia con acento salvia clínico */}
      <article className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#1F4436] bg-white dark:bg-[#285A48] transition-colors">
        <header>
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#4A4466]/80 dark:text-[#B0E4CC]/70">
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold font-mono-num text-[#4A4466] dark:text-[#B0E4CC]">
            {servicio.mediaDiaria}
          </span>
          <span className="text-xs font-bold text-[#3B7D8C] dark:text-[#9FCBAD]">promedio / día</span>
        </div>
        <p className="mt-2 text-xs font-medium text-[#4A4466]/80 dark:text-[#B0E4CC]/70">
          {servicio.codigo} · Serie agregada del HUN (2023–2026).
        </p>
        <footer className="mt-4 pt-3 border-t border-[#EDF3DC] dark:border-[#1F4436] text-xs text-[#205C3B] dark:text-[#9FCBAD] flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4 shrink-0 text-[#205C3B] dark:text-[#9FCBAD]" />
          <span>Validación walk-forward sin fuga temporal.</span>
        </footer>
      </article>
    </section>
  );
}
