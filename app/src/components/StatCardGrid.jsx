import React, { memo } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Users } from 'lucide-react';

/**
 * Tarjetas de métricas principales: Estilo Warm & Cozy con bordes suaves y contraste perfecto.
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
        className={`rounded-2xl p-6 border relative overflow-hidden transition-all ${alerta.colorBg} ${alerta.colorBorder} shadow-xs`}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-stone-700">
            Estado de Capacidad
          </h2>
          <span
            className={`h-3.5 w-3.5 rounded-full ${alerta.colorDot}`}
            aria-hidden="true"
          />
        </header>

        <p className={`mt-3 text-3xl font-black tracking-tight font-heading ${alerta.colorTexto}`}>
          {alerta.etiqueta}
        </p>
        <p className={`mt-1 text-xs ${alerta.colorSubtexto}`}>
          Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
        </p>

        <footer className="mt-4 pt-3.5 border-t border-black/10 text-xs flex items-center gap-2.5 text-stone-800 font-medium">
          {alerta.nivel === 'rojo' && (
            <ShieldAlert className="h-5 w-5 text-rose-700 shrink-0" aria-hidden="true" />
          )}
          {alerta.nivel === 'amarillo' && (
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" aria-hidden="true" />
          )}
          {alerta.nivel === 'verde' && (
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
          )}
          <span className="leading-snug">{alerta.accion}</span>
        </footer>
      </article>

      {/* 2. Tarjeta Llegadas Proyectadas (Hoy) */}
      <article className="rounded-2xl p-6 border border-stone-200 bg-white shadow-xs">
        <header>
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-stone-600">
            Llegadas Proyectadas (Hoy)
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-stone-900 font-mono-num tracking-tight">{prediccion}</span>
          <span className="text-sm font-bold text-stone-600">pacientes</span>
        </div>
        <footer className="mt-3.5 flex items-center justify-between text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 font-mono-num font-semibold">
          <span>
            p10: <strong className="text-stone-900 font-bold">{p10}</strong>
          </span>
          <span className="text-stone-400" aria-hidden="true">|</span>
          <span>
            Mediana: <strong className="text-sky-700 font-bold">{prediccion}</strong>
          </span>
          <span className="text-stone-400" aria-hidden="true">|</span>
          <span>
            p90: <strong className="text-stone-900 font-bold">{p90}</strong>
          </span>
        </footer>
      </article>

      {/* 3. Tarjeta Contexto Histórico OMOP */}
      <article className="rounded-2xl p-6 border border-stone-200 bg-white shadow-xs">
        <header>
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-stone-600">
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-stone-900 font-mono-num tracking-tight">{servicio.mediaDiaria}</span>
          <span className="text-xs font-bold text-stone-600">promedio / día</span>
        </div>
        <p className="mt-2 text-xs font-medium text-stone-600">
          {servicio.codigo} · Serie agregada del HUN (2023–2026).
        </p>
        <footer className="mt-4 pt-3.5 border-t border-stone-100 text-xs text-stone-700 flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4 text-sky-700 shrink-0" aria-hidden="true" />
          <span>Validación walk-forward sin fuga temporal.</span>
        </footer>
      </article>
    </section>
  );
});
