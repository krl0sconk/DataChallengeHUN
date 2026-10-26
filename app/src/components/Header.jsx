import React, { memo } from 'react';
import { HeartPulse } from 'lucide-react';

/**
 * Header institucional cálido y accesible con contraste AAA y estilo cozy.
 */
export const Header = memo(function Header({
  servicios,
  servicioActivoId,
  onSeleccionarServicio,
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#fdfbf7]/90 backdrop-blur-md px-6 py-4 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-100/70 text-sky-700 shadow-xs"
            aria-hidden="true"
          >
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 font-heading">
                Hospital Universidad del Norte
              </h1>
              <span className="rounded-full border border-sky-300 bg-sky-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-sky-900">
                Data Challenge 2026
              </span>
            </div>
            <p className="text-xs font-semibold text-stone-600 mt-0.5">
              Centro de Control y Pronóstico de Demanda Asistencial
            </p>
          </div>
        </div>

        {/* Selector de servicio estilo pill cálido */}
        <div
          role="radiogroup"
          aria-label="Seleccionar servicio hospitalario"
          className="flex items-center rounded-2xl border border-stone-200 bg-stone-100/90 p-1 shadow-inner"
        >
          {servicios.map((s) => {
            const isSelected = servicioActivoId === s.id;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSeleccionarServicio(s.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
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
