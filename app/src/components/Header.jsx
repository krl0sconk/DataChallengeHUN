import { HeartPulse } from 'lucide-react';

export function Header({ servicios, servicioActivoId, onSeleccionarServicio }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#EDF3DC] bg-[#FAFCF6]/90 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1F7D4] text-[#4A4466]">
            <HeartPulse className="h-6 w-6 text-[#3B7D8C]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-heading text-[#4A4466]">
                Hospital Universidad del Norte
              </h1>
              <span className="rounded-full bg-[#F1F7D4] border border-[#9FCBAD] px-2.5 py-0.5 text-xs font-bold uppercase text-[#3B7D8C]">
                Data Challenge 2026
              </span>
            </div>
            <p className="text-xs font-medium text-[#4A4466]/80 mt-0.5">
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        <div className="flex items-center rounded-2xl border border-[#EDF3DC] bg-white p-1 shadow-2xs">
          {servicios.map((s) => {
            const activo = servicioActivoId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSeleccionarServicio(s.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activo
                    ? 'bg-[#4A4466] text-[#F1F7D4] shadow-sm'
                    : 'text-[#4A4466] hover:bg-[#F1F7D4]/60'
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
