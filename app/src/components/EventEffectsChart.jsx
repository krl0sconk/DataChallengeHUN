import { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { getEfectosEventos } from '../lib/api';
import { SectionPanel } from './SectionPanel';

export function EventEffectsChart({ servicio }) {
  const [eventos, setEventos] = useState([]);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    let activo = true;
    setEstado('cargando');
    getEfectosEventos(servicio.id)
      .then((data) => {
        if (activo) {
          setEventos(Array.isArray(data.eventos) ? data.eventos : []);
          setEstado('ok');
        }
      })
      .catch(() => {
        if (activo) setEstado('error');
      });
    return () => {
      activo = false;
    };
  }, [servicio.id]);

  const escala = Math.max(
    ...eventos.flatMap((evento) => [Number(evento.media_normal || 0), Number(evento.media_evento || 0)]),
    1,
  );

  const leyenda = (
    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--mf-ink-2)]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-[var(--mf-series-2)]" aria-hidden="true" />
        Día normal
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-[var(--mf-warn)]" aria-hidden="true" />
        Aumento en evento
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-[var(--mf-accent)]" aria-hidden="true" />
        Descenso o estable
      </span>
    </div>
  );

  return (
    <SectionPanel
      id="efectos-eventos"
      title={
        <span className="inline-flex items-center gap-2">
          <span>Efectos históricos por evento</span>
          <span title="Promedios observados por la API, no una simulación" className="text-[var(--mf-ink-3)]">
            <CircleHelp className="h-4 w-4" aria-hidden="true" />
          </span>
        </span>
      }
      subtitle={`${servicio.nombre} · Promedio de llegadas observadas en el histórico clínico (no es una simulación).`}
      actions={leyenda}
    >
      {estado === 'cargando' && (
        <div className="space-y-3 py-2" role="status" aria-label="Cargando efectos históricos">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="grid gap-3 py-2 sm:grid-cols-[12rem_1fr_7rem] sm:items-center">
              <div className="mf-skeleton h-4 w-36" />
              <div className="space-y-2">
                <div className="mf-skeleton h-2.5 w-full" />
                <div className="mf-skeleton h-2.5 w-4/5" />
              </div>
              <div className="mf-skeleton h-6 w-24 sm:ml-auto" />
            </div>
          ))}
        </div>
      )}

      {estado === 'error' && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--mf-warn-border)] bg-[var(--mf-warn-soft)] p-4 text-sm text-[var(--mf-warn)]"
        >
          No se pudieron cargar los efectos históricos.
        </div>
      )}

      {estado === 'ok' && !eventos.length && (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--mf-ink-2)]">
          La API no devolvió eventos para este servicio.
        </div>
      )}

      {estado === 'ok' && eventos.length > 0 && (
        <div>
          <div className="hidden sm:grid sm:grid-cols-[minmax(12rem,1fr)_minmax(15rem,2fr)_8.5rem] items-center gap-4 border-b border-[var(--mf-border)] pb-2.5 text-xs font-semibold text-[var(--mf-ink-3)]">
            <span>Evento</span>
            <span>Comparativa de llegadas promedio</span>
            <span className="text-right">Impacto histórico</span>
          </div>

          <div className="divide-y divide-[var(--mf-border)]">
            {eventos.map((evento) => {
              const diferencia = Number(evento.cambio_visitas || 0);
              const porcentaje = Number(evento.cambio_pct || 0);
              const positivo = diferencia > 0;
              const critico = positivo && porcentaje >= 15;

              const anchoNormal = Math.max(2, (Number(evento.media_normal || 0) / escala) * 100);
              const anchoEvento = Math.max(2, (Number(evento.media_evento || 0) / escala) * 100);

              const barEventoColor = critico
                ? 'bg-[var(--mf-crit)]'
                : positivo
                  ? 'bg-[var(--mf-warn)]'
                  : 'bg-[var(--mf-accent)]';

              const badgeClase = critico
                ? 'mf-badge-crit'
                : positivo
                  ? 'mf-badge-warn'
                  : diferencia < 0
                    ? 'mf-badge-ok'
                    : 'border border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-ink-2)]';

              return (
                <article
                  key={evento.evento}
                  className="grid gap-3 py-3.5 first:pt-3 last:pb-1 sm:grid-cols-[minmax(12rem,1fr)_minmax(15rem,2fr)_8.5rem] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--mf-ink)]">{evento.etiqueta}</h3>
                    <p className="mt-0.5 text-xs text-[var(--mf-ink-3)] font-mono-num">
                      {evento.n_dias} días observados
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-xs text-[var(--mf-ink-2)]">
                      <span className="w-14 shrink-0">Normal</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--mf-surface-2)]">
                        <div
                          className="h-full rounded-full bg-[var(--mf-series-2)]"
                          style={{ width: `${anchoNormal}%` }}
                        />
                      </div>
                      <strong className="w-12 text-right font-mono-num font-semibold text-[var(--mf-ink)]">
                        {evento.media_normal}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-[var(--mf-ink-2)]">
                      <span className="w-14 shrink-0">Evento</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--mf-surface-2)]">
                        <div
                          className={`h-full rounded-full ${barEventoColor}`}
                          style={{ width: `${anchoEvento}%` }}
                        />
                      </div>
                      <strong className="w-12 text-right font-mono-num font-semibold text-[var(--mf-ink)]">
                        {evento.media_evento}
                      </strong>
                    </div>
                  </div>

                  <div className="flex sm:justify-end">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold font-mono-num ${badgeClase}`}
                    >
                      {diferencia > 0 ? '+' : ''}
                      {diferencia} ({porcentaje > 0 ? '+' : ''}
                      {porcentaje}%)
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </SectionPanel>
  );
}
