import { AlertTriangle, CheckCircle2, ShieldAlert, Users, WifiOff } from 'lucide-react';

export function StatCardGrid({ alerta, prediccion, p10, p90, servicio, isApiConnected }) {
  const { etiqueta, accion, colorDot, colorTexto, iconoColor, nivel } = alerta;
  const estadoProyeccion = nivel === 'rojo'
    ? 'border-[#EBAAB5] bg-[#FDF0F2] text-[#8A1828] dark:border-[#C5304C]/60 dark:bg-[#321823] dark:text-[#FFA8B6]'
    : nivel === 'amarillo'
      ? 'border-[#DFC264] bg-[#FEF9E2] text-[#704200] dark:border-[#D98A00]/60 dark:bg-[#2B2615] dark:text-[#FFDF80]'
      : 'border-[#71B5CC] bg-[#E8F6FA] text-[#0C4A62] dark:border-[#19506B] dark:bg-[#0E3E5B] dark:text-[#B9E2F0]';

  return (
    <section className="grid grid-cols-1 divide-y divide-[#D1DEE7] border-b border-[#D1DEE7] dark:divide-[#19506B] dark:border-[#19506B] md:grid-cols-3 md:divide-x md:divide-y-0">
      {/* Estado y semáforo asistencial */}
      <article className="kpi-cell px-8 py-8">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#102A43] dark:text-[#D8EFF7]">
            Estado de Capacidad
          </h2>
          <span className={`h-3.5 w-3.5 rounded-full ${isApiConnected ? colorDot : 'bg-[#6B879B]'}`} />
        </header>

        {isApiConnected ? (
          <>
            <p className={`mt-2 text-3xl font-bold font-mono-num tracking-tight ${colorTexto}`}>
              {etiqueta}
            </p>
            <p className="mt-1 text-xs font-medium text-[#294B63] dark:text-[#B9E2F0]">
              Umbrales: p75 ({servicio.p75}) · p90 ({servicio.p90})
            </p>

            <footer className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#294B63] dark:text-[#B9E2F0]">
              {nivel === 'rojo' && <ShieldAlert className={`h-5 w-5 ${iconoColor} shrink-0`} />}
              {nivel === 'amarillo' && <AlertTriangle className={`h-5 w-5 ${iconoColor} shrink-0`} />}
              {nivel === 'verde' && <CheckCircle2 className={`h-5 w-5 ${iconoColor} shrink-0`} />}
              <span>{accion}</span>
            </footer>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-[#294B63] dark:text-[#6B879B]">
              <WifiOff className="h-5 w-5" />
              <span className="text-sm font-bold">Sin conexión a la API</span>
            </div>
            <p className="text-xs text-[#294B63] dark:text-[#6B879B]">
              Inicia el backend FastAPI para evaluar el nivel de saturación asistencial oficial.
            </p>
          </div>
        )}
      </article>

      {/* Proyección puntual del día */}
      <article className="kpi-cell px-8 py-8">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#14516B] dark:text-[#B9E2F0]">
            Llegadas Proyectadas (Hoy)
          </h2>
          {isApiConnected && (
            <span className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${estadoProyeccion}`}>
              <span className={`h-3.5 w-3.5 rounded-full ${colorDot} ring-2 ring-white/80 dark:ring-[#071B2A]`} aria-hidden="true" />
              {etiqueta}
            </span>
          )}
          {isApiConnected && servicio.mediaDiaria > 0 && (
            <span
              className={`border-l-2 pl-2 text-[10px] font-extrabold ${
                prediccion >= servicio.mediaDiaria
                  ? 'border-[#B26B00] text-[#704200] dark:text-[#FFDF80]'
                  : 'border-[#71B5CC] text-[#0C4A62] dark:text-[#9FE4F5]'
              }`}
            >
              {prediccion >= servicio.mediaDiaria ? '+' : ''}
              {Math.round(((prediccion - servicio.mediaDiaria) / servicio.mediaDiaria) * 100)}% vs media
            </span>
          )}
        </header>

        {isApiConnected ? (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono-num text-[#102A43] dark:text-[#D8EFF7]">
                {prediccion}
              </span>
              <span className="text-sm font-bold text-[#14516B] dark:text-[#B9E2F0]">pacientes</span>
            </div>
            <footer className="mt-4 flex items-center justify-between text-xs font-mono-num font-semibold text-[#102A43] dark:text-[#D8EFF7]">
              <span>p10: <strong className="text-[#14516B] dark:text-[#B9E2F0]">{p10}</strong></span>
              <span className="text-[#71B5CC] dark:text-[#1B8CC9]">|</span>
              <span>Mediana: <strong className="text-[#14516B] dark:text-[#B9E2F0]">{prediccion}</strong></span>
              <span className="text-[#71B5CC] dark:text-[#1B8CC9]">|</span>
              <span>p90: <strong className="text-[#14516B] dark:text-[#B9E2F0]">{p90}</strong></span>
            </footer>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            <span className="text-3xl font-extrabold font-mono-num text-[#6B879B]">---</span>
            <p className="text-xs text-[#294B63] dark:text-[#6B879B]">
              Esperando respuesta del modelo Python (<code className="font-mono text-[10px]">predict.py</code>).
            </p>
          </div>
        )}
      </article>

      {/* Base histórica de referencia */}
      <article className="kpi-cell px-8 py-8">
        <header>
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#102A43] dark:text-[#D8EFF7]">
            Contexto Histórico Asistencial
          </h2>
        </header>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono-num text-[#102A43] dark:text-[#D8EFF7]">
            {servicio.mediaDiaria}
          </span>
          <span className="text-xs font-bold text-[#14516B] dark:text-[#B9E2F0]">promedio / día</span>
        </div>
        <p className="mt-4 text-xs font-semibold text-[#102A43] dark:text-[#D8EFF7]">
          {servicio.codigo} · Serie agregada del HUN (2023–2026).
        </p>
        <footer className="mt-4 flex items-center gap-2 text-xs font-bold text-[#14472C] dark:text-[#B9E2F0]">
          <Users className="h-4 w-4 shrink-0 text-[#14472C] dark:text-[#B9E2F0]" />
          <span>Datos analizados con el histórico del hospital.</span>
        </footer>
      </article>
    </section>
  );
}

