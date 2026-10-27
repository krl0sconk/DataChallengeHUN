import { useState } from 'react';
import {
  Activity,
  Bug,
  Calendar,
  Check,
  CloudRain,
  Copy,
  DollarSign,
  GraduationCap,
  LineChart as LineChartIcon,
  RotateCcw,
  Share2,
  Sparkles,
  SunMedium,
  Zap,
} from 'lucide-react';
import { FECHA_BASE_MAXIMA, FECHA_INICIO_DATOS } from '../constants/servicios';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function SimulatorPanel({
  servicio,
  lluvia,
  setLluvia,
  temperatura,
  setTemperatura,
  alertaDengue,
  setAlertaDengue,
  puente,
  setPuente,
  quincena,
  setQuincena,
  carnaval,
  setCarnaval,
  postFestivo,
  setPostFestivo,
  vacaciones,
  setVacaciones,
  fechaSimulacion,
  setFechaSimulacion,
  resetearEscenario,
  aplicarPreset,
  proyeccion,
  isDark,
}) {
  const { prediccion, alerta, factores, deltaTotal, serie7d } = proyeccion;
  const [copiado, setCopiado] = useState(false);
  const [vistaGrafica, setVistaGrafica] = useState('comparativa'); // 'comparativa' o 'factores'

  // Genera un resumen textual para compartir la configuración y proyección
  const copiarConfiguracion = () => {
    const textoCompartir = `📊 [Simulación HUN - ${servicio.nombre}]
📅 Fecha Base: ${fechaSimulacion}
👥 Demanda Estimada: ${prediccion} pac. (${deltaTotal > 0 ? '+' : ''}${deltaTotal} vs habitual)
🚨 Estado: ${alerta.etiqueta} (${alerta.subtitulo})
⚙️ Parámetros activos:
- Lluvia: ${lluvia}mm
- Temperatura: ${temperatura}°C
- Dengue: ${alertaDengue ? 'Sí' : 'No'}
- Puente festivo: ${puente ? 'Sí' : 'No'}
- Quincena: ${quincena ? 'Sí' : 'No'}
- Carnaval: ${carnaval ? 'Sí' : 'No'}
- Rebote post-puente: ${postFestivo ? 'Sí' : 'No'}
- Vacaciones escolares: ${vacaciones ? 'Sí' : 'No'}
💡 Recomendación: ${alerta.accion}`;

    navigator.clipboard.writeText(textoCompartir).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controles del Simulador */}
      <section className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] space-y-5 lg:col-span-1 shadow-xs transition-colors">
        <header className="border-b border-[#EDF3DC] dark:border-[#0E3B39] pb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <Sparkles className="h-5 w-5 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Variables de Entorno
            </h2>
            <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
              Modela condiciones climáticas y de calendario
            </p>
          </div>
          <button
            onClick={resetearEscenario}
            title="Reiniciar todos los valores a condiciones normales"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] text-[#4A4466] dark:text-[#8BBB92] hover:border-[#2A835F] hover:bg-white dark:hover:bg-[#12544F] transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restablecer</span>
          </button>
        </header>

        {/* 1. Selector de Fecha Específica */}
        <div className="space-y-1.5 p-3 rounded-2xl bg-[#FAFCF6] dark:bg-[#092328] border border-[#EDF3DC] dark:border-[#0E3B39]">
          <label htmlFor="input-fecha" className="flex items-center justify-between text-xs font-bold text-[#4A4466] dark:text-[#8BBB92] cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Fecha específica a evaluar:
            </span>
          </label>
          <input
            id="input-fecha"
            type="date"
            value={fechaSimulacion}
            min={FECHA_INICIO_DATOS}
            max={FECHA_BASE_MAXIMA}
            onChange={(e) => setFechaSimulacion(e.target.value)}
            className="w-full text-xs font-mono-num font-bold px-3 py-2 rounded-xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] text-[#4A4466] dark:text-[#8BBB92] focus:outline-none focus:ring-1 focus:ring-[#2A835F] cursor-pointer"
          />
          <p className="text-[11px] text-[#4A4466]/70 dark:text-[#8BBB92]/70">
            Datos disponibles del 1 ene 2023 al 16 jul 2026: la ventana de 7 días debe quedar dentro.
          </p>
        </div>

        {/* 2. Escenarios Rápidos Preconfigurados */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A4466]/70 dark:text-[#8BBB92]/70 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Escenarios Preconfigurados:
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
            <button
              onClick={() => aplicarPreset('arroyo_lluvia')}
              className="p-2 rounded-xl text-left border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] text-[#4A4466] dark:text-[#8BBB92] transition-colors cursor-pointer"
            >
              🌧️ Arroyo torrencial
            </button>
            <button
              onClick={() => aplicarPreset('carnaval_pico')}
              className="p-2 rounded-xl text-left border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] text-[#4A4466] dark:text-[#8BBB92] transition-colors cursor-pointer"
            >
              🎉 Carnaval pico
            </button>
            <button
              onClick={() => aplicarPreset('brote_epidemia')}
              className="p-2 rounded-xl text-left border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] text-[#4A4466] dark:text-[#8BBB92] transition-colors cursor-pointer"
            >
              🦟 Brote de Dengue
            </button>
            <button
              onClick={() => aplicarPreset('rebote_puente')}
              className="p-2 rounded-xl text-left border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] text-[#4A4466] dark:text-[#8BBB92] transition-colors cursor-pointer"
            >
              🗓️ Rebote post-puente
            </button>
          </div>
        </div>

        {/* 3. Slider: Lluvia */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs font-bold text-[#4A4466] dark:text-[#8BBB92]">
            <label htmlFor="slider-lluvia" className="flex items-center gap-1.5 cursor-pointer">
              <CloudRain className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Lluvia prevista en 24h
            </label>
            <output htmlFor="slider-lluvia" className="font-mono-num font-extrabold text-sm text-[#3B7D8C] dark:text-[#8BBB92]">
              {lluvia} mm
            </output>
          </div>
          <input
            id="slider-lluvia"
            type="range"
            min="0"
            max="100"
            step="5"
            value={lluvia}
            onChange={(e) => setLluvia(Number(e.target.value))}
            className="w-full cursor-pointer h-2 rounded-lg appearance-none accent-[#3B7D8C] dark:accent-[#8BBB92] bg-[#F1F7D4] dark:bg-[#092328]"
          />
        </div>

        {/* 4. Slider: Sensación Térmica */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs font-bold text-[#4A4466] dark:text-[#8BBB92]">
            <label htmlFor="slider-temp" className="flex items-center gap-1.5 cursor-pointer">
              <SunMedium className="h-4 w-4 text-[#D98A00] dark:text-[#FFD875]" />
              Sensación Térmica
            </label>
            <output htmlFor="slider-temp" className="font-mono-num font-extrabold text-sm text-[#D98A00] dark:text-[#FFD875]">
              {temperatura} °C
            </output>
          </div>
          <input
            id="slider-temp"
            type="range"
            min="26"
            max="42"
            step="1"
            value={temperatura}
            onChange={(e) => setTemperatura(Number(e.target.value))}
            className="w-full cursor-pointer h-2 rounded-lg appearance-none accent-[#D98A00] dark:accent-[#FFD875] bg-[#F1F7D4] dark:bg-[#092328]"
          />
        </div>

        {/* 5. Factores de Calendario y Brotes */}
        <div className="space-y-2 pt-1 text-xs font-bold">
          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] cursor-pointer transition-colors">
            <span className="flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <Bug className="h-4 w-4 text-[#C5304C]" />
              Brote de Dengue (SIVIGILA)
            </span>
            <input
              type="checkbox"
              checked={alertaDengue}
              onChange={(e) => setAlertaDengue(e.target.checked)}
              className="h-4 w-4 accent-[#C5304C] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] cursor-pointer transition-colors">
            <span className="flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <Activity className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Rebote post-festivo
            </span>
            <input
              type="checkbox"
              checked={postFestivo}
              onChange={(e) => setPostFestivo(e.target.checked)}
              className="h-4 w-4 accent-[#3B7D8C] dark:accent-[#8BBB92] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] cursor-pointer transition-colors">
            <span className="flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <Calendar className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Puente festivo
            </span>
            <input
              type="checkbox"
              checked={puente}
              onChange={(e) => setPuente(e.target.checked)}
              className="h-4 w-4 accent-[#4A4466] dark:accent-[#2A835F] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] cursor-pointer transition-colors">
            <span className="flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <DollarSign className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Día de quincena (15 o 30)
            </span>
            <input
              type="checkbox"
              checked={quincena}
              onChange={(e) => setQuincena(e.target.checked)}
              className="h-4 w-4 accent-[#4A4466] dark:accent-[#2A835F] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] cursor-pointer transition-colors">
            <span className="flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <GraduationCap className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Vacaciones escolares
            </span>
            <input
              type="checkbox"
              checked={vacaciones}
              onChange={(e) => setVacaciones(e.target.checked)}
              className="h-4 w-4 accent-[#4A4466] dark:accent-[#2A835F] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] cursor-pointer transition-colors">
            <span className="flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <Sparkles className="h-4 w-4 text-[#D98A00] dark:text-[#FFD875]" />
              Carnaval de Barranquilla
            </span>
            <input
              type="checkbox"
              checked={carnaval}
              onChange={(e) => setCarnaval(e.target.checked)}
              className="h-4 w-4 accent-[#4A4466] dark:accent-[#2A835F] rounded cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Panel de Visualización y Respuestas */}
      <article className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] space-y-5 lg:col-span-2 shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold font-heading text-[#4A4466] dark:text-[#8BBB92]">
                Respuesta en {servicio.nombre}
              </h3>
              <p className="text-xs font-semibold mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
                Proyección para la fecha seleccionada: <strong className="font-mono-num">{fechaSimulacion}</strong>
              </p>
            </div>

            {/* Botón de Compartir Configuración */}
            <button
              onClick={copiarConfiguracion}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                copiado
                  ? 'border-[#2A835F] bg-[#2A835F] text-white shadow-xs'
                  : 'border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] text-[#4A4466] dark:text-[#8BBB92] hover:border-[#2A835F]'
              }`}
            >
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiado ? '¡Copiado al portapapeles!' : 'Copiar Configuración'}</span>
            </button>
          </header>

          {/* Tarjetas de Resumen Numérico */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4.5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328]">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#3B7D8C] dark:text-[#8BBB92]">
                Llegadas estimadas
              </span>
              <div className="text-3xl font-extrabold mt-1 font-mono-num text-[#4A4466] dark:text-[#8BBB92]">
                {prediccion}{' '}
                <span className="text-xs font-sans font-medium text-[#4A4466]/70 dark:text-[#8BBB92]/60">
                  pacientes
                </span>
              </div>
              <span
                className={`text-xs font-bold font-mono-num ${
                  deltaTotal > 0
                    ? 'text-[#C5304C] dark:text-[#FFA8B6]'
                    : deltaTotal < 0
                    ? 'text-[#205C3B] dark:text-[#8BBB92]'
                    : 'text-[#4A4466] dark:text-[#8BBB92]'
                }`}
              >
                {deltaTotal > 0 ? '+' : ''}
                {deltaTotal} pac. vs promedio habitual ({servicio.mediaDiaria})
              </span>
            </div>

            <div className={`p-4.5 rounded-2xl border ${alerta.colorBg} ${alerta.colorBorder} dark:bg-[#092328] dark:border-[#0E3B39]`}>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#4A4466] dark:text-[#8BBB92]">
                Nivel de saturación
              </span>
              <div className={`text-2xl font-black mt-1 uppercase tracking-tight font-heading ${alerta.colorTexto} dark:brightness-125`}>
                {alerta.etiqueta}
              </div>
              <span className="text-xs text-[#4A4466]/80 dark:text-[#8BBB92]/70 font-medium">
                {alerta.subtitulo}
              </span>
            </div>
          </div>

          {/* Selector de tipo de gráfica en el simulador */}
          <div className="mt-5 border-b border-[#EDF3DC] dark:border-[#0E3B39] pb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4A4466] dark:text-[#8BBB92]">
              {vistaGrafica === 'comparativa'
                ? 'Curva Proyectada: Simulación vs Volumen Habitual'
                : 'Desglose por Factor Externo'}
            </span>
            <div className="flex items-center rounded-xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] p-1 text-xs font-bold">
              <button
                onClick={() => setVistaGrafica('comparativa')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  vistaGrafica === 'comparativa'
                    ? 'bg-[#3B7D8C] dark:bg-[#2A835F] text-white shadow-2xs'
                    : 'text-[#4A4466] dark:text-[#8BBB92] hover:bg-[#EDF3DC] dark:hover:bg-[#12544F]'
                }`}
              >
                <LineChartIcon className="h-3.5 w-3.5" /> Curva Comparativa
              </button>
              <button
                onClick={() => setVistaGrafica('factores')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  vistaGrafica === 'factores'
                    ? 'bg-[#3B7D8C] dark:bg-[#2A835F] text-white shadow-2xs'
                    : 'text-[#4A4466] dark:text-[#8BBB92] hover:bg-[#EDF3DC] dark:hover:bg-[#12544F]'
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
                      <stop offset="5%" stopColor={isDark ? '#2A835F' : '#6EADBC'} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={isDark ? '#2A835F' : '#6EADBC'} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#0E3B39' : '#EDF3DC'} />
                  <XAxis dataKey="dia" stroke={isDark ? '#8BBB92' : '#4A4466'} fontSize={12} tickLine={false} />
                  <YAxis stroke={isDark ? '#8BBB92' : '#4A4466'} fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#092328' : '#FAFCF6',
                      borderColor: isDark ? '#2A835F' : '#9FCBAD',
                      borderRadius: '12px',
                      color: isDark ? '#8BBB92' : '#4A4466',
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
                    stroke={isDark ? '#8BBB92' : '#9FCBAD'}
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    fillOpacity={0}
                    name="habitual"
                  />
                  <Area
                    type="monotone"
                    dataKey="simulado"
                    stroke={isDark ? '#8BBB92' : '#3B7D8C'}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSimulado)"
                    name="simulado"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-center items-center gap-6 mt-1 text-[11px] font-semibold text-[#4A4466]/80 dark:text-[#8BBB92]/80">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3B7D8C] dark:bg-[#8BBB92]" /> Simulación Actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 border-t-2 border-dashed border-[#9FCBAD] dark:border-[#8BBB92]/60 inline-block" /> Promedio Habitual
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
                        stroke={isDark ? '#8BBB92' : '#4A4466'}
                        fontSize={11}
                        tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                      />
                      <YAxis
                        dataKey="nombre"
                        type="category"
                        stroke={isDark ? '#8BBB92' : '#4A4466'}
                        fontSize={11}
                        width={160}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#092328' : '#FAFCF6',
                          borderColor: isDark ? '#2A835F' : '#9FCBAD',
                          borderRadius: '12px',
                          color: isDark ? '#8BBB92' : '#4A4466',
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
                                : isDark ? '#2A835F' : '#6EADBC'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="p-8 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] text-xs text-center font-semibold text-[#4A4466] dark:text-[#8BBB92]">
                  Todos los factores externos están en su valor basal. No hay variación sobre la media histórica.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="pt-3 border-t border-[#EDF3DC] dark:border-[#0E3B39] text-[11px] text-[#4A4466]/80 dark:text-[#8BBB92]/80 leading-relaxed font-sans">
          💡 <strong>Acción recomendada:</strong> {alerta.accion}
        </footer>
      </article>
    </section>
  );
}
