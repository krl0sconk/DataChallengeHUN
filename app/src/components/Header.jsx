import { HeartPulse, Moon, Sun } from 'lucide-react';

export function Header({
  servicios,
  servicioActivoId,
  onSeleccionarServicio,
  isDark,
  onToggleTheme,
}) {
  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md px-6 py-4 transition-colors ${
        isDark ? 'border-[#2e3748] bg-[#1a202c]/90' : 'border-stone-200 bg-[#fdfbf7]/90'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
              isDark
                ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-300'
                : 'border-sky-200 bg-sky-100/70 text-sky-700'
            }`}
          >
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1
                className={`text-xl font-bold tracking-tight font-heading ${
                  isDark ? 'text-slate-100' : 'text-stone-900'
                }`}
              >
                Hospital Universidad del Norte
              </h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  isDark
                    ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                    : 'border-sky-300 bg-sky-100 text-sky-900'
                }`}
              >
                Data Challenge 2026
              </span>
            </div>
            <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center rounded-2xl border p-1 shadow-inner transition-colors ${
              isDark ? 'border-[#333d52] bg-[#222a3a]' : 'border-stone-200 bg-stone-100/90'
            }`}
          >
            {servicios.map((s) => {
              const activo = servicioActivoId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onSeleccionarServicio(s.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    activo
                      ? isDark
                        ? 'bg-[#3b455c] text-indigo-200 shadow-sm border border-indigo-400/40'
                        : 'bg-white text-stone-900 shadow-sm border border-stone-200'
                      : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                >
                  {s.nombre}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Alternar tema visual"
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              isDark
                ? 'border-[#333d52] bg-[#222a3a] text-amber-300 hover:border-amber-400/40 hover:bg-[#2b3548]'
                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
