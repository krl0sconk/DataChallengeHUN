import { AlertTriangle, CheckCircle2, ShieldAlert, WifiOff } from 'lucide-react';
import { FlowBandBar } from './FlowBandBar';

export function StatCardGrid({
  alerta = {},
  prediccion = 0,
  p10 = 0,
  p90 = 0,
  servicio = {},
  isApiConnected = false,
  isLoading = false,
}) {
  const {
    etiqueta = 'NORMAL',
    accion = 'Operación dentro del comportamiento histórico esperado.',
    colorTexto = 'text-[var(--mf-ok)]',
    iconoColor = 'text-[var(--mf-ok)]',
    badgeClass = 'mf-badge-ok',
    nivel = 'verde',
  } = alerta;

  const p75Umbral = Number(servicio.p75) || 0;
  const p90Umbral = Number(servicio.p90) || 0;
  const mediaDiaria = Number(servicio.mediaDiaria) || 0;
  const deltaMediaPct = mediaDiaria > 0
    ? Math.round(((prediccion - mediaDiaria) / mediaDiaria) * 100)
    : null;
  const pctSobreP75 = p75Umbral > 0 ? Math.round((prediccion / p75Umbral) * 100) : null;

  let lecturaUmbral = 'Sin umbrales calibrados para el servicio.';
  if (isApiConnected && p75Umbral > 0) {
    if (prediccion >= p90Umbral && p90Umbral > 0) {
      lecturaUmbral = `Supera saturación p90 en +${prediccion - p90Umbral} pac./día.`;
    } else if (prediccion >= p75Umbral) {
      lecturaUmbral = `Sobre alerta p75 (+${prediccion - p75Umbral}); margen a p90: ${Math.max(0, p90Umbral - prediccion)} pac.`;
    } else {
      lecturaUmbral = `Margen bajo alerta p75: ${p75Umbral - prediccion} pac./día disponibles.`;
    }
  }

  return (
    <section
      aria-label="Resumen de capacidad y proyección diaria"
      className="mf-panel overflow-hidden"
    >
      <div className="grid grid-cols-1 divide-y divide-[var(--mf-border)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {/* Columna 1: Estado de capacidad y acción recomendada */}
        <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--mf-ink-2)]">
              Estado de capacidad
            </h2>
            {!isLoading && isApiConnected && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                {etiqueta}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2.5" aria-busy="true">
              <div className="mf-skeleton h-8 w-36" />
              <div className="mf-skeleton h-4 w-full" />
              <div className="mf-skeleton h-4 w-3/4" />
            </div>
          ) : isApiConnected ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {nivel === 'rojo' && <ShieldAlert className={`h-5 w-5 shrink-0 ${iconoColor}`} aria-hidden="true" />}
                  {nivel === 'amarillo' && <AlertTriangle className={`h-5 w-5 shrink-0 ${iconoColor}`} aria-hidden="true" />}
                  {nivel === 'verde' && <CheckCircle2 className={`h-5 w-5 shrink-0 ${iconoColor}`} aria-hidden="true" />}
                  <p className={`text-2xl font-bold tracking-tight ${colorTexto}`}>
                    {etiqueta}
                  </p>
                </div>
                <p className="text-sm leading-snug text-[var(--mf-ink-2)]">
                  {accion}
                </p>
              </div>

              <div className="border-t border-[var(--mf-border)] pt-3 text-xs text-[var(--mf-ink-3)] font-mono-num">
                Umbrales históricos de demanda: p75 ({p75Umbral}) · p90 ({p90Umbral})
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[var(--mf-ink-2)]">
                <WifiOff className="h-4 w-4 shrink-0 text-[var(--mf-warn)]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[var(--mf-ink)]">Sin conexión al motor</span>
              </div>
              <p className="text-xs text-[var(--mf-ink-2)]">
                Inicia el backend FastAPI para evaluar el nivel de saturación asistencial oficial.
              </p>
            </div>
          )}
        </div>

        {/* Columna 2: Proyección puntual p50 e intervalo p10–p90 */}
        <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--mf-ink-2)]">
              Proyección diaria (p50)
            </h2>
            {!isLoading && isApiConnected && deltaMediaPct !== null && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono-num ${
                  deltaMediaPct > 0 ? 'mf-badge-warn' : 'mf-badge-ok'
                }`}
              >
                {deltaMediaPct >= 0 ? '+' : ''}{deltaMediaPct}% vs media
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2.5" aria-busy="true">
              <div className="mf-skeleton h-9 w-28" />
              <div className="mf-skeleton h-4 w-44" />
              <div className="mf-skeleton h-4 w-full" />
            </div>
          ) : isApiConnected ? (
            <>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-num text-3xl sm:text-[2.125rem] font-semibold tracking-tight text-[var(--mf-ink)]">
                    {prediccion}
                  </span>
                  <span className="text-xs font-medium text-[var(--mf-ink-3)]">pac./día</span>
                </div>
                <p className="mt-1.5 text-xs text-[var(--mf-ink-2)]">
                  Media histórica: <span className="font-mono-num font-medium text-[var(--mf-ink)]">{mediaDiaria}</span> pac./día · <span className="font-mono-num">{servicio.codigo}</span>
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[var(--mf-border)] pt-3 text-xs text-[var(--mf-ink-2)]">
                <span>Banda de pronóstico (p10–p90)</span>
                <strong className="font-mono-num font-semibold text-[var(--mf-ink)]">
                  {p10} – {p90} pac.
                </strong>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <span className="font-mono-num text-3xl font-semibold text-[var(--mf-ink-3)]">---</span>
              <p className="text-xs text-[var(--mf-ink-2)]">
                Esperando respuesta del modelo de pronóstico para {servicio.nombre || 'el servicio'}.
              </p>
            </div>
          )}
        </div>

        {/* Columna 3: Firma FlowBandBar frente a umbrales p75 y p90 */}
        <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--mf-ink-2)]">
              Presión frente a umbrales
            </h2>
            {!isLoading && isApiConnected && pctSobreP75 !== null && (
              <span className="font-mono-num text-xs font-semibold text-[var(--mf-ink)]">
                {pctSobreP75}% de p75
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3" aria-busy="true">
              <div className="mf-skeleton h-3 w-full" />
              <div className="mf-skeleton h-4 w-2/3" />
              <div className="mf-skeleton h-4 w-full" />
            </div>
          ) : (
            <>
              <div className="py-1">
                <FlowBandBar
                  value={isApiConnected ? prediccion : 0}
                  p75={p75Umbral}
                  p90={p90Umbral}
                  min={isApiConnected ? p10 : null}
                  max={isApiConnected ? p90 : null}
                  unit="pac./día"
                  label={`Presión asistencial en ${servicio.nombre || 'servicio activo'}`}
                />
              </div>

              <div className="border-t border-[var(--mf-border)] pt-3 text-xs text-[var(--mf-ink-2)]">
                {isApiConnected
                  ? lecturaUmbral
                  : `Banda calibrada con umbrales p75 (${p75Umbral}) y p90 (${p90Umbral}).`}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
