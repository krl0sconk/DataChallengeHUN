/**
 * FlowBandBar — elemento visual firma de MediFlow.
 * Muestra de un vistazo la presión asistencial sobre bandas proporcionales
 * Normal (< p75), Alerta (p75–p90) y Saturación (>= p90), más rango p10–p90 opcional.
 */
export function FlowBandBar({
  value = 0,
  p75 = 0,
  p90 = 0,
  min = null,
  max = null,
  unit = 'pac./día',
  compact = false,
  label = 'Presión asistencial',
}) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const safeP75 = Number.isFinite(Number(p75)) && Number(p75) > 0 ? Number(p75) : 1;
  const safeP90 = Math.max(safeP75, Number.isFinite(Number(p90)) ? Number(p90) : safeP75);
  const safeMaxRange = Number.isFinite(Number(max)) ? Number(max) : safeValue;
  const safeMinRange = Number.isFinite(Number(min)) ? Number(min) : null;

  const scaleMax = Math.max(
    Math.ceil(safeP90 * 1.25),
    Math.ceil(safeValue * 1.12),
    Math.ceil(safeMaxRange * 1.08),
    1,
  );

  const wNormal = (safeP75 / scaleMax) * 100;
  const wWarn = ((safeP90 - safeP75) / scaleMax) * 100;
  const wCrit = Math.max(0, 100 - wNormal - wWarn);

  const valuePct = Math.min(99, Math.max(1, (safeValue / scaleMax) * 100));
  const hasInterval = safeMinRange !== null && Number.isFinite(Number(max)) && Number(max) >= safeMinRange;
  const rangeLeft = hasInterval ? Math.min(100, Math.max(0, (safeMinRange / scaleMax) * 100)) : 0;
  const rangeWidth = hasInterval
    ? Math.max(1.5, Math.min(100 - rangeLeft, ((Number(max) - safeMinRange) / scaleMax) * 100))
    : 0;

  const nivel = safeValue >= safeP90 ? 'rojo' : safeValue >= safeP75 ? 'amarillo' : 'verde';
  const markerColor =
    nivel === 'rojo'
      ? 'bg-[var(--mf-crit)]'
      : nivel === 'amarillo'
        ? 'bg-[var(--mf-warn)]'
        : 'bg-[var(--mf-accent)]';

  return (
    <div className="w-full" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={scaleMax} aria-valuenow={Math.round(safeValue)}>
      <div className={`relative w-full ${compact ? 'h-2.5' : 'h-3'} rounded-full bg-[var(--mf-surface-2)] overflow-visible`}>
        {/* Zonas proporcionales de umbral */}
        <div className="flex h-full w-full overflow-hidden rounded-full">
          <div
            style={{ width: `${wNormal.toFixed(2)}%` }}
            className="h-full bg-[var(--mf-ok-soft)] border-r border-[var(--mf-ok-border)]"
          />
          <div
            style={{ width: `${wWarn.toFixed(2)}%` }}
            className="h-full bg-[var(--mf-warn-soft)] border-r border-[var(--mf-warn-border)]"
          />
          <div
            style={{ width: `${wCrit.toFixed(2)}%` }}
            className="h-full bg-[var(--mf-crit-soft)]"
          />
        </div>

        {/* Intervalo p10–p90 si está disponible */}
        {hasInterval && (
          <div
            style={{ left: `${rangeLeft.toFixed(2)}%`, width: `${rangeWidth.toFixed(2)}%` }}
            className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-full bg-[var(--mf-ink)]/20 dark:bg-white/25"
            title={`Rango p10–p90: ${Math.round(safeMinRange)}–${Math.round(Number(max))} ${unit}`}
          />
        )}

        {/* Marcador exacto del valor actual */}
        <div
          style={{ left: `${valuePct.toFixed(2)}%` }}
          className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${
            compact ? 'h-4 w-1.5' : 'h-5 w-2'
          } rounded-full ${markerColor} ring-2 ring-[var(--mf-surface)]`}
          title={`${Math.round(safeValue)} ${unit}`}
        />
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--mf-ink-3)] font-mono-num">
          <span>0</span>
          <div className="flex items-center gap-3">
            <span>p75: <strong className="font-semibold text-[var(--mf-ink-2)]">{Math.round(safeP75)}</strong></span>
            <span>p90: <strong className="font-semibold text-[var(--mf-ink-2)]">{Math.round(safeP90)}</strong></span>
          </div>
          <span>{Math.round(scaleMax)} {unit}</span>
        </div>
      )}
    </div>
  );
}
