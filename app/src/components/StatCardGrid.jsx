import { AlertTriangle, CheckCircle2, ShieldAlert, Users, WifiOff } from 'lucide-react';

export function StatCardGrid({ alerta, prediccion, p10, p90, servicio, isApiConnected }) {
  const { etiqueta, accion, colorBg, colorBorder, colorDot, colorTexto, iconoColor, nivel } = alerta;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Estado y semáforo asistencial */}
      <article className={`rounded-3xl p-6 border transition-colors ${isApiConnected ? `${colorBg} ${colorBorder}` : 'bg-gray-50 dark:bg-[#0E3B39]/40 border-gray-200 dark:border-gray-700'}`}>
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#2D283E] dark:text-[#C4E5CA]">
            Estado de Capacidad
          </h2>
          <span className={`h-3.5 w-3.5 rounded-full ${isApiConnected ? colorDot : 'bg-gray-400'}`} />
        </header>

        {isApiConnected ? (
          <>
            <p className={`mt-3 text-3xl font-black font-heading ${colorTexto}`}>
              {etiqueta}
            </p>
            <p className="mt-1 text-xs text-[#2D283E] dark:text-[#C4E5CA] font-semibold">
              Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
            </p>

            <footer className="mt-4 pt-3 border-t border-black/15 dark:border-white/15 text-xs flex items-center gap-2 text-[#2D283E] dark:text-[#C4E5CA] font-semibold">
              {nivel === 'rojo' && <ShieldAlert className={`h-5 w-5 ${iconoColor} shrink-0`} />}
              {nivel === 'amarillo' && <AlertTriangle className={`h-5 w-5 ${iconoColor} shrink-0`} />}
              {nivel === 'verde' && <CheckCircle2 className={`h-5 w-5 ${iconoColor} shrink-0`} />}
              <span>{accion}</span>
            </footer>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <WifiOff className="h-5 w-5" />
              <span className="text-sm font-bold">Sin conexión a la API</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Inicia el backend FastAPI para evaluar el nivel de saturación asistencial oficial.
            </p>
          </div>
        )}
      </article>

      {/* Proyección puntual del día */}
      <article className="rounded-3xl p-6 border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] transition-colors">
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#1E4D57] dark:text-[#A8E2AF]">
            Llegadas Proyectadas (Hoy)
          </h2>
          {isApiConnected && servicio.mediaDiaria > 0 && (
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                prediccion >= servicio.mediaDiaria
                  ? 'bg-[#FEF9E2] text-[#704200] border-[#DFC264] dark:bg-[#071D22] dark:text-[#FFDF80]'
                  : 'bg-[#EEF7F1] text-[#0E4222] border-[#7CB592] dark:bg-[#071D22] dark:text-[#8AE6A2]'
              }`}
            >
              {prediccion >= servicio.mediaDiaria ? '+' : ''}
              {Math.round(((prediccion - servicio.mediaDiaria) / servicio.mediaDiaria) * 100)}% vs media
            </span>
          )}
        </header>

        {isApiConnected ? (
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono-num text-[#2D283E] dark:text-[#C4E5CA]">
                {prediccion}
              </span>
              <span className="text-sm font-bold text-[#1E4D57] dark:text-[#A8E2AF]">pacientes</span>
            </div>
            <footer className="mt-3.5 flex items-center justify-between text-xs p-2.5 rounded-xl border border-[#D6E0C2] dark:border-[#1B524F] bg-[#F1F7D4] dark:bg-[#071D22] text-[#2D283E] dark:text-[#C4E5CA] font-mono-num font-semibold">
              <span>p10: <strong className="text-[#1E4D57] dark:text-[#A8E2AF]">{p10}</strong></span>
              <span className="text-[#7CB592] dark:text-[#2A835F]">|</span>
              <span>Mediana: <strong className="text-[#1E4D57] dark:text-[#A8E2AF]">{prediccion}</strong></span>
              <span className="text-[#7CB592] dark:text-[#2A835F]">|</span>
              <span>p90: <strong className="text-[#1E4D57] dark:text-[#A8E2AF]">{p90}</strong></span>
            </footer>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            <span className="text-3xl font-extrabold font-mono-num text-gray-400">---</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Esperando respuesta del modelo Python (<code className="font-mono text-[10px]">predict.py</code>).
            </p>
          </div>
        )}
      </article>

      {/* Base histórica de referencia */}
      <article className="rounded-3xl p-6 border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] transition-colors">
        <header>
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#2D283E] dark:text-[#C4E5CA]">
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold font-mono-num text-[#2D283E] dark:text-[#C4E5CA]">
            {servicio.mediaDiaria}
          </span>
          <span className="text-xs font-bold text-[#1E4D57] dark:text-[#A8E2AF]">promedio / día</span>
        </div>
        <p className="mt-2 text-xs font-semibold text-[#2D283E] dark:text-[#C4E5CA]">
          {servicio.codigo} · Serie agregada del HUN (2023–2026).
        </p>
        <footer className="mt-4 pt-3 border-t border-[#D6E0C2] dark:border-[#1B524F] text-xs text-[#14472C] dark:text-[#A8E2AF] flex items-center gap-2 font-bold">
          <Users className="h-4 w-4 shrink-0 text-[#14472C] dark:text-[#A8E2AF]" />
          <span>Datos analizados con el histórico del hospital.</span>
        </footer>
      </article>
    </section>
  );
}
