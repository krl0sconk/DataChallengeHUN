import { CircleHelp } from 'lucide-react';

export function BottleneckGauge({ value, p75, p90, label = 'Presión actual' }) {
  const pct = Math.max(0, Math.min(100, value));
  const angle = -90 + (pct * 180) / 100;
  const level = pct >= 90 ? 'rojo' : pct >= 75 ? 'amarillo' : 'verde';
  const levelText = { verde: 'Normal', amarillo: 'Vigilar', rojo: 'Crítico' }[level];

  return (
    <div className="rounded-2xl border border-[#D1DEE7] bg-[#F7FAFC] p-3 dark:border-[#19506B] dark:bg-[#071B2A]" title={`Verde < p75 (${p75}), amarillo p75–p90, rojo > p90 (${p90})`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#102A43] dark:text-[#D8EFF7]">{label}</span>
        <CircleHelp className="h-3.5 w-3.5 text-[#14516B] dark:text-[#B9E2F0]" />
      </div>
      <svg viewBox="0 0 160 92" className="mx-auto w-full max-w-[180px]" role="img" aria-label={`${pct}% de presión, nivel ${levelText}`}>
        <path d="M 16 80 A 64 64 0 0 1 144 80" fill="none" stroke="#A9D6B5" strokeWidth="14" strokeLinecap="round" />
        <path d="M 80 16 A 64 64 0 0 1 138 52" fill="none" stroke="#F0C86A" strokeWidth="14" />
        <path d="M 138 52 A 64 64 0 0 1 144 80" fill="none" stroke="#D96B78" strokeWidth="14" strokeLinecap="round" />
        <line x1="80" y1="80" x2="80" y2="27" stroke="#102A43" strokeWidth="4" strokeLinecap="round" transform={`rotate(${angle + 90} 80 80)`} />
        <circle cx="80" cy="80" r="6" fill="#102A43" />
      </svg>
      <div className="-mt-2 text-center">
        <strong className="font-mono-num text-2xl text-[#102A43] dark:text-[#D8EFF7]">{pct}%</strong>
        <p className={`text-xs font-extrabold ${level === 'rojo' ? 'text-[#A81F38]' : level === 'amarillo' ? 'text-[#8C5800]' : 'text-[#14516B]'}`}>{levelText}</p>
      </div>
    </div>
  );
}

