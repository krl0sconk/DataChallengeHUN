import { useEffect, useState } from 'react';
import {
  Activity,
  Calendar,
  Check,
  Copy,
  LineChart as LineChartIcon,
  Sparkles,
} from 'lucide-react';
import { FECHA_BASE_MAXIMA, FECHA_INICIO_DATOS } from '../constants/servicios';
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
import { apiUrl } from '../lib/api';

export function SimulatorPanel({
  servicio,
  fechaSimulacion,
  setFechaSimulacion,
  proyeccion,
  isDark,
}) {
  const { prediccion, alerta, factores, deltaTotal, serie7d } = proyeccion;
  const [copiado, setCopiado] = useState(false);
  const [vistaGrafica, setVistaGrafica] = useState('comparativa'); // 'comparativa' o 'factores'
  const [eventos, setEventos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState('');
  const [cargandoEventos, setCargandoEventos] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargandoEventos(true);
    fetch(apiUrl(`/api/efectos-eventos/${servicio.id}`))
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error('Eventos no disponibles');
        return respuesta.json();
      })
      .then((data) => {
        if (!activo) return;
        const lista = Array.isArray(data.eventos) ? data.eventos : [];
        setEventos(lista);
        setEventoActivo((actual) => lista.some((evento) => evento.evento === actual) ? actual : lista[0]?.evento || '');
      })
      .catch(() => activo && setEventos([]))
      .finally(() => activo && setCargandoEventos(false));
    return () => { activo = false; };
  }, [servicio.id]);

  const eventoSeleccionado = eventos.find((evento) => evento.evento === eventoActivo);

  // Genera un resumen textual para compartir la configuración y proyección
  const copiarConfiguracion = () => {
    const textoCompartir = `📊 [Simulación HUN - ${servicio.nombre}]
📅 Fecha Base: ${fechaSimulacion}
👥 Demanda Estimada: ${prediccion} pac. (${deltaTotal > 0 ? '+' : ''}${deltaTotal} vs habitual)
🚨 Estado: ${alerta.etiqueta} (${alerta.subtitulo})
⚙️ Factores identificados por el modelo:
${(factores || []).map((f) => `- ${f.nombre}: ${f.aporte > 0 ? '+' : ''}${f.aporte} pac.`).join('\n')}
💡 Recomendación: ${alerta.accion}`;

    navigator.clipboard.writeText(textoCompartir).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controles del Simulador */}
      <section className="rounded-3xl p-6 border border-[#E8F0F5] dark:border-[#0B3045] bg-white dark:bg-[#0E3E5B] space-y-5 lg:col-span-1 shadow-xs transition-colors">
        <header className="border-b border-[#E8F0F5] dark:border-[#0B3045] pb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#102A43] dark:text-[#B9E2F0]">
              <Sparkles className="h-5 w-5 text-[#14516B] dark:text-[#B9E2F0]" />
              Factores de Demanda
            </h2>
            <p className="text-xs font-medium mt-0.5 text-[#102A43]/80 dark:text-[#B9E2F0]/70">
              Evaluación por fecha histórica y efectos observados
            </p>
          </div>
        </header>

        {/* 1. Selector de Fecha Específica */}
        <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#F7FAFC] dark:bg-[#071B2A] border border-[#E8F0F5] dark:border-[#0B3045]">
          <label htmlFor="input-fecha" className="flex items-center justify-between text-xs font-bold text-[#102A43] dark:text-[#B9E2F0] cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#14516B] dark:text-[#B9E2F0]" />
              Fecha histórica a evaluar:
            </span>
          </label>
          <input
            id="input-fecha"
            type="date"
            value={fechaSimulacion}
            min={FECHA_INICIO_DATOS}
            max={FECHA_BASE_MAXIMA}
            onChange={(e) => setFechaSimulacion(e.target.value)}
            className="w-full text-xs font-mono-num font-bold px-3 py-2 rounded-xl border border-[#E8F0F5] dark:border-[#0B3045] bg-white dark:bg-[#0E3E5B] text-[#102A43] dark:text-[#B9E2F0] focus:outline-none focus:ring-1 focus:ring-[#1B8CC9] cursor-pointer"
          />
          <p className="text-[11px] text-[#102A43]/70 dark:text-[#B9E2F0]/70">
            Rango de la base: 1 ene 2023 al 16 jul 2026 (ventana de 7 días).
          </p>
        </div>

        {/* 2. Escenarios respaldados por la API */}
        <div className="space-y-2.5 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#102A43]/70 dark:text-[#B9E2F0]/70 flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-[#14516B] dark:text-[#B9E2F0]" />
            Escenario histórico por evento:
          </span>

          {cargandoEventos && <p className="text-xs text-[#46657A] dark:text-[#B9D4DF]">Cargando escenarios disponibles…</p>}
          {!cargandoEventos && !eventos.length && <p className="text-xs text-[#46657A] dark:text-[#B9D4DF]">La API no devolvió escenarios para este servicio.</p>}
          {!cargandoEventos && eventos.length > 0 && <>
            <select value={eventoActivo} onChange={(e) => setEventoActivo(e.target.value)} className="w-full rounded-xl border border-[#E8F0F5] dark:border-[#0B3045] bg-white dark:bg-[#071B2A] px-3 py-2 text-xs font-bold text-[#102A43] dark:text-[#B9E2F0]">
              {eventos.map((evento) => <option key={evento.evento} value={evento.evento}>{evento.etiqueta}</option>)}
            </select>
            {eventoSeleccionado && <div className="space-y-2 rounded-2xl border border-[#E8F0F5] dark:border-[#0B3045] bg-[#F7FAFC] dark:bg-[#071B2A] p-3.5 text-xs">
              <p className="font-bold text-[#102A43] dark:text-[#B9E2F0]">{eventoSeleccionado.frase}</p>
              <div className="grid grid-cols-2 gap-2 text-[#46657A] dark:text-[#B9D4DF]"><span>Con evento <strong className="font-mono-num text-[#102A43] dark:text-[#D8EFF7]">{eventoSeleccionado.media_evento}</strong></span><span>Normal <strong className="font-mono-num text-[#102A43] dark:text-[#D8EFF7]">{eventoSeleccionado.media_normal}</strong></span><span>Cambio <strong className="font-mono-num text-[#102A43] dark:text-[#D8EFF7]">{eventoSeleccionado.cambio_visitas > 0 ? '+' : ''}{eventoSeleccionado.cambio_visitas}</strong></span><span>Días observados <strong className="font-mono-num text-[#102A43] dark:text-[#D8EFF7]">{eventoSeleccionado.n_dias}</strong></span></div>
            </div>}
          </>}

        </div>
      </section>

      {/* Panel de Visualización y Respuestas */}
      <article className="rounded-3xl p-6 border border-[#E8F0F5] dark:border-[#0B3045] bg-white dark:bg-[#0E3E5B] space-y-5 lg:col-span-2 shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold font-heading text-[#102A43] dark:text-[#B9E2F0]">
                Respuesta en {servicio.nombre}
              </h3>
              <p className="text-xs font-semibold mt-0.5 text-[#102A43]/80 dark:text-[#B9E2F0]/70">
                Proyección para la fecha seleccionada: <strong className="font-mono-num">{fechaSimulacion}</strong>
              </p>
            </div>

            {/* Botón de Compartir Configuración */}
            <button
              onClick={copiarConfiguracion}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                copiado
                  ? 'border-[#1B8CC9] bg-[#1B8CC9] text-white shadow-xs'
                  : 'border-[#E8F0F5] dark:border-[#0B3045] bg-[#F7FAFC] dark:bg-[#071B2A] text-[#102A43] dark:text-[#B9E2F0] hover:border-[#1B8CC9]'
              }`}
            >
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiado ? '¡Copiado al portapapeles!' : 'Copiar Configuración'}</span>
            </button>
          </header>

          {/* Tarjetas de Resumen Numérico */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4.5 rounded-2xl border border-[#E8F0F5] dark:border-[#0B3045] bg-[#F7FAFC] dark:bg-[#071B2A]">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#14516B] dark:text-[#B9E2F0]">
                Llegadas estimadas
              </span>
              <div className="text-3xl font-extrabold mt-1 font-mono-num text-[#102A43] dark:text-[#B9E2F0]">
                {prediccion}{' '}
                <span className="text-xs font-sans font-medium text-[#102A43]/70 dark:text-[#B9E2F0]/60">
                  pacientes
                </span>
              </div>
              <span
                className={`text-xs font-bold font-mono-num ${
                  deltaTotal > 0
                    ? 'text-[#C5304C] dark:text-[#FFA8B6]'
                    : deltaTotal < 0
                    ? 'text-[#205C3B] dark:text-[#B9E2F0]'
                    : 'text-[#102A43] dark:text-[#B9E2F0]'
                }`}
              >
                {deltaTotal > 0 ? '+' : ''}
                {deltaTotal} pac. vs promedio habitual ({servicio.mediaDiaria})
              </span>
            </div>

            <div className={`p-4.5 rounded-2xl border ${alerta.colorBg} ${alerta.colorBorder} dark:bg-[#071B2A] dark:border-[#0B3045]`}>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#102A43] dark:text-[#B9E2F0]">
                Nivel de saturación
              </span>
              <div className={`text-2xl font-black mt-1 uppercase tracking-tight font-heading ${alerta.colorTexto} dark:brightness-125`}>
                {alerta.etiqueta}
              </div>
              <span className="text-xs text-[#102A43]/80 dark:text-[#B9E2F0]/70 font-medium">
                {alerta.subtitulo}
              </span>
            </div>
          </div>

          {/* Selector de tipo de gráfica en el simulador */}
          <div className="mt-5 border-b border-[#E8F0F5] dark:border-[#0B3045] pb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#102A43] dark:text-[#B9E2F0]">
              {vistaGrafica === 'comparativa'
                ? 'Curva Proyectada: Simulación vs Volumen Habitual'
                : 'Desglose por Factor Externo'}
            </span>
            <div className="flex items-center rounded-xl border border-[#E8F0F5] dark:border-[#0B3045] bg-[#F7FAFC] dark:bg-[#071B2A] p-1 text-xs font-bold">
              <button
                onClick={() => setVistaGrafica('comparativa')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  vistaGrafica === 'comparativa'
                    ? 'bg-[#14516B] dark:bg-[#1B8CC9] text-white shadow-2xs'
                    : 'text-[#102A43] dark:text-[#B9E2F0] hover:bg-[#E8F0F5] dark:hover:bg-[#0E3E5B]'
                }`}
              >
                <LineChartIcon className="h-3.5 w-3.5" /> Curva Comparativa
              </button>
              <button
                onClick={() => setVistaGrafica('factores')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  vistaGrafica === 'factores'
                    ? 'bg-[#14516B] dark:bg-[#1B8CC9] text-white shadow-2xs'
                    : 'text-[#102A43] dark:text-[#B9E2F0] hover:bg-[#E8F0F5] dark:hover:bg-[#0E3E5B]'
                }`}
              >
                <BarChart className="h-3.5 w-3.5" /> Aporte Factores
              </button>
            </div>
          </div>

          {/* Gráfica 1: Curva Comparativa Simulado vs Habitual */}
          {vistaGrafica === 'comparativa' && (
            <div className="h-56 w-full font-mono-num text-xs mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie7d} margin={{ top: 10, right: 25, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSimulado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? '#1B8CC9' : '#2C7A9B'} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={isDark ? '#1B8CC9' : '#2C7A9B'} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#0B3045' : '#E8F0F5'} />
                  <XAxis dataKey="dia" stroke={isDark ? '#B9E2F0' : '#102A43'} fontSize={12} tickLine={false} />
                  <YAxis stroke={isDark ? '#B9E2F0' : '#102A43'} fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#071B2A' : '#F7FAFC',
                      borderColor: isDark ? '#1B8CC9' : '#8CC5D9',
                      borderRadius: '12px',
                      color: isDark ? '#B9E2F0' : '#102A43',
                      fontFamily: 'var(--font-mono)',
                    }}
                    formatter={(val, name) => [
                      `${val} pacientes`,
                      name === 'simulado' ? 'Simulación con factores' : 'Volumen Habitual',
                    ]}
                  />
                  <ReferenceLine
                    y={servicio.p90}
                    stroke="#C5304C"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Límite Saturación (${servicio.p90})`,
                      fill: isDark ? '#FFA8B6' : '#C5304C',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="habitual"
                    stroke={isDark ? '#B9E2F0' : '#8CC5D9'}
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    fillOpacity={0}
                    name="habitual"
                  />
                  <Area
                    type="monotone"
                    dataKey="simulado"
                    stroke={isDark ? '#B9E2F0' : '#14516B'}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSimulado)"
                    name="simulado"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-center items-center gap-6 mt-1 text-[11px] font-semibold text-[#102A43]/80 dark:text-[#B9E2F0]/80">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#14516B] dark:bg-[#B9E2F0]" /> Simulación Actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 border-t-2 border-dashed border-[#8CC5D9] dark:border-[#B9E2F0]/60 inline-block" /> Promedio Habitual
                </span>
              </div>
            </div>
          )}

          {/* Gráfica 2: Desglose por Factor */}
          {vistaGrafica === 'factores' && (
            <div className="mt-3">
              {factores.length > 0 ? (
                <div className="h-56 w-full font-mono-num text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={factores}
                      margin={{ top: 5, right: 35, left: 30, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        stroke={isDark ? '#B9E2F0' : '#102A43'}
                        fontSize={11}
                        tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                      />
                      <YAxis
                        dataKey="nombre"
                        type="category"
                        stroke={isDark ? '#B9E2F0' : '#102A43'}
                        fontSize={11}
                        width={160}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#071B2A' : '#F7FAFC',
                          borderColor: isDark ? '#1B8CC9' : '#8CC5D9',
                          borderRadius: '12px',
                          color: isDark ? '#B9E2F0' : '#102A43',
                          fontFamily: 'var(--font-mono)',
                        }}
                        formatter={(val) => [`${val > 0 ? '+' : ''}${val} pacientes`, 'Variación']}
                      />
                      <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                        {factores.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.aporte > 0
                                ? isDark ? '#C5304C' : '#BD5579'
                                : isDark ? '#1B8CC9' : '#2C7A9B'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="p-8 rounded-2xl border border-[#E8F0F5] dark:border-[#0B3045] bg-[#F7FAFC] dark:bg-[#071B2A] text-xs text-center font-semibold text-[#102A43] dark:text-[#B9E2F0]">
                  Todos los factores externos están en su valor basal. No hay variación sobre la media histórica.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="pt-3 border-t border-[#E8F0F5] dark:border-[#0B3045] text-[11px] text-[#102A43]/80 dark:text-[#B9E2F0]/80 leading-relaxed font-sans">
          💡 <strong>Acción recomendada:</strong> {alerta.accion}
        </footer>
      </article>
    </section>
  );
}

