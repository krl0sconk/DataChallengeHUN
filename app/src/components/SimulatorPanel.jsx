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
}) {
  const { prediccion, alerta, factores, deltaTotal } = proyeccion;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <fieldset className="rounded-3xl p-7 border border-[#FFEBB8] bg-white space-y-6 lg:col-span-1 shadow-xs">
        <legend className="border-b border-[#FFEBB8] pb-3.5 w-full">
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#601D49]">
            <Sparkles className="h-5 w-5 text-[#BD5579]" />
            Variables de Entorno
          </h2>
          <p className="text-xs font-semibold mt-1 text-[#BD5579]">
            Simula el comportamiento según factores externos
          </p>
        </legend>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-[#601D49]">
            <label htmlFor="slider-lluvia" className="flex items-center gap-1.5 cursor-pointer">
              <CloudRain className="h-4 w-4 text-[#286B94]" />
              Lluvia prevista (24h)
            </label>
            <output htmlFor="slider-lluvia" className="font-mono-num font-bold text-sm text-[#286B94]">
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
            className="w-full cursor-pointer h-2 rounded-lg appearance-none accent-[#286B94] bg-[#E8F1F5]"
          />
          <div className="flex justify-between text-[11px] font-semibold text-[#BD5579]">
            <span>Sin lluvia (0mm)</span>
            <span>Aguacero (&gt;50mm)</span>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[#FFEBB8] bg-[#FFF9ED] hover:border-[#EA9D9D] cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-[#601D49]">
              <Calendar className="h-4 w-4 text-[#BD5579]" />
              Puente festivo
            </span>
            <input
              type="checkbox"
              checked={puente}
              onChange={(e) => setPuente(e.target.checked)}
              className="h-4 w-4 accent-[#601D49] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[#FFEBB8] bg-[#FFF9ED] hover:border-[#EA9D9D] cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-[#601D49]">
              <DollarSign className="h-4 w-4 text-[#BD5579]" />
              Día de quincena (15 o 30)
            </span>
            <input
              type="checkbox"
              checked={quincena}
              onChange={(e) => setQuincena(e.target.checked)}
              className="h-4 w-4 accent-[#601D49] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[#FFEBB8] bg-[#FFF9ED] hover:border-[#EA9D9D] cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-[#601D49]">
              <Sparkles className="h-4 w-4 text-[#BD5579]" />
              Temporada Carnaval
            </span>
            <input
              type="checkbox"
              checked={carnaval}
              onChange={(e) => setCarnaval(e.target.checked)}
              className="h-4 w-4 accent-[#601D49] rounded cursor-pointer"
            />
          </label>
        </div>
      </fieldset>

      <article className="rounded-3xl p-7 border border-[#FFEBB8] bg-white space-y-6 lg:col-span-2 shadow-xs flex flex-col justify-between">
        <div>
          <header className="mb-5">
            <h3 className="text-base font-bold font-heading text-[#601D49]">
              Respuesta en {servicio.nombre}
            </h3>
            <p className="text-xs font-semibold mt-0.5 text-[#BD5579]">
              Impacto sobre el volumen base según el escenario configurado
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4.5 rounded-2xl border border-[#FFEBB8] bg-[#FFF9ED]">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#BD5579]">
                Llegadas estimadas
              </span>
              <div className="text-3xl font-extrabold mt-1 font-mono-num text-[#601D49]">
                {prediccion}{' '}
                <span className="text-xs font-sans font-medium text-[#BD5579]">
                  pacientes
                </span>
              </div>
              <span
                className={`text-xs font-bold font-mono-num ${
                  deltaTotal > 0 ? 'text-[#601D49]' : deltaTotal < 0 ? 'text-[#BD5579]' : 'text-[#601D49]'
                }`}
              >
                {deltaTotal > 0 ? '+' : ''}
                {deltaTotal} vs habitual
              </span>
            </div>

            <div className={`p-4.5 rounded-2xl border ${alerta.colorBg} ${alerta.colorBorder}`}>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#601D49]">
                Nivel de saturación
              </span>
              <div className={`text-2xl font-black mt-1 uppercase tracking-tight font-heading ${alerta.colorTexto}`}>
                {alerta.etiqueta}
              </div>
              <span className="text-xs text-[#BD5579] font-medium">{alerta.subtitulo}</span>
            </div>
          </div>

          <section className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-[#601D49]">
              Aporte de cada factor al total
            </h4>
            {factores.length > 0 ? (
              <div className="h-44 w-full font-mono-num text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={factores} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <XAxis type="number" stroke="#BD5579" fontSize={11} />
                    <YAxis dataKey="nombre" type="category" stroke="#601D49" fontSize={11} width={150} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFDF9',
                        borderColor: '#EA9D9D',
                        borderRadius: '12px',
                        color: '#601D49',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                      {factores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.aporte > 0 ? '#BD5579' : '#2D8A68'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="p-4 rounded-2xl border border-[#FFEBB8] bg-[#FFF9ED] text-xs text-center font-semibold text-[#601D49]">
                No hay factores externos activos. Flujo estimado normal.
              </p>
            )}
          </section>
        </div>
      </article>
    </section>
  );
}
