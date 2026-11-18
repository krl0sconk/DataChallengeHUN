import { Activity, CircleHelp, Clock3, Lightbulb, Target } from 'lucide-react';

const HALLAZGOS = [
  { icon: Activity, title: 'Presión en urgencias', text: 'Primera señal para revisar.', tone: 'blue' },
  { icon: Clock3, title: 'Pico por franja', text: 'Revisa el turno crítico.', tone: 'cyan' },
  { icon: Target, title: 'Referencia histórica', text: 'Compara contra p75 y p90.', tone: 'navy' },
];

export function HallazgosCards() {
  return (
    <section aria-labelledby="hallazgos-title" className="editorial-insights">
      <div className="grid items-center gap-3 px-6 py-4 lg:grid-cols-[auto_1fr] lg:px-8 lg:py-5">
        <Lightbulb className="h-6 w-6 text-[#1B8CC9] lg:ml-1" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 id="hallazgos-title" className="font-heading text-lg font-extrabold tracking-[-0.02em] text-[#102A43] dark:text-[#D8EFF7]">Lo importante para decidir</h2>
            <CircleHelp className="h-4 w-4 shrink-0 text-[#14516B] dark:text-[#B9E2F0]" title="Hallazgos resumidos del análisis histórico" />
          </div>
          <p className="mt-0.5 text-sm text-[#294B63] dark:text-[#B9E2F0]/85">Tres lecturas rápidas antes de entrar al detalle.</p>
        </div>
      </div>
      <div className="grid divide-y divide-[#B7C8D5] border-y border-[#B7C8D5] dark:divide-[#19506B] dark:border-[#19506B] md:grid-cols-3 md:divide-x md:divide-y-0">
        {HALLAZGOS.map(({ icon: Icon, title, text }, index) => (
          <article key={title} className="grid grid-cols-[2rem_1fr] gap-4 px-8 py-7">
            <div className="font-mono-num text-sm font-bold text-[#1B8CC9] dark:text-[#B9E2F0]">{String(index + 1).padStart(2, '0')}</div>
            <div>
              <Icon className="mb-2 h-4 w-4 text-[#14516B] dark:text-[#B9E2F0]" />
              <h3 className="text-sm font-extrabold text-[#102A43] dark:text-[#D8EFF7]">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#294B63] dark:text-[#B9E2F0]/80">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

