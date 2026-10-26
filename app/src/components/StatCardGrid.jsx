import { AlertTriangle, CheckCircle2, ShieldAlert, Users } from 'lucide-react';

export function StatCardGrid({ alerta, prediccion, p10, p90, servicio }) {
  const { etiqueta, subtitulo, accion, colorBg, colorBorder, colorDot, colorTexto, iconoColor, nivel } = alerta;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Estado y semáforo asistencial con color semántico real */}
      <article className={`rounded-3xl p-6 border ${colorBg} ${colorBorder}`}>
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#601D49]">
            Estado de Capacidad
          </h2>
          <span className={`h-3.5 w-3.5 rounded-full ${colorDot}`} />
        </header>

        <p className={`mt-3 text-3xl font-black font-heading ${colorTexto}`}>
          {etiqueta}
        </p>
        <p className="mt-1 text-xs text-[#601D49]/70 font-medium">
          Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
        </p>

        <footer className="mt-4 pt-3 border-t border-black/10 text-xs flex items-center gap-2 text-[#4A1538] font-medium">
          {nivel === 'rojo' && <ShieldAlert className={`h-5 w-5 ${iconoColor} shrink-0`} />}
          {nivel === 'amarillo' && <AlertTriangle className={`h-5 w-5 ${iconoColor} shrink-0`} />}
          {nivel === 'verde' && <CheckCircle2 className={`h-5 w-5 ${iconoColor} shrink-0`} />}
          <span>{accion}</span>
        </footer>
      </article>

      {/* Proyección puntual del día con acento azul sereno */}
      <article className="rounded-3xl p-6 border border-[#D5E5F2] bg-white">
        <header>
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#286B94]">
            Llegadas Proyectadas (Hoy)
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold font-mono-num text-[#184560]">
            {prediccion}
          </span>
          <span className="text-sm font-bold text-[#286B94]">pacientes</span>
        </div>
        <footer className="mt-3.5 flex items-center justify-between text-xs p-2.5 rounded-xl border border-[#D5E5F2] bg-[#F3F8FC] text-[#184560] font-mono-num font-semibold">
          <span>p10: <strong>{p10}</strong></span>
          <span className="text-[#A7C8E2]">|</span>
          <span>Mediana: <strong className="text-[#286B94]">{prediccion}</strong></span>
          <span className="text-[#A7C8E2]">|</span>
          <span>p90: <strong>{p90}</strong></span>
        </footer>
      </article>

      {/* Base histórica de referencia con acento verde clínico */}
      <article className="rounded-3xl p-6 border border-[#FFEBB8] bg-white">
        <header>
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#BD5579]">
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold font-mono-num text-[#601D49]">
            {servicio.mediaDiaria}
          </span>
          <span className="text-xs font-bold text-[#BD5579]">promedio / día</span>
        </div>
        <p className="mt-2 text-xs font-medium text-[#BD5579]">
          {servicio.codigo} · Serie agregada del HUN (2023–2026).
        </p>
        <footer className="mt-4 pt-3 border-t border-[#FFEBB8]/50 text-xs text-[#2D8A68] flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4 shrink-0 text-[#2D8A68]" />
          <span>Validación walk-forward sin fuga temporal.</span>
        </footer>
      </article>
    </section>
  );
}
