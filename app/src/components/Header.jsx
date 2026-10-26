import React, { memo } from 'react';
import { HeartPulse } from 'lucide-react';

/**
 * Encabezado institucional accesible con selector de servicio asistencial.
 */
export const Header = memo(function Header({
  servicios,
  servicioActivoId,
  onSeleccionarServicio,
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0d1631]/90 backdrop-blur px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/40 bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-500/10"
            aria-hidden="true"
          >
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Hospital Universidad del Norte
              </h1>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-400">
                Data Challenge 2026
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        {/* Selector de servicio accesible */}
        <div
          role="radiogroup"
          aria-label="Seleccionar servicio hospitalario"
          className="flex items-center rounded-xl border border-slate-700/60 bg-[#131f42] p-1 shadow-inner"
        >
          {servicios.map((s) => {
            const isSelected = servicioActivoId === s.id;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSeleccionarServicio(s.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 font-semibold text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
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
});
