import { useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { getTurnos } from '../lib/api';
import { SectionPanel } from './SectionPanel';

const FRANJAS_DEFAULT = [
  'Madrugada (00-06h)',
  'Mañana (06-12h)',
  'Tarde (12-18h)',
  'Noche (18-24h)',
];
const DIAS_DEFAULT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ORDEN_TURNOS = ['Madrugada', 'Mañana', 'Tarde', 'Noche'];

// Diccionario en memoria que almacena las matrices descargadas (0ms de latencia en cambios de tab)
const turnosCache = {};

function getIntensityKey(celda) {
  if (celda?.nivel === 'rojo') return 'pico';
  if (celda?.nivel === 'amarillo') return 'alerta';
  if (Number(celda?.estimado) === 0 || Number(celda?.ratio) < 0.5) return 'valle';
  return 'normal';
}

function getCellStyles(intensityKey, isDark) {
  if (intensityKey === 'pico') {
    return isDark
      ? 'bg-[#7F1D26] text-[#FFE4E6] border-[#B4323F] font-semibold'
      : 'bg-[#9E1C1C] text-white border-[#7F1515] font-semibold';
  }
  if (intensityKey === 'alerta') {
    return isDark
      ? 'bg-[#3B290C] text-[#FDE68A] border-[#8A611B] font-semibold'
      : 'bg-[#FEF5E6] text-[#7A3803] border-[#ECC98B] font-semibold';
  }
  if (intensityKey === 'normal') {
    return isDark
      ? 'bg-[#0D3438] text-[#7BE3DA] border-[#1D6362] font-medium'
      : 'bg-[#E3F4F2] text-[#074D4A] border-[#99D5CE] font-medium';
  }
  return isDark
    ? 'bg-[#122532] text-[#A6C2D0] border-[#1F3C4D] font-normal'
    : 'bg-[#F3F6F8] text-[#385262] border-[#D4DFE6] font-normal';
}

const LEYENDA_PASOS = [
  { key: 'valle', etiqueta: 'Valle (< 0.50×)' },
  { key: 'normal', etiqueta: 'Normal (0.50×–0.84×)' },
  { key: 'alerta', etiqueta: 'Alerta (0.85×–1.25×)' },
  { key: 'pico', etiqueta: 'Pico (> 1.25×)' },
];

export function HeatmapTurnos({ servicio, isDark }) {
  const [respuesta, setRespuesta] = useState(() => ({
    servicioId: servicio.id,
    datos: turnosCache[servicio.id] || null,
  }));
  const [error, setError] = useState(null);
  const datosTurnos = respuesta.servicioId === servicio.id ? respuesta.datos : null;

  // Consulta al backend para obtener la matriz calculada en el servidor (con caché en memoria)
  useEffect(() => {
    let cancelado = false;
    setError(null);
    setRespuesta({ servicioId: servicio.id, datos: null });

    if (turnosCache[servicio.id]) {
      setRespuesta({ servicioId: servicio.id, datos: turnosCache[servicio.id] });
      return;
    }

    async function cargarTurnos() {
      try {
        const data = await getTurnos(servicio.id);
        turnosCache[servicio.id] = data;
        if (!cancelado) setRespuesta({ servicioId: servicio.id, datos: data });
      } catch {
        if (!cancelado) setError('No se pudo cargar la matriz de turnos para este servicio.');
      }
    }
    cargarTurnos();
    return () => {
      cancelado = true;
    };
  }, [servicio.id]);

  const franjas = datosTurnos?.franjas || FRANJAS_DEFAULT;
  const dias = datosTurnos?.dias || DIAS_DEFAULT;
  const matriz = datosTurnos?.matriz || [];

  const filasOrdenadas = useMemo(() => {
    if (!matriz.length) return [];
    return franjas
      .map((franja, idx) => {
        const rank = ORDEN_TURNOS.findIndex((prefijo) =>
          String(franja).toLowerCase().startsWith(prefijo.toLowerCase()),
        );
        return {
          franja,
          celdas: matriz[idx] || [],
          orden: rank === -1 ? ORDEN_TURNOS.length + idx : rank,
        };
      })
      .sort((a, b) => a.orden - b.orden);
  }, [franjas, matriz]);

  const picoTurno = useMemo(() => {
    let mejor = null;
    for (const fila of filasOrdenadas) {
      for (let dIdx = 0; dIdx < fila.celdas.length; dIdx += 1) {
        const celda = fila.celdas[dIdx];
        const estimado = Number(celda?.estimado) || 0;
        const ratio = Number(celda?.ratio) || 0;
        if (
          !mejor ||
          estimado > mejor.estimado ||
          (estimado === mejor.estimado && ratio > mejor.ratio)
        ) {
          mejor = {
            dia: celda?.dia || dias[dIdx] || '',
            franja: fila.franja,
            estimado,
            ratio,
          };
        }
      }
    }
    return mejor;
  }, [filasOrdenadas, dias]);

  const peakCallout = picoTurno ? (
    <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--mf-surface-2)] px-3 py-1.5 text-xs text-[var(--mf-ink-2)]">
      <Flame className="h-3.5 w-3.5 text-[var(--mf-crit)] shrink-0" aria-hidden="true" />
      <span>Pico semanal:</span>
      <strong className="font-semibold text-[var(--mf-ink)]">
        {picoTurno.dia} · {picoTurno.franja}
      </strong>
      <span className="font-mono-num font-semibold text-[var(--mf-crit)]">
        ({picoTurno.estimado} pac.)
      </span>
    </div>
  ) : null;

  return (
    <SectionPanel
      id="heatmap-turnos"
      title={`Afluencia por turno en ${servicio.nombre}`}
      subtitle="Promedio histórico de llegadas por guardia de 6 horas y día de la semana frente a la media por franja."
      actions={peakCallout}
    >
      {!datosTurnos && !error && (
        <div role="status" aria-busy="true" className="space-y-3">
          <span className="sr-only">Cargando matriz del servicio…</span>
          <div className="mf-skeleton h-8 w-full" />
          <div className="mf-skeleton h-14 w-full" />
          <div className="mf-skeleton h-14 w-full" />
          <div className="mf-skeleton h-14 w-full" />
          <div className="mf-skeleton h-14 w-full" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--mf-warn-border)] bg-[var(--mf-warn-soft)] p-4 text-sm text-[var(--mf-warn)]"
        >
          {error}
        </div>
      )}

      {datosTurnos && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--mf-ink-2)]">
            {LEYENDA_PASOS.map((paso) => (
              <span key={paso.key} className="inline-flex items-center gap-2 font-medium">
                <span
                  aria-hidden="true"
                  className={`inline-block h-3.5 w-3.5 rounded border ${getCellStyles(paso.key, isDark)}`}
                />
                <span>{paso.etiqueta}</span>
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-1.5 text-center text-xs">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-2.5 py-2 text-left text-xs font-semibold text-[var(--mf-ink-2)]"
                  >
                    Guardia horaria
                  </th>
                  {dias.map((dia) => (
                    <th
                      key={dia}
                      scope="col"
                      className="px-2 py-2 text-center text-xs font-semibold text-[var(--mf-ink)]"
                    >
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasOrdenadas.map((fila) => (
                  <tr key={fila.franja}>
                    <th
                      scope="row"
                      className="whitespace-nowrap px-2.5 py-2 text-left text-xs font-semibold text-[var(--mf-ink)]"
                    >
                      {fila.franja}
                    </th>
                    {fila.celdas.map((celda, dIdx) => {
                      const intensity = getIntensityKey(celda);
                      const cellClasses = getCellStyles(intensity, isDark);
                      const ratioVal = Number(celda?.ratio);
                      const ratioLabel = Number.isFinite(ratioVal)
                        ? `${ratioVal.toFixed(2)}× promedio`
                        : '';
                      return (
                        <td key={`${fila.franja}-${dias[dIdx] || dIdx}`} className="p-0">
                          <div
                            className={`rounded-lg border px-2 py-2.5 transition-colors ${cellClasses}`}
                            title={`${celda?.dia || dias[dIdx]} · ${fila.franja}: ${celda?.estimado ?? 0} pacientes (${ratioLabel})`}
                          >
                            <span className="block font-mono-num text-sm leading-tight">
                              {celda?.estimado ?? 0}
                            </span>
                            <span className="mt-0.5 block text-xs leading-tight opacity-90">
                              pac.
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mf-border)] pt-3 text-xs text-[var(--mf-ink-2)]">
            <p className="max-w-[68ch]">
              Referencia por razón frente al promedio por franja del servicio. Las celdas en rojo indican congestión superior a 1.25× donde conviene reforzar admisión y triage.
            </p>
            {picoTurno && (
              <span className="font-mono-num font-medium text-[var(--mf-ink)] shrink-0">
                Máximo: {picoTurno.dia} · {picoTurno.ratio.toFixed(2)}×
              </span>
            )}
          </footer>
        </>
      )}
    </SectionPanel>
  );
}
