import { Activity, BookOpen, HeartPulse, HelpCircle, Moon, Sun } from 'lucide-react';

export function Header({
  tabActiva,
  onCambiarTab,
  isDark,
  onToggleTheme,
  isApiConnected,
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#D6E0C2] dark:border-[#1B524F] bg-[#FAFCF6] dark:bg-[#071D22] backdrop-blur-md px-6 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Identidad Hospitalaria */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E3ECCB] dark:bg-[#12544F] text-[#2D283E] dark:text-[#C4E5CA]">
            <HeartPulse className="h-6 w-6 text-[#1E4D57] dark:text-[#A8E2AF]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-extrabold font-heading text-[#2D283E] dark:text-[#C4E5CA]">
                Hospital Universidad del Norte
              </h1>
              <span className="rounded-full bg-[#E3ECCB] dark:bg-[#12544F] border border-[#7CB592] dark:border-[#206E4E] px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-[#1E4D57] dark:text-[#A8E2AF]">
                Data Challenge 2026
              </span>
            </div>
            <p className="text-xs font-semibold text-[#2D283E] dark:text-[#C4E5CA] mt-0.5">
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        {/* Estado del Servicio + Navegación Principal y Tema */}
        <div className="flex items-center gap-3">
          {/* Indicador sutil de conexión institucional */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isApiConnected
                ? 'bg-[#EEF7F1] dark:bg-[#12544F] text-[#0E4222] dark:text-[#8AE6A2] border-[#7CB592] dark:border-[#1B524F]'
                : 'bg-[#FEF9E2] dark:bg-[#201B0E] text-[#704200] dark:text-[#FFDF80] border-[#DFC264] dark:border-[#7A5A00]'
            }`}
            title={
              isApiConnected
                ? 'Servicio de pronóstico en línea'
                : 'Servicio de pronóstico no disponible'
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isApiConnected ? 'bg-[#1E6B3F] dark:bg-[#4ADE80] animate-pulse' : 'bg-[#B26B00]'
              }`}
            />
            <span className="text-[11px] font-medium">
              {isApiConnected ? 'Modelo en línea' : 'Servicio desconectado'}
            </span>
          </div>

          <nav className="flex items-center rounded-2xl border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] p-1 shadow-2xs">
            <button
              onClick={() => onCambiarTab('panel')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                tabActiva === 'panel'
                  ? 'bg-[#2D283E] dark:bg-[#206E4E] text-[#FAFCF6] shadow-sm'
                  : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB] dark:hover:bg-[#071D22]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Monitor</span>
            </button>
            <button
              onClick={() => onCambiarTab('notebook')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                tabActiva === 'notebook'
                  ? 'bg-[#2D283E] dark:bg-[#206E4E] text-[#FAFCF6] shadow-sm'
                  : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB] dark:hover:bg-[#071D22]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Análisis de Flujo</span>
            </button>
            <button
              onClick={() => onCambiarTab('metodologia')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                tabActiva === 'metodologia'
                  ? 'bg-[#2D283E] dark:bg-[#206E4E] text-[#FAFCF6] shadow-sm'
                  : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB] dark:hover:bg-[#071D22]'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Guía HUN</span>
            </button>
          </nav>

          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB] dark:hover:bg-[#071D22] transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="h-4 w-4 text-[#FFD875]" /> : <Moon className="h-4 w-4 text-[#2D283E]" />}
          </button>
        </div>
      </div>
    </header>
  );
}
