import { useState } from 'react';
import { BarChart as BarChartIcon, Calendar, LineChart as LineChartIcon, TrendingUp, WifiOff } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
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

  const areaStroke = isDark ? '#8BBB92' : '#3B7D8C';
  const gradStop = isDark ? '#2A835F' : '#6EADBC';

  return (
    <section className="rounded-3xl p-6 border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] transition-colors">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#2D283E] dark:text-[#C4E5CA]">
            <TrendingUp className="h-5 w-5 text-[#1E4D57] dark:text-[#A8E2AF]" />
            Pronóstico y Descomposición de Demanda
          </h2>
          <p className="text-xs text-[#2D283E] dark:text-[#C4E5CA] font-semibold mt-0.5">
            Proyección del modelo para {servicio.nombre} ({servicio.codigo})
          </p>
        </div>

        {/* Selector de Fecha + Alternador de Vista + Selector de Horizonte */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D6E0C2] dark:border-[#1B524F] bg-[#FAFCF6] dark:bg-[#071D22]">
            <Calendar className="h-3.5 w-3.5 text-[#1E4D57] dark:text-[#A8E2AF]" />
            <input
              type="date"
              value={fechaSimulacion}
              min={minFecha}
              max={maxFecha}
              onChange={(e) => onCambiarFecha(e.target.value)}
              className="text-xs font-mono font-bold bg-transparent text-[#2D283E] dark:text-[#C4E5CA] focus:outline-none cursor-pointer"
            />
          </div>

          {/* Selector de Horizonte */}
          <div className="flex items-center rounded-xl border border-[#D6E0C2] dark:border-[#1B524F] p-0.5 bg-[#FAFCF6] dark:bg-[#071D22]">
            {[3, 5, 7, 10, 14].map((dias) => (
              <button
                key={dias}
                onClick={() => setHorizonte(dias)}
                className={`px-2 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  horizonte === dias
                    ? 'bg-[#2D283E] dark:bg-[#206E4E] text-[#FAFCF6]'
                    : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB] dark:hover:bg-[#12544F]'
                }`}
              >
                {dias}d
              </button>
            ))}
          </div>

          {/* Toggle Vista: Curva vs Factores */}
          <div className="flex items-center rounded-xl border border-[#D6E0C2] dark:border-[#1B524F] p-0.5 bg-[#FAFCF6] dark:bg-[#071D22]">
            <button
              onClick={() => setVista('curva')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                vista === 'curva'
                  ? 'bg-[#2D283E] dark:bg-[#206E4E] text-[#FAFCF6]'
                  : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB] dark:hover:bg-[#12544F]'
              }`}
            >
              <LineChartIcon className="h-3.5 w-3.5" />
              <span>Curva</span>
            </button>
            <button
              onClick={() => setVista('factores')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                vista === 'factores'
                  ? 'bg-[#2D283E] dark:bg-[#206E4E] text-[#FAFCF6]'
                  : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB] dark:hover:bg-[#12544F]'
              }`}
            >
              <BarChartIcon className="h-3.5 w-3.5" />
              <span>Factores</span>
            </button>
          </div>
        </div>
      </header>

      {!isApiConnected ? (
        <div className="h-64 w-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#FAFCF6] dark:bg-[#071D22] rounded-2xl border border-dashed border-[#DFC264] dark:border-[#7A5A00]">
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
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#2D283E] dark:text-[#C4E5CA] pb-2 border-b border-[#D6E0C2] dark:border-[#1B524F]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3B7D8C] dark:bg-[#8BBB92]" />
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
              <span className="h-2 w-4 border-t-2 border-dashed border-[#6EADBC] dark:border-[#8BBB92]" />
              Banda p10 - p90
            </span>
          </div>

          {/* Vista 1: Curva de Demanda */}
          {vista === 'curva' && (
            <div className="space-y-4">
              <div className="h-64 w-full font-mono-num text-xs mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosFiltrados} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={gradStop} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={gradStop} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1B524F' : '#D6E0C2'} />
                    <XAxis dataKey="dia" stroke={isDark ? '#C4E5CA' : '#2D283E'} fontSize={12} tickLine={false} />
                    <YAxis
                      stroke={isDark ? '#C4E5CA' : '#2D283E'}
                      fontSize={12}
                      tickLine={false}
                      domain={yDomain}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#071D22' : '#FFFFFF',
                        borderColor: isDark ? '#206E4E' : '#7CB592',
                        borderRadius: '12px',
                        color: isDark ? '#C4E5CA' : '#2D283E',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                      }}
                      formatter={(val, name) => {
                        if (name === 'prediccion') return [`${val} pacientes`, 'Demanda Esperada (p50)'];
                        if (name === 'max') return [`${val} pacientes`, 'Banda Superior (p90)'];
                        if (name === 'min') return [`${val} pacientes`, 'Banda Inferior (p10)'];
                        return [val, name];
                      }}
                    />
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
                      stroke={areaStroke}
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      strokeOpacity={0.6}
                      fill="none"
                      name="max"
                    />
                    <Area
                      type="monotone"
                      dataKey="prediccion"
                      stroke={areaStroke}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorDemanda)"
                      name="prediccion"
                    />
                    <Area
                      type="monotone"
                      dataKey="min"
                      stroke={areaStroke}
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      strokeOpacity={0.6}
                      fill="none"
                      name="min"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Etiquetas Contextuales de Factores por Día */}
              {diasConFactores.length > 0 && (
                <footer className="pt-3 border-t border-[#D6E0C2] dark:border-[#1B524F]">
                  <p className="text-[11px] font-bold text-[#2D283E] dark:text-[#C4E5CA] uppercase tracking-wider mb-2">
                    Efectos identificados en el horizonte:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {diasConFactores.map((d, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FAFCF6] dark:bg-[#071D22] border border-[#D6E0C2] dark:border-[#1B524F] text-xs font-semibold text-[#2D283E] dark:text-[#C4E5CA]"
                      >
                        <span className="font-mono text-[#1E4D57] dark:text-[#A8E2AF]">{d.dia}:</span>
                        {d.factores.map((f, fIdx) => (
                          <span
                            key={fIdx}
                            className={`font-mono text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
                              f.aporte > 0
                                ? 'bg-[#FEF9E2] text-[#704200] dark:bg-[#206E4E]/30 dark:text-[#FFDF80]'
                                : 'bg-[#EEF7F1] text-[#0E4222] dark:bg-[#12544F] dark:text-[#8AE6A2]'
                            }`}
                          >
                            {f.nombre} ({f.aporte > 0 ? '+' : ''}{f.aporte})
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
                      stroke={isDark ? '#C4E5CA' : '#2D283E'}
                      fontSize={11}
                      tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                    />
                    <YAxis
                      dataKey="nombre"
                      type="category"
                      stroke={isDark ? '#C4E5CA' : '#2D283E'}
                      fontSize={11}
                      width={180}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#071D22' : '#FFFFFF',
                        borderColor: isDark ? '#206E4E' : '#7CB592',
                        borderRadius: '12px',
                        color: isDark ? '#C4E5CA' : '#2D283E',
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
                              : isDark ? '#2A835F' : '#3B7D8C'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="p-8 text-center text-xs font-semibold text-[#2D283E] dark:text-[#C4E5CA]">
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
