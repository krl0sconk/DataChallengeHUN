import {
  Activity,
  Bug,
  Calendar,
  CloudRain,
  DollarSign,
  GraduationCap,
  RotateCcw,
  Sparkles,
  SunMedium,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
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
  resetearEscenario,
  aplicarPreset,
  proyeccion,
  isDark,
}) {
  const { prediccion, alerta, factores, deltaTotal } = proyeccion;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controles del Simulador */}
      <fieldset className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] space-y-5 lg:col-span-1 shadow-xs transition-colors">
        <legend className="border-b border-[#EDF3DC] dark:border-[#0E3B39] pb-3.5 w-full flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <Sparkles className="h-5 w-5 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Factores Externos
            </h2>
            <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
              Clima, calendario local y epidemiología
            </p>
          </div>
          <button
            onClick={resetearEscenario}
            title="Reiniciar a valores normales"
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border border-[#EDF3DC] dark:border-[#0E3B39] text-[#4A4466] dark:text-[#8BBB92] hover:bg-[#EDF3DC] dark:hover:bg-[#092328] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </legend>

        {/* 1. Escenarios Rápidos Preconfigurados */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A4466]/70 dark:text-[#8BBB92]/70 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Escenarios Típicos de Barranquilla:
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

        {/* 2. Control Slider: Precipitación (Open-Meteo) */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs font-bold text-[#4A4466] dark:text-[#8BBB92]">
            <label htmlFor="slider-lluvia" className="flex items-center gap-1.5 cursor-pointer">
              <CloudRain className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Lluvia en 24h
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
          <div className="flex justify-between text-[10px] text-[#4A4466]/70 dark:text-[#8BBB92]/60 font-semibold">
            <span>0mm (Despejado)</span>
            <span>50mm (Fuerte)</span>
            <span>100mm (Alerta)</span>
          </div>
        </div>

        {/* 3. Control Slider: Sensación Térmica / Calor (Open-Meteo) */}
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
          <div className="flex justify-between text-[10px] text-[#4A4466]/70 dark:text-[#8BBB92]/60 font-semibold">
            <span>26°C (Fresco)</span>
            <span>35°C (Promedio)</span>
            <span>42°C (Ola de Calor)</span>
          </div>
        </div>

        {/* 4. Interruptores de Calendario y Epidemiología */}
        <div className="space-y-2 pt-1 text-xs font-bold">
          {/* Dengue SIVIGILA */}
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

          {/* Rebote Post-Festivo */}
          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] hover:border-[#2A835F] cursor-pointer transition-colors">
            <span className="flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <Activity className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Rebote día post-festivo
            </span>
            <input
              type="checkbox"
              checked={postFestivo}
              onChange={(e) => setPostFestivo(e.target.checked)}
              className="h-4 w-4 accent-[#3B7D8C] dark:accent-[#8BBB92] rounded cursor-pointer"
            />
          </label>

          {/* Puente festivo */}
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

          {/* Quincena */}
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

          {/* Vacaciones escolares */}
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

          {/* Carnaval */}
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
      </fieldset>

      {/* Resultados e Impacto Proyectado */}
      <article className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] space-y-6 lg:col-span-2 shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <header className="mb-4">
            <h3 className="text-base font-bold font-heading text-[#4A4466] dark:text-[#8BBB92]">
              Respuesta en {servicio.nombre}
            </h3>
            <p className="text-xs font-semibold mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
              Impacto sobre el volumen basal de pacientes según el escenario modelado
            </p>
          </header>

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

          <section className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#4A4466] dark:text-[#8BBB92]">
              Aporte individual de cada factor (Variación sobre la media)
            </h4>
            {factores.length > 0 ? (
              <div className="h-52 w-full font-mono-num text-xs">
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
                      formatter={(val) => [`${val > 0 ? '+' : ''}${val} pacientes`, 'Impacto Neto']}
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
              <p className="p-4 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] text-xs text-center font-semibold text-[#4A4466] dark:text-[#8BBB92]">
                Todos los factores están en su nivel basal. La demanda esperada coincide con el promedio histórico.
              </p>
            )}
          </section>
        </div>

        <footer className="pt-3 border-t border-[#EDF3DC] dark:border-[#0E3B39] text-[11px] text-[#4A4466]/80 dark:text-[#8BBB92]/80 leading-relaxed font-sans">
          💡 <strong>Acción operativa recomendada:</strong> {alerta.accion}
        </footer>
      </article>
    </section>
  );
}
