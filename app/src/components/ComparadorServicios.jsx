import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { getOcupacion } from '../lib/api';
import { FlowBandBar } from './FlowBandBar';
import { SectionPanel } from './SectionPanel';

// Diccionario en memoria para las métricas de ocupación (se descarga una sola vez)
let ocupacionCache = null;

export function ComparadorServicios({ servicios, servicioActivoId, onSeleccionarServicio, isDark }) {
  const [datosBackend, setDatosBackend] = useState(() => ocupacionCache);

  // Consulta al backend para obtener las métricas de ocupación ya calculadas
  useEffect(() => {
    let cancelado = false;

    if (ocupacionCache) {
      setDatosBackend(ocupacionCache);
      return;
    }

    async function cargarOcupacion() {
      try {
        const data = await getOcupacion();
        ocupacionCache = data;
        if (!cancelado) setDatosBackend(data);
      } catch {
        // Fallback local defensivo con catálogo de servicios
      }
    }
    cargarOcupacion();
    return () => {
      cancelado = true;
    };
  }, []);

  const lista = (datosBackend || Object.values(servicios).map((s) => ({
    id: s.id,
    nombreCorto: s.nombre.replace('Tratamiento Urgencias', 'Tratamiento Urg.'),
    nombreCompleto: s.nombre,
    codigo: s.codigo,
    mediaDiaria: s.mediaDiaria ?? 0,
    p75: s.p75 ?? 0,
    p90: s.p90 ?? 0,
  }))).map((item) => {
    const metaLocal = servicios[item.id] || {};
    const demanda = item.prediccion ?? item.mediaDiaria ?? 0;
    const p75 = item.p75 || 1;
    const p90 = item.p90 || 1;
    const pctAlerta = Math.round((demanda / p75) * 100);
    const nivel = demanda >= p90 ? 'rojo' : demanda >= p75 ? 'amarillo' : 'verde';
    const estado = nivel === 'rojo' ? 'SATURACIÓN' : nivel === 'amarillo' ? 'ALERTA' : 'NORMAL';
    const badgeClass = nivel === 'rojo'
      ? 'mf-badge-crit'
      : nivel === 'amarillo'
        ? 'mf-badge-warn'
        : 'mf-badge-ok';

    return {
      ...item,
      codigo: item.codigo || metaLocal.codigo,
      demanda,
      pctAlerta,
      nivel,
      estado,
      badgeClass,
      esActivo: item.id === servicioActivoId,
    };
  });

  const leyenda = (
    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--mf-ink-2)]" data-theme={isDark ? 'dark' : 'light'}>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[var(--mf-ok)]" />
        Normal (&lt; p75)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[var(--mf-warn)]" />
        Alerta (p75–p90)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[var(--mf-crit)]" />
        Saturación (≥ p90)
      </span>
    </div>
  );

  return (
    <SectionPanel
      id="comparador-servicios"
      title="Presión asistencial por servicio"
      subtitle="Afluencia proyectada frente a umbrales institucionales p75 y p90."
      actions={leyenda}
      noPadding
      className="h-full flex flex-col justify-between"
    >
      <div className="divide-y divide-[var(--mf-border)]" role="list" aria-label="Servicios asistenciales">
        {lista.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSeleccionarServicio(s.id)}
            aria-pressed={s.esActivo}
            className={`w-full px-5 py-4 text-left transition-colors cursor-pointer sm:px-6 ${
              s.esActivo
                ? 'bg-[var(--mf-accent-soft)]'
                : 'bg-transparent hover:bg-[var(--mf-surface-2)]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-[var(--mf-ink)]">
                  {s.nombreCorto}
                </span>
                {s.codigo && (
                  <span className="font-mono-num text-xs text-[var(--mf-ink-3)]">
                    {s.codigo}
                  </span>
                )}
                {s.esActivo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mf-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--mf-accent-ink)] border border-[var(--mf-border)]">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Activo
                  </span>
                )}
              </div>

              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.badgeClass}`}>
                {s.estado}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <span className="font-mono-num text-[var(--mf-ink)]">
                <strong className="text-base font-semibold">{s.demanda}</strong>{' '}
                <span className="text-[var(--mf-ink-2)]">pac./día</span>
              </span>
              <span className="font-mono-num text-[var(--mf-ink-2)]">
                <strong className="font-semibold text-[var(--mf-ink)]">{s.pctAlerta}%</strong> de p75 ({s.p75}) · p90: {s.p90}
              </span>
            </div>

            <div className="mt-2.5">
              <FlowBandBar
                compact
                value={s.demanda}
                p75={s.p75}
                p90={s.p90}
                label={`Presión asistencial en ${s.nombreCompleto || s.nombreCorto}`}
              />
            </div>
          </button>
        ))}
      </div>

      <footer className="border-t border-[var(--mf-border)] px-5 py-3 text-xs text-[var(--mf-ink-2)] sm:px-6">
        Selecciona un servicio para actualizar el pronóstico y los desgloses.
      </footer>
    </SectionPanel>
  );
}
