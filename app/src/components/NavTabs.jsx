import { Activity, CalendarDays, HeartPulse, Stethoscope } from 'lucide-react';

const ICONOS_SERVICIO = {
  urgencias: HeartPulse,
  rehabilitacion: Stethoscope,
  tratamiento_urgencia: Activity,
};

export function NavTabs({
  servicios = [],
  servicioActivoId,
  onSeleccionarServicio,
  fechaSimulacion,
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-[var(--mf-border)] bg-[var(--mf-surface)] transition-colors">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <nav aria-label="Servicios asistenciales" className="flex items-center gap-1 overflow-x-auto">
          {servicios.map((s) => {
            const activo = servicioActivoId === s.id;
            const Icono = ICONOS_SERVICIO[s.id] || Activity;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSeleccionarServicio(s.id)}
                aria-pressed={activo}
                className={`relative flex shrink-0 items-center gap-2.5 border-b-2 px-3.5 py-3 text-left text-sm transition-colors cursor-pointer ${
                  activo
                    ? 'border-[var(--mf-accent)] text-[var(--mf-ink)] font-semibold'
                    : 'border-transparent text-[var(--mf-ink-2)] font-medium hover:text-[var(--mf-ink)] hover:border-[var(--mf-border-strong)]'
                }`}
              >
                <Icono
                  className={`h-4 w-4 shrink-0 ${
                    activo ? 'text-[var(--mf-accent)]' : 'text-[var(--mf-ink-3)]'
                  }`}
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap">{s.nombre}</span>
                <span
                  className={`hidden sm:inline font-mono-num text-xs ${
                    activo ? 'text-[var(--mf-accent-ink)] dark:text-[var(--mf-accent-ink)]' : 'text-[var(--mf-ink-3)]'
                  }`}
                >
                  {s.codigo}
                </span>
              </button>
            );
          })}
        </nav>

        {fechaSimulacion && (
          <div className="hidden md:flex items-center gap-2 py-2 text-xs text-[var(--mf-ink-2)]">
            <CalendarDays className="h-4 w-4 text-[var(--mf-ink-3)]" aria-hidden="true" />
            <span>Fecha base</span>
            <span className="rounded-md bg-[var(--mf-surface-2)] px-2 py-0.5 font-mono-num font-semibold text-[var(--mf-ink)]">
              {fechaSimulacion}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
