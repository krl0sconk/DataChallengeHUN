import { Activity, Stethoscope, Zap } from 'lucide-react';

const ICONOS_SERVICIO = {
  urgencias: Activity,
  rehabilitacion: Stethoscope,
  tratamiento_urgencia: Zap,
};

export function NavTabs({ servicios = [], servicioActivoId, onSeleccionarServicio }) {
  return (
    <nav aria-label="Servicios" className="border-b border-[#B7C8D5] bg-white px-6 transition-colors dark:border-[#19506B] dark:bg-[#071B2A]">
      <div className="mx-auto flex max-w-7xl overflow-x-auto">
        <div className="flex min-w-full">
          {servicios.map((s) => {
            const activo = servicioActivoId === s.id;
            const Icono = ICONOS_SERVICIO[s.id] || Activity;

            return (
              <button
                key={s.id}
                onClick={() => onSeleccionarServicio(s.id)}
                className={`relative flex min-w-[13rem] flex-1 items-center gap-3 border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activo
                    ? 'border-[#0F2942] bg-transparent text-[#0F2942] dark:border-[#B9E2F0] dark:text-[#D8EFF7]'
                    : 'border-transparent bg-transparent text-[#294B63] hover:text-[#0F2942] dark:text-[#B9E2F0] dark:hover:text-white'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    activo
                      ? 'bg-[#14516B] dark:bg-[#176D98] text-white'
                      : 'bg-[#DCEFF7] dark:bg-[#0E3E5B] text-[#14516B] dark:text-[#B9E2F0]'
                  }`}
                >
                  <Icono className="h-4 w-4" />
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-heading font-extrabold text-[13px]">{s.nombre}</span>
                    {activo && (
                      <span className="h-2 w-2 rounded-full bg-[#187A9D] dark:bg-[#4ADE80] animate-pulse" title="Servicio activo" />
                    )}
                  </div>
                  <span className={`text-[10px] font-mono block mt-0.5 font-semibold ${
                    activo
                      ? 'text-[#14516B] dark:text-[#B9E2F0]'
                      : 'text-[#294B63] dark:text-[#B9E2F0]'
                  }`}>
                    {s.codigo} · ~{s.mediaDiaria} pac/día
                  </span>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </nav>
  );
}

