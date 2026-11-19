import { FlowBandBar } from './FlowBandBar';

function formatNumber(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return '0';
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

export function BottleneckGauge({
  value = 0,
  p75 = 0,
  p90 = 0,
  min = null,
  max = null,
  unidad = '',
  label = 'Presión actual',
}) {
  const val = Number.isFinite(Number(value)) ? Number(value) : 0;
  const umbral75 = Number.isFinite(Number(p75)) && Number(p75) > 0 ? Number(p75) : 1;
  const umbral90 = Math.max(umbral75, Number.isFinite(Number(p90)) ? Number(p90) : umbral75);

  const nivel = val >= umbral90 ? 'rojo' : val >= umbral75 ? 'amarillo' : 'verde';
  const estadoTexto = { verde: 'Normal', amarillo: 'Alerta', rojo: 'Saturación' }[nivel];
  const badgeClass = {
    verde: 'mf-badge-ok',
    amarillo: 'mf-badge-warn',
    rojo: 'mf-badge-crit',
  }[nivel];
  const deltaClass = {
    verde: 'text-[var(--mf-ok)]',
    amarillo: 'text-[var(--mf-warn)]',
    rojo: 'text-[var(--mf-crit)]',
  }[nivel];

  const deltaP75 = val - umbral75;
  const deltaPrefix = deltaP75 > 0 ? '+' : '';
  const hasInterval =
    min !== null &&
    max !== null &&
    Number.isFinite(Number(min)) &&
    Number.isFinite(Number(max));

  return (
    <article
      className="mf-panel flex flex-col justify-between gap-4 p-5 sm:p-6"
      title={`Normal < ${umbral75} · Alerta ${umbral75}–${umbral90} · Saturación >= ${umbral90}`}
    >
      <header className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-base font-semibold tracking-[-0.015em] text-[var(--mf-ink)]">
          {label}
        </h2>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
        >
          {estadoTexto}
        </span>
      </header>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2">
          <strong className="font-mono-num text-3xl sm:text-[2.125rem] font-semibold tracking-tight leading-none text-[var(--mf-ink)]">
            {formatNumber(val)}
          </strong>
          {unidad && (
            <span className="text-sm font-medium text-[var(--mf-ink-2)]">{unidad}</span>
          )}
        </div>

        <p className="font-mono-num text-xs font-medium text-[var(--mf-ink-2)]">
          <span>Δ vs p75: </span>
          <strong className={`font-semibold ${deltaClass}`}>
            {deltaPrefix}
            {formatNumber(deltaP75)}
          </strong>
        </p>
      </div>

      <FlowBandBar
        value={val}
        p75={umbral75}
        p90={umbral90}
        min={min}
        max={max}
        unit={unidad}
        label={label}
      />

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mf-border)] pt-3 text-xs text-[var(--mf-ink-2)] font-mono-num">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Alerta p75: <strong className="font-semibold text-[var(--mf-ink)]">{formatNumber(umbral75)}</strong>
          </span>
          <span>
            Saturación p90: <strong className="font-semibold text-[var(--mf-ink)]">{formatNumber(umbral90)}</strong>
          </span>
        </div>
        {hasInterval && (
          <span>
            Banda p10–p90:{' '}
            <strong className="font-semibold text-[var(--mf-ink)]">
              {Math.round(Number(min))}–{Math.round(Number(max))}
            </strong>
          </span>
        )}
      </footer>
    </article>
  );
}
