import { useState } from 'react';
import { BarChart as BarChartIcon, Calendar, CalendarDays, CircleHelp, LineChart as LineChartIcon, TrendingUp, WalletCards, WifiOff } from 'lucide-react';
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
}) {
  const { p75, p90 } = servicio;
  const [horizonte, setHorizonte] = useState(7); // 3, 5, 7, 10, 14 días
  const [vista, setVista] = useState('curva'); // 'curva' | 'factores'

  const datosFiltrados = (serie7d || []).slice(0, horizonte);

  // Calcula el dominio Y para que p10, p90, predicción y umbrales siempre queden visibles
  const maxDato = datosFiltrados.length > 0 ? Math.max(...datosFiltrados.map((d) => d.max ?? d.prediccion), p90) : p90;
  const minDato = datosFiltrados.length > 0 ? Math.min(...datosFiltrados.map((d) => d.min ?? d.prediccion), p75) : p75;
  const yDomain = [Math.floor(minDato * 0.85), Math.ceil(maxDato * 1.08)];

  // Días con factores estacionales activos dentro del horizonte seleccionado
  const diasConFactores = datosFiltrados.filter((d) => d.factores && d.factores.length > 0);

  const gradStop = isDark ? '#1B8CC9' : '#2C7A9B';

  const factorIcon = (nombre) => {
    if (/pago|quincena/i.test(nombre)) return WalletCards;
    if (/fin|semana/i.test(nombre)) return CalendarDays;
    return TrendingUp;
  };

  const tooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white/95 p-3.5 text-sm shadow-lg backdrop-blur-xs dark:border-[#19506B] dark:bg-[#071B2A]/95">
        <p className="mb-2 font-semibold text-[#102A43] dark:text-[#D8EFF7]">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex min-w-[190px] items-center justify-between gap-5">
              <span className="text-[#294B63] dark:text-[#B9E2F0]">{entry.name === 'prediccion' ? 'Proyección' : entry.name === 'max' ? 'Límite superior' : 'Límite inferior'}</span>
              <strong className="font-sans tabular-nums text-[#102A43] dark:text-[#D8EFF7]">{entry.value} pac.</strong>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="demand-chart rounded-3xl border border-[#D1DEE7] bg-white p-6 transition-colors dark:border-[#19506B] dark:bg-[#0E3E5B] lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-start gap-2">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#46657A] dark:text-[#B9D4DF]">Corto plazo · 7–14 días</p>
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#102A43] dark:text-[#D8EFF7]">
              <TrendingUp className="h-5 w-5 text-[#14516B] dark:text-[#B9E2F0]" />
              Pronóstico y Descomposición de Demanda
            </h2>
          </div>
          <CircleHelp className="mt-5 h-4 w-4 shrink-0 text-[#14516B] dark:text-[#B9E2F0]" title="Proyección diaria, umbrales p75 y p90" />
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[#102A43] dark:text-[#D8EFF7] pb-2 border-b border-[#D1DEE7] dark:border-[#19506B]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#14516B] dark:bg-[#B9E2F0]" />
              Proyección esperada (Mediana p50)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 border-t-2 border-dashed border-[#B26B00]" />
              Umbral Alerta p75 ({p75} pac)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 border-t-2 border-dashed border-[#C5304C]" />
              Umbral Saturación p90 ({p90} pac)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 border-t-2 border-dashed border-[#2C7A9B] dark:border-[#B9E2F0]" />
              Banda p10 - p90
            </span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#A9D6B5]" /> Bajo p75</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#F0C86A]" /> p75–p90</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#D96B78]" /> Sobre p90</span>
          </div>

          {/* Vista 1: Curva de Demanda */}
          {vista === 'curva' && (
            <div className="space-y-4">
              <div className="h-64 w-full font-sans tabular-nums text-xs mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosFiltrados} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={gradStop} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={gradStop} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#19506B' : '#D1DEE7'} />
                    <ReferenceArea y1={yDomain[0]} y2={p75} fill="#A9D6B5" fillOpacity={0.18} ifOverflow="extendDomain" />
                    <ReferenceArea y1={p75} y2={p90} fill="#F0C86A" fillOpacity={0.16} ifOverflow="extendDomain" />
                    <ReferenceArea y1={p90} y2={yDomain[1]} fill="#D96B78" fillOpacity={0.14} ifOverflow="extendDomain" />
                    <XAxis dataKey="dia" stroke={isDark ? '#D8EFF7' : '#102A43'} fontSize={12} tickLine={false} />
                    <YAxis
                      stroke={isDark ? '#D8EFF7' : '#102A43'}
                      fontSize={12}
                      tickLine={false}
                      domain={yDomain}
                    />
                    <Tooltip content={tooltipContent} />
                    <ReferenceLine
                      y={p75}
                      stroke="#B26B00"
                      strokeDasharray="4 4"
                      label={{
                        value: `p75: ${p75}`,
                        fill: '#B26B00',
                        fontSize: 11,
                        position: 'insideTopRight',
                      }}
                    />
                    <ReferenceLine
                      y={p90}
                      stroke="#C5304C"
                      strokeDasharray="4 4"
                      label={{
                        value: `p90: ${p90}`,
                        fill: '#C5304C',
                        fontSize: 11,
                        position: 'insideTopRight',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="max"
                      stroke="#AEBFCC"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      strokeOpacity={0.35}
                      fill="none"
                      name="max"
                    />
                    <Area
                      type="monotone"
                      dataKey="prediccion"
                      stroke="#0F2942"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorDemanda)"
                      name="prediccion"
                    />
                    <Area
                      type="monotone"
                      dataKey="min"
                      stroke="#AEBFCC"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      strokeOpacity={0.35}
                      fill="none"
                      name="min"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Etiquetas Contextuales de Factores por Día */}
              {diasConFactores.length > 0 && (
                <footer className="pt-3 border-t border-[#D1DEE7] dark:border-[#19506B]">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#102A43] dark:text-[#D8EFF7]">Factores</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                    {diasConFactores.map((d, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 font-sans tabular-nums text-[#294B63] dark:text-[#B9E2F0]"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1B8CC9]" />
                        <span className="font-bold text-[#102A43] dark:text-[#D8EFF7]">{d.dia}</span>
                        {d.factores.map((f, fIdx) => (
                          <span
                            key={fIdx}
                            className="flex items-center gap-1 font-sans"
                          >
                            {(() => { const Icon = factorIcon(f.nombre); return <Icon className="h-3.5 w-3.5 text-[#14516B] dark:text-[#B9E2F0]" />; })()}
                            {f.nombre} <strong className="tabular-nums">({f.aporte > 0 ? '+' : ''}{f.aporte})</strong>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </footer>
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

