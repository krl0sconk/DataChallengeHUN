import { Activity, GitCompareArrows, SlidersHorizontal } from 'lucide-react';
import { SectionPanel } from './SectionPanel';

export function HallazgosCards({
  servicio = {},
  proyeccion = {},
  isApiConnected = false,
}) {
  const prediccion = Number(proyeccion.prediccion) || 0;
  const minVal = Number(proyeccion.min) || 0;
  const maxVal = Number(proyeccion.max) || 0;
  const p75 = Number(servicio.p75) || 0;
  const p90 = Number(servicio.p90) || 0;
  const mediaDiaria = Number(servicio.mediaDiaria) || 0;
  const factores = Array.isArray(proyeccion.factores) ? proyeccion.factores : [];

  // 1. Estado del servicio activo frente a p75 y p90
  let estadoTitulo = 'Referencia frente a umbrales';
  let estadoDetalle = `Servicio ${servicio.nombre || 'activo'} con media histórica de ${mediaDiaria} pac./día.`;
  let estadoDato = `p75: ${p75} · p90: ${p90}`;

  if (isApiConnected && p75 > 0) {
    const pctP75 = Math.round((prediccion / p75) * 100);
    if (prediccion >= p90 && p90 > 0) {
      estadoTitulo = 'Umbral de saturación superado';
      estadoDato = `+${prediccion - p90} pac. sobre p90 (${pctP75}% de p75)`;
      estadoDetalle = 'Conviene priorizar altas programadas y activar refuerzo de turno.';
    } else if (prediccion >= p75) {
      estadoTitulo = 'Zona de alerta asistencial';
      estadoDato = `+${prediccion - p75} sobre p75 · ${Math.max(0, p90 - prediccion)} hasta p90`;
      estadoDetalle = 'Monitorear tiempos de espera en triaje y confirmar cobertura del próximo turno.';
    } else {
      estadoTitulo = 'Capacidad dentro de banda normal';
      estadoDato = `${pctP75}% de p75 · margen de ${p75 - prediccion} pac.`;
      estadoDetalle = 'La demanda proyectada se mantiene por debajo del percentil de alerta p75.';
    }
  }

  // 2. Amplitud de incertidumbre p10–p90
  const amplitud = Math.max(0, maxVal - minVal);
  const mitadBanda = Math.round(amplitud / 2);
  const pctAmplitud = prediccion > 0 ? Math.round((amplitud / prediccion) * 100) : 0;

  let incertidumbreTitulo = 'Dispersión del intervalo p10–p90';
  let incertidumbreDato = isApiConnected ? `${minVal}–${maxVal} pac. (±${mitadBanda})` : 'Pendiente de conexión';
  let incertidumbreDetalle = !isApiConnected
    ? 'El rango esperado al 80% de confianza se calcula al recibir el pronóstico.'
    : pctAmplitud >= 22
      ? `Amplitud relativa del ${pctAmplitud}% sobre p50; prever colchón operativo ante picos.`
      : `Amplitud acotada (${pctAmplitud}% sobre p50) adecuada para programación regular.`;

  // 3. Principal factor explicativo activo o línea base
  const factorPrincipal = [...factores]
    .sort((a, b) => Math.abs(Number(b.aporte) || 0) - Math.abs(Number(a.aporte) || 0))[0];

  let factorTitulo = 'Comportamiento basal';
  let factorDato = isApiConnected ? 'Sin ajustes activos' : '---';
  let factorDetalle = isApiConnected
    ? `La fecha opera sobre el patrón basal histórico de ${servicio.nombre || 'este servicio'}.`
    : 'Los aportes de calendario y estacionalidad se muestran al conectar con la API.';

  if (isApiConnected && factorPrincipal && Math.abs(Number(factorPrincipal.aporte) || 0) >= 0.5) {
    const aporte = Number(factorPrincipal.aporte);
    const signo = aporte > 0 ? '+' : '';
    factorTitulo = 'Factor principal del día';
    factorDato = `${factorPrincipal.nombre} (${signo}${aporte} pac.)`;
    factorDetalle = factores.length > 1
      ? proyeccion.deltaTotal
        ? `Aporte neto combinado: ${proyeccion.deltaTotal > 0 ? '+' : ''}${proyeccion.deltaTotal} pac. en ${factores.length} factores activos.`
        : `${factores.length} factores explicativos evaluados en la proyección del día.`
      : 'Principal componente explicativo aplicado sobre la proyección base del modelo.';
  }

  const lecturas = [
    { id: 'umbral', icon: Activity, title: estadoTitulo, metric: estadoDato, text: estadoDetalle },
    { id: 'incertidumbre', icon: GitCompareArrows, title: incertidumbreTitulo, metric: incertidumbreDato, text: incertidumbreDetalle },
    { id: 'factor', icon: SlidersHorizontal, title: factorTitulo, metric: factorDato, text: factorDetalle },
  ];

  return (
    <SectionPanel
      id="hallazgos"
      title="Lectura operativa del día"
      subtitle="Síntesis automática según umbrales históricos, intervalo p10–p90 y factores activos."
      noPadding
    >
      <div className="grid grid-cols-1 divide-y divide-[var(--mf-border)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {lecturas.map(({ id, icon: Icon, title, metric, text }) => (
          <article key={id} className="flex flex-col gap-2 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--mf-ink)]">
              <Icon className="h-4 w-4 shrink-0 text-[var(--mf-accent)]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[var(--mf-ink)]">{title}</h3>
            </div>
            <p className="font-mono-num text-sm font-semibold text-[var(--mf-accent-ink)]">
              {metric}
            </p>
            <p className="text-xs leading-relaxed text-[var(--mf-ink-2)]">
              {text}
            </p>
          </article>
        ))}
      </div>
    </SectionPanel>
  );
}
