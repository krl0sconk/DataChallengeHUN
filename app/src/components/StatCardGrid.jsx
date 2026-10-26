import React, { memo } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Users } from 'lucide-react';

/**
 * Tarjetas de métricas principales: Semáforo de capacidad, Llegadas proyectadas y Contexto histórico.
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
        className={`rounded-2xl p-5 border relative overflow-hidden transition-all ${alerta.colorBg} ${alerta.colorBorder} shadow-lg`}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Estado de Capacidad
          </h2>
          <span
            className={`h-3 w-3 rounded-full animate-pulse ${alerta.colorDot}`}
            aria-hidden="true"
          />
        </header>

        <p className={`mt-3 text-3xl font-extrabold tracking-tight ${alerta.colorTexto}`}>
          {alerta.etiqueta}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
        </p>

        <footer className="mt-4 pt-3 border-t border-slate-800/80 text-xs flex items-center gap-2 text-slate-300">
          {alerta.nivel === 'rojo' && (
            <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
          )}
          {alerta.nivel === 'amarillo' && (
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
          )}
          {alerta.nivel === 'verde' && (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          )}
          <span>{alerta.accion}</span>
        </footer>
      </article>

      {/* 2. Tarjeta Llegadas Proyectadas (Hoy) */}
      <article className="rounded-2xl p-5 border border-slate-800 bg-[#0e1733]/70 shadow-lg">
        <header>
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Llegadas Proyectadas (Hoy)
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-white">{prediccion}</span>
          <span className="text-sm font-medium text-slate-400">pacientes</span>
        </div>
        <footer className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
          <span>
            Rango p10: <strong className="text-slate-200">{p10}</strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">|</span>
          <span>
            Mediana: <strong className="text-blue-400">{prediccion}</strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">|</span>
          <span>
            Rango p90: <strong className="text-slate-200">{p90}</strong>
          </span>
        </footer>
      </article>

      {/* 3. Tarjeta Contexto Histórico OMOP */}
      <article className="rounded-2xl p-5 border border-slate-800 bg-[#0e1733]/70 shadow-lg">
        <header>
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-200">{servicio.mediaDiaria}</span>
          <span className="text-xs text-slate-400">promedio / día</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {servicio.codigo} · Serie validada del HUN (2023–2026).
        </p>
        <footer className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
          <span>Validación walk-forward sin fuga temporal.</span>
        </footer>
      </article>
    </section>
  );
});
