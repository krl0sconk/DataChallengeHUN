import { Activity, CircleGauge, CircleHelp, Moon, Sun, WandSparkles } from 'lucide-react';

export function Header({
  tabActiva,
  onCambiarTab,
  isDark,
  onToggleTheme,
  isApiConnected,
}) {
  return (
    <header className="hun-topbar sticky top-0 z-50 border-b border-[#0B3045] bg-[#102A43] px-6 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex w-full flex-wrap items-center justify-between gap-3">
        {/* Identidad Hospitalaria */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="hun-logo-frame flex h-20 w-48 shrink-0 items-center px-1 pb-2 pt-1 sm:h-[5.25rem] sm:w-52">
            <img
              src="/logo-hospital-universidad-del-norte-light.png"
              alt="Hospital Universidad del Norte"
              className="hun-logo h-full w-full object-contain"
            />
          </div>
          <div className="hun-brand-copy min-w-0">
            <div className="hun-brand-title flex items-center gap-2.5">
              <h1 className="text-lg font-extrabold font-heading text-[#102A43] dark:text-[#D8EFF7]">
                Hospital Universidad del Norte
              </h1>
              <span className="hun-challenge-badge rounded-full bg-[#DCEFF7] dark:bg-[#0E3E5B] border border-[#71B5CC] dark:border-[#176D98] px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-[#14516B] dark:text-[#B9E2F0]">
                Data Challenge 2026
              </span>
            </div>
            <p className="text-xs font-semibold text-[#102A43] dark:text-[#D8EFF7] mt-0.5">
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        {/* Estado del Servicio + Navegación Principal y Tema */}
        <div className="hun-header-actions flex items-center gap-3">
          {/* Indicador sutil de conexión institucional */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isApiConnected
                ? 'bg-[#E8F6FA] dark:bg-[#0E3E5B] text-[#0C4A62] dark:text-[#9FE4F5] border-[#71B5CC] dark:border-[#19506B]'
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
                isApiConnected ? 'bg-[#187A9D] dark:bg-[#4ADE80] animate-pulse' : 'bg-[#B26B00]'
              }`}
            />
            <span className="text-[11px] font-medium">
              {isApiConnected ? 'Modelo en línea' : 'Servicio desconectado'}
            </span>
          </div>

          <nav aria-label="Preguntas principales" className="hun-question-nav flex items-center rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] p-1 shadow-2xs">
            <button
              onClick={() => onCambiarTab('hoy')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                tabActiva === 'hoy'
                  ? 'bg-[#102A43] dark:bg-[#176D98] text-[#F7FAFC] shadow-sm'
                  : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7] dark:hover:bg-[#071B2A]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>¿Cómo viene hoy?</span>
            </button>
            <button
              onClick={() => onCambiarTab('atascos')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                tabActiva === 'atascos'
                  ? 'bg-[#102A43] dark:bg-[#176D98] text-[#F7FAFC] shadow-sm'
                  : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7] dark:hover:bg-[#071B2A]'
              }`}
            >
              <CircleGauge className="h-3.5 w-3.5" />
              <span>¿Dónde se atasca?</span>
            </button>
            <button
              onClick={() => onCambiarTab('simulador')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                tabActiva === 'simulador'
                  ? 'bg-[#102A43] dark:bg-[#176D98] text-[#F7FAFC] shadow-sm'
                  : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7] dark:hover:bg-[#071B2A]'
              }`}
            >
              <WandSparkles className="h-3.5 w-3.5" />
              <span>¿Qué pasa si?</span>
            </button>
            <button
              onClick={() => onCambiarTab('precision')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                tabActiva === 'precision'
                  ? 'bg-[#102A43] dark:bg-[#176D98] text-[#F7FAFC] shadow-sm'
                  : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7] dark:hover:bg-[#071B2A]'
              }`}
            >
              <CircleHelp className="h-3.5 w-3.5" />
              <span>¿Qué tan preciso?</span>
            </button>
          </nav>

          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7] dark:hover:bg-[#071B2A] transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="h-4 w-4 text-[#FFD875]" /> : <Moon className="h-4 w-4 text-[#102A43]" />}
          </button>
        </div>
      </div>
    </header>
  );
}

