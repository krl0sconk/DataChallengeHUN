import React, { memo } from 'react';
import { HeartPulse } from 'lucide-react';

/**
 * Encabezado institucional accesible con alto contraste (WCAG AAA) y selector de servicio asistencial.
 */
export const Header = memo(function Header({
  servicios,
  servicioActivoId,
  onSeleccionarServicio,
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-700/80 bg-[#0c1530]/95 backdrop-blur-md px-6 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/50 bg-sky-500/15 text-sky-300 shadow-lg shadow-sky-500/20"
            aria-hidden="true"
          >
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white font-heading">
                Hospital Universidad del Norte
              </h1>
              <span className="rounded-full border border-sky-400/40 bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-sky-200">
                Data Challenge 2026
              </span>
            </div>
            <p className="text-xs font-medium text-slate-300 mt-0.5">
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        {/* Selector de servicio accesible */}
        <div
          role="radiogroup"
          aria-label="Seleccionar servicio hospitalario"
          className="flex items-center rounded-xl border border-slate-700 bg-[#121c3b] p-1.5 shadow-inner"
        >
          {servicios.map((s) => {
            const isSelected = servicioActivoId === s.id;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSeleccionarServicio(s.id)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
