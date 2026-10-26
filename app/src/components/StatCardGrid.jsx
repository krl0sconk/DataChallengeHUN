import React, { memo } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Users } from 'lucide-react';

/**
 * Tarjetas de métricas principales con alto contraste (WCAG AAA) y fuentes combinadas.
 */
export const StatCardGrid = memo(function StatCardGrid({
  alerta,
  prediccion,
  p10,
  p90,
  servicio,
}) {
  return (
    <section
      aria-label="Indicadores clave de capacidad y demanda"
      className="grid grid-cols-1 md:grid-cols-3 gap-5"
    >
      {/* 1. Tarjeta Semáforo de Capacidad Asistencial */}
      <article
        className={`rounded-2xl p-6 border relative overflow-hidden transition-all ${alerta.colorBg} ${alerta.colorBorder} shadow-lg`}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-200">
            Estado de Capacidad
          </h2>
          <span
            className={`h-3.5 w-3.5 rounded-full animate-pulse ${alerta.colorDot}`}
            aria-hidden="true"
          />
        </header>

        <p className={`mt-3 text-3xl font-extrabold tracking-tight font-heading ${alerta.colorTexto}`}>
          {alerta.etiqueta}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-200">
          Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
        </p>

        <footer className="mt-4 pt-3.5 border-t border-slate-700/80 text-xs flex items-center gap-2.5 text-slate-100 font-medium">
          {alerta.nivel === 'rojo' && (
            <ShieldAlert className="h-5 w-5 text-rose-300 shrink-0" aria-hidden="true" />
          )}
          {alerta.nivel === 'amarillo' && (
            <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0" aria-hidden="true" />
          )}
          {alerta.nivel === 'verde' && (
            <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" aria-hidden="true" />
          )}
          <span className="leading-snug">{alerta.accion}</span>
        </footer>
      </article>

      {/* 2. Tarjeta Llegadas Proyectadas (Hoy) */}
      <article className="rounded-2xl p-6 border border-slate-700/80 bg-[#0d1736] shadow-lg">
        <header>
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-300">
            Llegadas Proyectadas (Hoy)
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-white font-mono-num tracking-tight">{prediccion}</span>
          <span className="text-sm font-semibold text-slate-300">pacientes</span>
        </div>
        <footer className="mt-3.5 flex items-center justify-between text-xs text-slate-200 bg-[#070e24] p-2.5 rounded-xl border border-slate-700/80 font-mono-num font-medium">
          <span>
            p10: <strong className="text-white font-bold">{p10}</strong>
          </span>
          <span className="text-slate-500" aria-hidden="true">|</span>
          <span>
            Mediana: <strong className="text-sky-300 font-bold">{prediccion}</strong>
          </span>
          <span className="text-slate-500" aria-hidden="true">|</span>
          <span>
            p90: <strong className="text-white font-bold">{p90}</strong>
          </span>
        </footer>
      </article>

      {/* 3. Tarjeta Contexto Histórico OMOP */}
      <article className="rounded-2xl p-6 border border-slate-700/80 bg-[#0d1736] shadow-lg">
        <header>
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-300">
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-white font-mono-num tracking-tight">{servicio.mediaDiaria}</span>
          <span className="text-xs font-medium text-slate-300">promedio / día</span>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-300">
          {servicio.codigo} · Serie agregada del HUN (2023–2026).
        </p>
        <footer className="mt-4 pt-3.5 border-t border-slate-700/80 text-xs text-slate-300 flex items-center gap-2 font-medium">
          <Users className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
          <span>Validación walk-forward sin fuga temporal.</span>
        </footer>
      </article>
    </section>
  );
});
