import { Activity, Stethoscope, Zap } from 'lucide-react';

const ICONOS_SERVICIO = {
  urgencias: Activity,
  rehabilitacion: Stethoscope,
  tratamiento_urgencia: Zap,
};

export function NavTabs({ servicios = [], servicioActivoId, onSeleccionarServicio }) {
  return (
    <nav className="border-b border-[#D6E0C2] dark:border-[#1B524F] bg-[#F4F9EA] dark:bg-[#0E3539] px-6 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto py-1">
        <div className="flex gap-3 py-1">
          {servicios.map((s) => {
            const activo = servicioActivoId === s.id;
            const Icono = ICONOS_SERVICIO[s.id] || Activity;

            return (
              <button
                key={s.id}
                onClick={() => onSeleccionarServicio(s.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activo
                    ? 'border-[#235863] dark:border-[#98D8A0] bg-white dark:bg-[#071D22] text-[#1E4D57] dark:text-[#A8E2AF] shadow-sm ring-1 ring-[#235863]/30'
                    : 'border-[#CAD5B2]/60 dark:border-[#184F4C] text-[#2D283E] dark:text-[#C4E5CA] hover:bg-white dark:hover:bg-[#071D22] hover:border-[#235863]'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors ${
                    activo
                      ? 'bg-[#235863] dark:bg-[#206E4E] text-white'
                      : 'bg-[#E3ECCB] dark:bg-[#12544F] text-[#1E4D57] dark:text-[#A8E2AF]'
                  }`}
                >
                  <Icono className="h-4 w-4" />
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-heading font-extrabold text-[13px]">{s.nombre}</span>
                    {activo && (
                      <span className="h-2 w-2 rounded-full bg-[#1E6B3F] dark:bg-[#4ADE80] animate-pulse" title="Servicio activo" />
                    )}
                  </div>
                  <span className={`text-[10px] font-mono block mt-0.5 font-semibold ${
                    activo
                      ? 'text-[#235863] dark:text-[#A8E2AF]'
                      : 'text-[#3E3854] dark:text-[#A8D4AE]'
                  }`}>
                    {s.codigo} · ~{s.mediaDiaria} pac/día
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] font-bold text-[#2D283E] dark:text-[#C4E5CA] bg-white dark:bg-[#071D22] px-3.5 py-1.5 rounded-xl border border-[#D6E0C2] dark:border-[#1B524F] shadow-2xs">
          <span>Área activa:</span>
          <strong className="text-[#1E4D57] dark:text-[#A8E2AF] uppercase tracking-wide">
            {servicios.find((s) => s.id === servicioActivoId)?.nombre || 'Urgencias'}
          </strong>
        </div>
      </div>
    </nav>
  );
}
