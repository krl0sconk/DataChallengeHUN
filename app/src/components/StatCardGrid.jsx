import React, { memo } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Users } from 'lucide-react';

/**
 * Grid de métricas principales con soporte dinámico para Modo Claro y Oscuro Cozy Pastel.
 */
export const StatCardGrid = memo(function StatCardGrid({
  alerta,
  prediccion,
  p10,
  p90,
  servicio,
  isDark,
}) {
  return (
    <section
      aria-label="Indicadores clave de capacidad y demanda"
      className="grid grid-cols-1 md:grid-cols-3 gap-5"
    >
      {/* 1. Tarjeta Semáforo de Capacidad Asistencial */}
      <article
        className={`rounded-2xl p-6 border relative overflow-hidden transition-all shadow-xs ${
          isDark
            ? alerta.nivel === 'rojo'
              ? 'bg-[#351e24] border-rose-400/50 text-rose-100'
              : alerta.nivel === 'amarillo'
              ? 'bg-[#352c1e] border-amber-400/50 text-amber-100'
              : 'bg-[#1b2f27] border-emerald-400/50 text-emerald-100'
            : `${alerta.colorBg} ${alerta.colorBorder}`
        }`}
      >
        <header className="flex items-center justify-between">
          <h2
            className={`text-xs uppercase font-extrabold tracking-wider ${
              isDark ? 'text-slate-200' : 'text-stone-700'
            }`}
          >
            Estado de Capacidad
          </h2>
          <span
            className={`h-3.5 w-3.5 rounded-full ${
              isDark
                ? alerta.nivel === 'rojo'
                  ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
                  : alerta.nivel === 'amarillo'
                  ? 'bg-amber-400 shadow-[0_0_8px_#fcd34d]'
                  : 'bg-emerald-400 shadow-[0_0_8px_#6ee7b7]'
                : alerta.colorDot
            }`}
            aria-hidden="true"
          />
        </header>

        <p
          className={`mt-3 text-3xl font-black tracking-tight font-heading ${
            isDark
              ? alerta.nivel === 'rojo'
                ? 'text-rose-200'
                : alerta.nivel === 'amarillo'
                ? 'text-amber-200'
                : 'text-emerald-200'
              : alerta.colorTexto
          }`}
        >
          {alerta.etiqueta}
        </p>
        <p
          className={`mt-1 text-xs ${
            isDark ? 'text-slate-200' : alerta.colorSubtexto
          }`}
        >
          Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
        </p>

        <footer
          className={`mt-4 pt-3.5 border-t text-xs flex items-center gap-2.5 font-medium ${
            isDark ? 'border-white/10 text-slate-100' : 'border-black/10 text-stone-800'
          }`}
        >
          {alerta.nivel === 'rojo' && (
            <ShieldAlert className={`h-5 w-5 shrink-0 ${isDark ? 'text-rose-300' : 'text-rose-700'}`} aria-hidden="true" />
          )}
          {alerta.nivel === 'amarillo' && (
            <AlertTriangle className={`h-5 w-5 shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-700'}`} aria-hidden="true" />
          )}
          {alerta.nivel === 'verde' && (
            <CheckCircle2 className={`h-5 w-5 shrink-0 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} aria-hidden="true" />
          )}
          <span className="leading-snug">{alerta.accion}</span>
        </footer>
      </article>

      {/* 2. Tarjeta Llegadas Proyectadas (Hoy) */}
      <article
        className={`rounded-2xl p-6 border shadow-xs transition-colors ${
          isDark
            ? 'border-[#2e3748] bg-[#1e2536]'
            : 'border-stone-200 bg-white'
        }`}
      >
        <header>
          <h2
            className={`text-xs uppercase font-extrabold tracking-wider ${
              isDark ? 'text-slate-300' : 'text-stone-600'
            }`}
          >
            Llegadas Proyectadas (Hoy)
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-4xl font-extrabold font-mono-num tracking-tight ${
              isDark ? 'text-white' : 'text-stone-900'
            }`}
          >
            {prediccion}
          </span>
          <span
            className={`text-sm font-bold ${
              isDark ? 'text-slate-300' : 'text-stone-600'
            }`}
          >
            pacientes
          </span>
        </div>
        <footer
          className={`mt-3.5 flex items-center justify-between text-xs p-2.5 rounded-xl border font-mono-num font-semibold ${
            isDark
              ? 'border-[#333d52] bg-[#161c28] text-slate-200'
              : 'border-stone-200 bg-stone-50 text-stone-700'
          }`}
        >
          <span>
            p10: <strong className={isDark ? 'text-white font-bold' : 'text-stone-900 font-bold'}>{p10}</strong>
          </span>
          <span className={isDark ? 'text-slate-600' : 'text-stone-400'} aria-hidden="true">|</span>
          <span>
            Mediana: <strong className={isDark ? 'text-indigo-300 font-bold' : 'text-sky-700 font-bold'}>{prediccion}</strong>
          </span>
          <span className={isDark ? 'text-slate-600' : 'text-stone-400'} aria-hidden="true">|</span>
          <span>
            p90: <strong className={isDark ? 'text-white font-bold' : 'text-stone-900 font-bold'}>{p90}</strong>
          </span>
        </footer>
      </article>

      {/* 3. Tarjeta Contexto Histórico OMOP */}
      <article
        className={`rounded-2xl p-6 border shadow-xs transition-colors ${
          isDark
            ? 'border-[#2e3748] bg-[#1e2536]'
            : 'border-stone-200 bg-white'
        }`}
      >
        <header>
          <h2
            className={`text-xs uppercase font-extrabold tracking-wider ${
              isDark ? 'text-slate-300' : 'text-stone-600'
            }`}
          >
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-4xl font-extrabold font-mono-num tracking-tight ${
              isDark ? 'text-white' : 'text-stone-900'
            }`}
          >
            {servicio.mediaDiaria}
          </span>
          <span
            className={`text-xs font-bold ${
              isDark ? 'text-slate-300' : 'text-stone-600'
            }`}
          >
            promedio / día
          </span>
        </div>
        <p
          className={`mt-2 text-xs font-medium ${
            isDark ? 'text-slate-300' : 'text-stone-600'
          }`}
        >
          {servicio.codigo} · Serie agregada del HUN (2023–2026).
        </p>
        <footer
          className={`mt-4 pt-3.5 border-t text-xs flex items-center gap-2 font-semibold ${
            isDark
              ? 'border-[#2e3748] text-slate-300'
              : 'border-stone-100 text-stone-700'
          }`}
        >
          <Users className={`h-4 w-4 shrink-0 ${isDark ? 'text-indigo-400' : 'text-sky-700'}`} aria-hidden="true" />
          <span>Validación walk-forward sin fuga temporal.</span>
        </footer>
      </article>
    </section>
  );
});
