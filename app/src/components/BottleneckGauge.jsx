import { CircleHelp } from 'lucide-react';

function polarToCartesian(cx, cy, r, frac) {
  const angleRad = Math.PI * (1 - frac);
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy - r * Math.sin(angleRad),
  };
}

function arcPath(cx, cy, r, startFrac, endFrac) {
  if (endFrac <= startFrac) return '';
  const start = polarToCartesian(cx, cy, r, startFrac);
  const end = polarToCartesian(cx, cy, r, endFrac);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function BottleneckGauge({
  value = 0,
  p75 = 0,
  p90 = 0,
  unidad = '',
  label = 'Presión actual',
}) {
  const val = Number(value) || 0;
  const umbral75 = Number(p75) || 1;
  const umbral90 = Math.max(umbral75, Number(p90) || umbral75);
  const maxEscala = Math.max(Math.ceil(umbral90 * 1.25), Math.ceil(val * 1.15), 1);

  const angle = -90 + (Math.min(Math.max(val, 0), maxEscala) / maxEscala) * 180;
  const frac75 = Math.min(1, umbral75 / maxEscala);
  const frac90 = Math.min(1, umbral90 / maxEscala);

  const nivel = val >= umbral90 ? 'rojo' : val >= umbral75 ? 'amarillo' : 'verde';
  const estadoTexto = { verde: 'Normal', amarillo: 'Alerta', rojo: 'Saturación' }[nivel];
  const badgeClass = {
    verde: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    amarillo: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    rojo: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  }[nivel];

  const verdePath = arcPath(80, 80, 64, 0, frac75);
  const amarilloPath = arcPath(80, 80, 64, frac75, frac90);
  const rojoPath = arcPath(80, 80, 64, frac90, 1);

  return (
    <article
      className="rounded-xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80"
      title={`Normal < ${p75} · Alerta ${p75}–${p90} · Saturación >= ${p90}`}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{label}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${badgeClass}`}>
          {estadoTexto}
        </span>
      </header>

      <svg viewBox="0 0 160 92" className="mx-auto w-full max-w-[180px]" role="img" aria-label={`${val} ${unidad}, estado ${estadoTexto}`}>
        {verdePath && <path d={verdePath} fill="none" stroke="#10b981" strokeWidth="14" strokeLinecap="butt" />}
        {amarilloPath && <path d={amarilloPath} fill="none" stroke="#f59e0b" strokeWidth="14" strokeLinecap="butt" />}
        {rojoPath && <path d={rojoPath} fill="none" stroke="#e11d48" strokeWidth="14" strokeLinecap="butt" />}
        <line
          x1="80"
          y1="80"
          x2="80"
          y2="27"
          className="stroke-slate-900 dark:stroke-slate-100"
          strokeWidth="3.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 80 80)`}
        />
        <circle cx="80" cy="80" r="5.5" className="fill-slate-900 dark:fill-slate-100" />
      </svg>

      <div className="-mt-1 text-center">
        <div className="flex items-baseline justify-center gap-1.5">
          <strong className="font-mono text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {val}
          </strong>
          {unidad && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unidad}</span>
          )}
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <CircleHelp className="h-3 w-3 shrink-0" />
          <span>Alerta: {p75} · Crítico: {p90}</span>
        </p>
      </div>
    </article>
  );
}
