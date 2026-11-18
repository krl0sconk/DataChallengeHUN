import { AlertTriangle, CheckCircle2, ShieldAlert, Users, WifiOff } from 'lucide-react';

export function StatCardGrid({ alerta, prediccion, p10, p90, servicio, isApiConnected, isLoading }) {
  const { etiqueta, accion, colorDot, colorTexto, iconoColor, nivel } = alerta;
  const estadoProyeccion = nivel === 'rojo'
    ? 'border-[#EBAAB5] bg-[#FDF0F2] text-[#8A1828] dark:border-[#C5304C]/60 dark:bg-[#321823] dark:text-[#FFA8B6]'
    : nivel === 'amarillo'
      ? 'border-[#DFC264] bg-[#FEF9E2] text-[#704200] dark:border-[#D98A00]/60 dark:bg-[#2B2615] dark:text-[#FFDF80]'
      : 'border-[#71B5CC] bg-[#E8F6FA] text-[#0C4A62] dark:border-[#19506B] dark:bg-[#0E3E5B] dark:text-[#B9E2F0]';

  return (
    <section className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-3">
      {/* Estado y semáforo asistencial */}
      <article className="kpi-cell rounded-xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Estado de Capacidad
          </h2>
          <span className={`h-3 w-3 rounded-full ${isApiConnected ? colorDot : 'bg-slate-400'} ring-2 ring-white/80 dark:ring-slate-900`} />
        </header>

        {isLoading ? (
          <div className="mt-3 space-y-2.5 animate-pulse">
            <div className="h-8 w-32 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-44 rounded-md bg-slate-100 dark:bg-slate-800/70" />
            <div className="mt-4 h-4 w-52 rounded-md bg-slate-100 dark:bg-slate-800/70" />
          </div>
        ) : isApiConnected ? (
          <>
            <p className={`mt-2 text-3xl font-semibold tracking-tight font-mono ${colorTexto}`}>
              {etiqueta}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
            </p>

            <footer className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              {nivel === 'rojo' && <ShieldAlert className={`h-4 w-4 ${iconoColor} shrink-0`} />}
              {nivel === 'amarillo' && <AlertTriangle className={`h-4 w-4 ${iconoColor} shrink-0`} />}
              {nivel === 'verde' && <CheckCircle2 className={`h-4 w-4 ${iconoColor} shrink-0`} />}
              <span>{accion}</span>
            </footer>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <WifiOff className="h-5 w-5" />
              <span className="text-sm font-semibold">Sin conexión a la API</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inicia el backend FastAPI para evaluar el nivel de saturación asistencial oficial.
            </p>
          </div>
        )}
      </article>

      {/* Proyección puntual del día */}
      <article className="kpi-cell rounded-xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Llegadas Proyectadas (Hoy)
          </h2>
          {isApiConnected && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoProyeccion}`}>
              <span className={`h-2 w-2 rounded-full ${colorDot}`} aria-hidden="true" />
              {etiqueta}
            </span>
          )}
        </header>

        {isLoading ? (
          <div className="mt-3 space-y-2.5 animate-pulse">
            <div className="h-8 w-32 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-44 rounded-md bg-slate-100 dark:bg-slate-800/70" />
            <div className="mt-4 h-4 w-52 rounded-md bg-slate-100 dark:bg-slate-800/70" />
          </div>
        ) : isApiConnected ? (
          <>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-mono">
                {prediccion}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">pacientes</span>
              {servicio.mediaDiaria > 0 && (
                <span
                  className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    prediccion >= servicio.mediaDiaria
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  }`}
                >
                  {prediccion >= servicio.mediaDiaria ? '+' : ''}
                  {Math.round(((prediccion - servicio.mediaDiaria) / servicio.mediaDiaria) * 100)}% vs media
                </span>
              )}
            </div>
            <footer className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <span>Rango esperado (80% conf.):</span>
              <strong className="font-mono text-slate-900 dark:text-white">{p10} – {p90} pacientes</strong>
            </footer>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            <span className="text-3xl font-semibold font-mono text-slate-400">---</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Esperando respuesta del modelo Python (<code className="font-mono text-[10px]">predict.py</code>).
            </p>
          </div>
        )}
      </article>

      {/* Base histórica de referencia */}
      <article className="kpi-cell rounded-xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80">
        <header>
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-mono">
            {servicio.mediaDiaria}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">promedio / día</span>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          {servicio.codigo} · Serie agregada del HUN (2023–2026).
        </p>
        <footer className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <Users className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span>Datos analizados con el histórico del hospital.</span>
        </footer>
      </article>
    </section>
  );
}

