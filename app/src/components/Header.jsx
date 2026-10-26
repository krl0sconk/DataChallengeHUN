import { HeartPulse } from 'lucide-react';

export function Header({ servicios, servicioActivoId, onSeleccionarServicio }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#FFEBB8] bg-[#FFFDF9]/90 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFEBB8] text-[#601D49]">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-heading text-[#601D49]">
                Hospital Universidad del Norte
              </h1>
              <span className="rounded-full bg-[#EA9D9D]/30 border border-[#EA9D9D] px-2.5 py-0.5 text-xs font-bold uppercase text-[#601D49]">
                Data Challenge 2026
              </span>
            </div>
            <p className="text-xs font-medium text-[#BD5579] mt-0.5">
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        <div className="flex items-center rounded-2xl border border-[#FFEBB8] bg-[#FFF9ED] p-1">
          {servicios.map((s) => {
            const activo = servicioActivoId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSeleccionarServicio(s.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activo
                    ? 'bg-[#601D49] text-[#FFEBB8] shadow-sm'
                    : 'text-[#601D49] hover:bg-[#FFEBB8]/50'
                }`}
              >
                {s.nombre}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
