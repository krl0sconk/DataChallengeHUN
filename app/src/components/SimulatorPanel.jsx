import { Calendar, CloudRain, DollarSign, Sparkles } from 'lucide-react';
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
  puente,
  setPuente,
  quincena,
  setQuincena,
  carnaval,
  setCarnaval,
  proyeccion,
  isDark,
}) {
  const { prediccion, alerta, factores, deltaTotal } = proyeccion;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controles interactivos */}
      <fieldset
        className={`rounded-3xl p-7 border space-y-6 lg:col-span-1 shadow-xs transition-colors ${
          isDark ? 'border-[#2e3748] bg-[#1e2536]' : 'border-stone-200 bg-white'
        }`}
      >
        <legend className={`border-b pb-3.5 w-full ${isDark ? 'border-[#2e3748]' : 'border-stone-200'}`}>
          <h2 className={`text-base font-bold font-heading flex items-center gap-2 ${isDark ? 'text-white' : 'text-stone-900'}`}>
            <Sparkles className={`h-5 w-5 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
            Variables de Entorno
          </h2>
          <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
            Simula el comportamiento según factores externos
          </p>
        </legend>

        <div className="space-y-2.5">
          <div className="flex justify-between text-xs font-bold">
            <label htmlFor="slider-lluvia" className={`flex items-center gap-1.5 cursor-pointer ${isDark ? 'text-slate-200' : 'text-stone-700'}`}>
              <CloudRain className={`h-4 w-4 ${isDark ? 'text-indigo-400' : 'text-sky-700'}`} />
              Lluvia prevista (24h)
            </label>
            <output htmlFor="slider-lluvia" className={`font-mono-num font-bold text-sm ${isDark ? 'text-indigo-300' : 'text-sky-800'}`}>
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
            className={`w-full cursor-pointer h-2 rounded-lg appearance-none transition-colors ${
              isDark ? 'accent-indigo-400 bg-slate-700' : 'accent-sky-600 bg-stone-200'
            }`}
          />
          <div className={`flex justify-between text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            <span>Sin lluvia (0mm)</span>
            <span>Aguacero (&gt;50mm)</span>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <label
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-colors ${
              isDark ? 'bg-[#161c28] border-[#333d52] hover:border-indigo-400/50' : 'bg-stone-50 border-stone-200 hover:border-stone-400'
            }`}
          >
            <span className={`flex items-center gap-2.5 text-xs font-bold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
              <Calendar className={`h-4 w-4 ${isDark ? 'text-purple-300' : 'text-purple-700'}`} />
              Puente festivo
            </span>
            <input
              type="checkbox"
              checked={puente}
              onChange={(e) => setPuente(e.target.checked)}
              className="h-4 w-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-colors ${
              isDark ? 'bg-[#161c28] border-[#333d52] hover:border-indigo-400/50' : 'bg-stone-50 border-stone-200 hover:border-stone-400'
            }`}
          >
            <span className={`flex items-center gap-2.5 text-xs font-bold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
              <DollarSign className={`h-4 w-4 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
              Día de quincena (15 o 30)
            </span>
            <input
              type="checkbox"
              checked={quincena}
              onChange={(e) => setQuincena(e.target.checked)}
              className="h-4 w-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-colors ${
              isDark ? 'bg-[#161c28] border-[#333d52] hover:border-indigo-400/50' : 'bg-stone-50 border-stone-200 hover:border-stone-400'
            }`}
          >
            <span className={`flex items-center gap-2.5 text-xs font-bold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
              <Sparkles className={`h-4 w-4 ${isDark ? 'text-rose-300' : 'text-rose-700'}`} />
              Temporada Carnaval
            </span>
            <input
              type="checkbox"
              checked={carnaval}
              onChange={(e) => setCarnaval(e.target.checked)}
              className="h-4 w-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>
        </div>
      </fieldset>

      {/* Resultados de la simulación */}
      <article
        className={`rounded-3xl p-7 border space-y-6 lg:col-span-2 shadow-xs flex flex-col justify-between transition-colors ${
          isDark ? 'border-[#2e3748] bg-[#1e2536]' : 'border-stone-200 bg-white'
        }`}
      >
        <div>
          <header className="mb-5">
            <h3 className={`text-base font-bold font-heading ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Respuesta en {servicio.nombre}
            </h3>
            <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
              Impacto sobre el volumen base según el escenario configurado
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4.5 rounded-2xl border ${isDark ? 'bg-[#161c28] border-[#333d52]' : 'bg-stone-50 border-stone-200'}`}>
              <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
                Llegadas estimadas
              </span>
              <div className={`text-3xl font-extrabold mt-1 font-mono-num ${isDark ? 'text-white' : 'text-stone-900'}`}>
                {prediccion}{' '}
                <span className={`text-xs font-sans font-medium ${isDark ? 'text-slate-400' : 'text-stone-600'}`}>
                  pacientes
                </span>
              </div>
              <span
                className={`text-xs font-bold font-mono-num ${
                  deltaTotal > 0
                    ? isDark ? 'text-rose-300' : 'text-rose-700'
                    : deltaTotal < 0
                    ? isDark ? 'text-emerald-300' : 'text-emerald-700'
                    : isDark ? 'text-slate-400' : 'text-stone-700'
                }`}
              >
                {deltaTotal > 0 ? '+' : ''}
                {deltaTotal} vs habitual
              </span>
            </div>

            <div
              className={`p-4.5 rounded-2xl border ${
                isDark
                  ? alerta.nivel === 'rojo'
                    ? 'bg-[#351e24] border-rose-400/50 text-rose-100'
                    : alerta.nivel === 'amarillo'
                    ? 'bg-[#352c1e] border-amber-400/50 text-amber-100'
                    : 'bg-[#1b2f27] border-emerald-400/50 text-emerald-100'
                  : `${alerta.colorBg} ${alerta.colorBorder}`
              }`}
            >
              <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-stone-700'}`}>
                Nivel de saturación
              </span>
              <div
                className={`text-2xl font-black mt-1 uppercase tracking-tight font-heading ${
                  isDark
                    ? alerta.nivel === 'rojo'
                      ? 'text-rose-200'
                      : alerta.nivel === 'amarillo'
                      ? 'text-amber-200'
                      : 'text-emerald-200'
                    : alerta.colorTexto
                }`}
              >
                {alerta.etiqueta}
              </div>
              <span className={`text-xs ${isDark ? 'text-slate-200' : alerta.colorSubtexto}`}>
                {alerta.subtitulo}
              </span>
            </div>
          </div>

          <section className="mt-6">
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-200' : 'text-stone-700'}`}>
              Aporte de cada factor al total
            </h4>
            {factores.length > 0 ? (
              <div className="h-44 w-full font-mono-num text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={factores} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <XAxis type="number" stroke={isDark ? '#94a3b8' : '#78716c'} fontSize={11} />
                    <YAxis dataKey="nombre" type="category" stroke={isDark ? '#e2e8f0' : '#44403c'} fontSize={11} width={150} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1a202c' : '#ffffff',
                        borderColor: isDark ? '#4a5568' : '#d6d3d1',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#1c1917',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                      {factores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.aporte > 0 ? (isDark ? '#fb7185' : '#e11d48') : (isDark ? '#34d399' : '#059669')}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p
                className={`p-4 rounded-2xl border text-xs text-center font-semibold ${
                  isDark ? 'bg-[#161c28] border-[#333d52] text-slate-300' : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}
              >
                No hay factores externos activos. Flujo estimado normal.
              </p>
            )}
          </section>
        </div>
      </article>
    </section>
  );
}
