import { useEffect, useState } from 'react';
import { BarChart as BarChartIcon, Calendar, CircleHelp, LineChart as LineChartIcon, Palmtree, PartyPopper, Sparkles, TrendingUp, WifiOff } from 'lucide-react';
import { getEfectosEventos } from '../lib/api';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function DemandChart({
  serie7d = [],
  factores = [],
  servicio,
  isDark,
  fechaSimulacion,
  onCambiarFecha,
  minFecha,
  maxFecha,
  isApiConnected,
  isLoading,
}) {
  const [horizonte, setHorizonte] = useState(7); // 3, 5, 7, 10, 14 días
  const [vista, setVista] = useState('curva'); // 'curva' | 'factores'
  const [efectosEventos, setEfectosEventos] = useState([]);

  useEffect(() => {
    let activo = true;
    getEfectosEventos(servicio.id)
      .then((data) => {
        if (activo) setEfectosEventos(Array.isArray(data.eventos) ? data.eventos : []);
      })
      .catch(() => {
        if (activo) setEfectosEventos([]);
      });
    return () => { activo = false; };
  }, [servicio.id]);

  const datosFiltrados = (serie7d || []).slice(0, horizonte);
  const datosGrafica = datosFiltrados.map((d) => ({
    ...d,
    banda: [d.min ?? d.prediccion, d.max ?? d.prediccion],
  }));
  const p75 = datosFiltrados.find((d) => d.p75 != null)?.p75 ?? servicio.p75;
  const p90 = datosFiltrados.find((d) => d.p90 != null)?.p90 ?? servicio.p90;

  // Ajuste inteligente del eje Y: evita aplastar la curva cuando la demanda está muy por debajo de p90
  const maxDato = datosFiltrados.length > 0 ? Math.max(...datosFiltrados.map((d) => d.max ?? d.prediccion)) : (p90 || 540);
  const techoVisible = Math.max(Math.ceil(maxDato * 1.25), Math.min(p75 || maxDato, Math.ceil(maxDato * 1.5)));
  const yMax = p75 > 0 && maxDato >= p75 * 0.8
    ? Math.max(Math.ceil(maxDato * 1.1), (p90 || maxDato) + 20)
    : techoVisible;
  const yDomain = [0, yMax];

  // Detección limpia de eventos: solo flags booleanos explícitos o factores con aporte real (|aporte| >= 1.0)
  const eventosActivos = datosFiltrados.reduce((acc, d) => {
    const factoresDia = d.factores || [];
    const esCarnaval = d.es_carnaval === true || factoresDia.some((f) => f.nombre.toLowerCase().includes('carnaval') && Math.abs(f.aporte) >= 1.0);
    const esFestivo = d.es_festivo === true || factoresDia.some((f) => f.nombre.toLowerCase().includes('festivo') && Math.abs(f.aporte) >= 1.0);
    const esVacaciones = d.es_vacaciones === true || factoresDia.some((f) => f.nombre.toLowerCase().includes('vacacion') && Math.abs(f.aporte) >= 1.0);

    if (esCarnaval) {
      acc.push({ dia: d.dia, tipo: 'carnaval', etiqueta: 'Carnaval', fill: '#8B5CF6', fillOpacity: 0.10, Icon: PartyPopper, iconClass: 'text-purple-500' });
    } else if (esFestivo) {
      acc.push({ dia: d.dia, tipo: 'festivo', etiqueta: 'Festivo', fill: '#F59E0B', fillOpacity: 0.10, Icon: Sparkles, iconClass: 'text-amber-500' });
    } else if (esVacaciones) {
      acc.push({ dia: d.dia, tipo: 'vacaciones', etiqueta: 'Vacaciones', fill: '#10B981', fillOpacity: 0.08, Icon: Palmtree, iconClass: 'text-emerald-500' });
    }
    return acc;
  }, []);

  // Frase dinámica calculada con los datos reales del endpoint /api/efectos-eventos
  const eventoFestivo = efectosEventos.find((e) => /festiv/i.test(e.evento || e.nombre || ''));
  const pctFestivo = eventoFestivo && eventoFestivo.media_normal > 0
    ? Math.round(((eventoFestivo.media_evento - eventoFestivo.media_normal) / eventoFestivo.media_normal) * 100)
    : null;

  const gradStop = isDark ? '#1B8CC9' : '#2C7A9B';

  const tooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const dato = payload[0]?.payload;
    if (!dato) return null;
    const minVal = dato.min ?? dato.prediccion;
    const maxVal = dato.max ?? dato.prediccion;
    return (
      <div className="rounded-lg border border-slate-200 bg-white/95 p-3.5 text-xs shadow-lg backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
        <p className="mb-2 font-semibold text-slate-900 dark:text-white">{label}</p>
        <div className="space-y-1.5">
          <div className="flex min-w-[210px] items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-300">Proyección:</span>
            <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{dato.prediccion} pac.</strong>
          </div>
          <div className="flex min-w-[210px] items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-300">Rango esperado (p10–p90):</span>
            <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{minVal} – {maxVal} pac.</strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="demand-chart rounded-xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-2">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Corto plazo · 7–14 días</p>
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Pronóstico y Descomposición de Demanda
            </h2>
          </div>
          <CircleHelp className="mt-5 h-4 w-4 shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors" title="Proyección diaria, umbrales p75 y p90" />
        </div>

        {/* Selector de Fecha + Alternador de Vista + Selector de Horizonte */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-[#D1DEE7] bg-[#F7FAFC] p-0.5 dark:border-[#19506B] dark:bg-[#071B2A]">
          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5 px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-[#14516B] dark:text-[#B9E2F0]" />
            <input
              type="date"
              value={fechaSimulacion}
              min={minFecha}
              max={maxFecha}
              onChange={(e) => onCambiarFecha(e.target.value)}
              className="text-xs font-mono font-bold bg-transparent text-[#102A43] dark:text-[#D8EFF7] focus:outline-none cursor-pointer"
            />
          </div>

          {/* Selector de Horizonte */}
          <div className="flex items-center border-l border-[#D1DEE7] pl-1 dark:border-[#19506B]">
            {[3, 5, 7, 10, 14].map((dias) => (
              <button
                key={dias}
                onClick={() => setHorizonte(dias)}
                className={`px-2 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  horizonte === dias
                    ? 'bg-[#102A43] dark:bg-[#176D98] text-[#F7FAFC]'
                    : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7] dark:hover:bg-[#0E3E5B]'
                }`}
              >
                {dias}d
              </button>
            ))}
          </div>
          </div>

          {/* Toggle Vista: Curva vs Factores */}
          <div className="flex items-center rounded-md border border-[#D1DEE7] bg-[#F7FAFC] p-0.5 dark:border-[#19506B] dark:bg-[#071B2A]">
            <button
              onClick={() => setVista('curva')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                vista === 'curva'
                  ? 'bg-[#102A43] dark:bg-[#176D98] text-[#F7FAFC]'
                  : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7] dark:hover:bg-[#0E3E5B]'
              }`}
            >
              <LineChartIcon className="h-3.5 w-3.5" />
              <span>Curva</span>
            </button>
            <button
              onClick={() => setVista('factores')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                vista === 'factores'
                  ? 'bg-[#102A43] dark:bg-[#176D98] text-[#F7FAFC]'
                  : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7] dark:hover:bg-[#0E3E5B]'
              }`}
            >
              <BarChartIcon className="h-3.5 w-3.5" />
              <span>Factores</span>
            </button>
          </div>
        </div>
      </header>

      {!isApiConnected ? (
        <div className="h-64 w-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#F7FAFC] dark:bg-[#071B2A] rounded-2xl border border-dashed border-[#DFC264] dark:border-[#7A5A00]">
          <WifiOff className="h-8 w-8 text-[#B26B00] dark:text-[#FFDF80]" />
          <div>
            <p className="text-sm font-bold text-[#704200] dark:text-[#FFDF80]">
              Curva de Demanda No Disponible
            </p>
            <p className="text-xs text-[#704200]/80 dark:text-[#FFDF80]/80 mt-1">
              Esperando conexión con el servicio analítico de proyecciones hospitalarias.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Leyenda Técnica */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-sky-600 dark:bg-sky-400" />
              Proyección esperada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-xs bg-sky-400/20 border border-sky-400/30" />
              Intervalo p10–p90
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[1px] w-4 bg-amber-500" />
              Umbral de alerta ({p75})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[1px] w-4 bg-rose-600" />
              Umbral de saturación ({p90})
            </span>
          </div>

          {/* Vista 1: Curva de Demanda */}
          {vista === 'curva' && (
            <div className={`space-y-4 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              {isLoading && (
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/60 dark:text-sky-300">
                  <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
                  Calculando proyección del servicio…
                </div>
              )}

              <div className="h-64 w-full font-sans tabular-nums text-xs mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosGrafica} margin={{ top: 14, right: 16, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? '#38bdf8' : '#0284c7'} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={isDark ? '#38bdf8' : '#0284c7'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                    {eventosActivos.map((ev) => (
                      <ReferenceArea
                        key={`banda-${ev.tipo}-${ev.dia}`}
                        x1={ev.dia}
                        x2={ev.dia}
                        y1={yDomain[0]}
                        y2={yDomain[1]}
                        fill={ev.fill}
                        fillOpacity={ev.fillOpacity}
                        stroke="none"
                      />
                    ))}
                    <XAxis dataKey="dia" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke={isDark ? '#94a3b8' : '#64748b'}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={yDomain}
                    />
                    <Tooltip content={tooltipContent} />
                    <ReferenceLine
                      y={p75}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      label={{
                        value: `Umbral de Alerta · ${p75}`,
                        fill: '#f59e0b',
                        fontSize: 10,
                        fontWeight: 600,
                        position: 'insideTopRight',
                      }}
                    />
                    <ReferenceLine
                      y={p90}
                      stroke="#e11d48"
                      strokeWidth={1}
                      label={{
                        value: `Umbral de Saturación · ${p90}`,
                        fill: '#e11d48',
                        fontSize: 10,
                        fontWeight: 600,
                        position: 'insideTopRight',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="banda"
                      stroke="none"
                      fill="#38bdf8"
                      fillOpacity={0.16}
                      name="Intervalo p10–p90"
                    />
                    <Area
                      type="monotone"
                      dataKey="prediccion"
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorDemanda)"
                      name="prediccion"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chips de eventos especiales en la ventana */}
              {eventosActivos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {eventosActivos.map((ev) => {
                    const Icon = ev.Icon;
                    return (
                      <span
                        key={`chip-${ev.tipo}-${ev.dia}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/90 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200"
                      >
                        <Icon className={`h-3.5 w-3.5 ${ev.iconClass}`} />
                        <span>{ev.etiqueta}</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">· {ev.dia}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Frase calculada con datos reales del endpoint /api/efectos-eventos */}
              {pctFestivo !== null && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    En festivos, <strong>{servicio.nombre.toLowerCase()}</strong>{' '}
                    {pctFestivo >= 0 ? 'sube' : 'baja'} en promedio{' '}
                    <strong className="font-mono">{Math.abs(pctFestivo)} %</strong> frente a un día normal.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Vista 2: Desglose de Factores del Modelo */}
          {vista === 'factores' && (
            <div className="h-64 w-full font-mono-num text-xs mt-3 flex flex-col justify-center">
              {factores.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={factores} margin={{ top: 10, right: 35, left: 30, bottom: 5 }}>
                    <XAxis
                      type="number"
                      stroke={isDark ? '#D8EFF7' : '#102A43'}
                      fontSize={11}
                      tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                    />
                    <YAxis
                      dataKey="nombre"
                      type="category"
                      stroke={isDark ? '#D8EFF7' : '#102A43'}
                      fontSize={11}
                      width={180}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#071B2A' : '#FFFFFF',
                        borderColor: isDark ? '#176D98' : '#71B5CC',
                        borderRadius: '12px',
                        color: isDark ? '#D8EFF7' : '#102A43',
                        fontFamily: 'var(--font-mono)',
                      }}
                      formatter={(val) => [`${val > 0 ? '+' : ''}${val} pacientes`, 'Aporte al modelo']}
                    />
                    <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                      {factores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.aporte > 0
                              ? isDark ? '#C5304C' : '#BD5579'
                              : isDark ? '#1B8CC9' : '#14516B'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="p-8 text-center text-xs font-semibold text-[#102A43] dark:text-[#D8EFF7]">
                  Esta fecha opera en su valor basal histórico. No hay ajustes estacionales de lunes, fin de semana o quincena.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
