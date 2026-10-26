import { HeartPulse, Moon, Sun } from 'lucide-react';

export function Header({ servicios, servicioActivoId, onSeleccionarServicio, isDark, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#EDF3DC] dark:border-[#52525E] bg-[#FAFCF6]/90 dark:bg-[#37353E]/95 backdrop-blur-md px-6 py-4 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1F7D4] dark:bg-[#44444E] text-[#4A4466] dark:text-[#D3DAD9]">
            <HeartPulse className="h-6 w-6 text-[#3B7D8C] dark:text-[#9FCBAD]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-heading text-[#4A4466] dark:text-[#D3DAD9]">
                Hospital Universidad del Norte
              </h1>
              <span className="rounded-full bg-[#F1F7D4] dark:bg-[#44444E] border border-[#9FCBAD] dark:border-[#715A5A] px-2.5 py-0.5 text-xs font-bold uppercase text-[#3B7D8C] dark:text-[#D3DAD9]">
                Data Challenge 2026
              </span>
            </div>
            <p className="text-xs font-medium text-[#4A4466]/80 dark:text-[#D3DAD9]/75 mt-0.5">
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-[#EDF3DC] dark:border-[#52525E] bg-white dark:bg-[#44444E] p-1 shadow-2xs">
            {servicios.map((s) => {
              const activo = servicioActivoId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onSeleccionarServicio(s.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    activo
                      ? 'bg-[#4A4466] dark:bg-[#715A5A] text-[#F1F7D4] dark:text-[#D3DAD9] shadow-sm'
                      : 'text-[#4A4466] dark:text-[#D3DAD9]/80 hover:bg-[#F1F7D4]/60 dark:hover:bg-[#37353E]'
                  }`}
                >
                  {s.nombre}
                </button>
              );
            })}
          </div>

          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#EDF3DC] dark:border-[#52525E] bg-white dark:bg-[#44444E] text-[#4A4466] dark:text-[#D3DAD9] hover:bg-[#F1F7D4]/50 dark:hover:bg-[#37353E] transition-colors"
          >
            {isDark ? <Sun className="h-5 w-5 text-[#F1F7D4]" /> : <Moon className="h-5 w-5 text-[#4A4466]" />}
          </button>
        </div>
      </div>
    </header>
  );
}
