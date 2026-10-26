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
      <fieldset className="rounded-3xl p-7 border border-[#EDF3DC] dark:border-[#1F4436] bg-white dark:bg-[#285A48] space-y-6 lg:col-span-1 shadow-xs transition-colors">
        <legend className="border-b border-[#EDF3DC] dark:border-[#1F4436] pb-3.5 w-full">
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#B0E4CC]">
            <Sparkles className="h-5 w-5 text-[#6EADBC]" />
            Variables de Entorno
          </h2>
          <p className="text-xs font-semibold mt-1 text-[#4A4466]/80 dark:text-[#B0E4CC]/70">
            Simula el comportamiento según factores externos
          </p>
        </legend>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-[#4A4466] dark:text-[#B0E4CC]">
            <label htmlFor="slider-lluvia" className="flex items-center gap-1.5 cursor-pointer">
              <CloudRain className="h-4 w-4 text-[#3B7D8C] dark:text-[#9FCBAD]" />
              Lluvia prevista (24h)
            </label>
            <output htmlFor="slider-lluvia" className="font-mono-num font-bold text-sm text-[#3B7D8C] dark:text-[#9FCBAD]">
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
            className="w-full cursor-pointer h-2 rounded-lg appearance-none accent-[#3B7D8C] dark:accent-[#9FCBAD] bg-[#F1F7D4] dark:bg-[#091413]"
          />
          <div className="flex justify-between text-[11px] font-semibold text-[#4A4466]/70 dark:text-[#B0E4CC]/60">
            <span>Sin lluvia (0mm)</span>
            <span>Aguacero (&gt;50mm)</span>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EDF3DC] dark:border-[#1F4436] bg-[#FAFCF6] dark:bg-[#091413] hover:border-[#9FCBAD] dark:hover:border-[#408A71] cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-[#4A4466] dark:text-[#B0E4CC]">
              <Calendar className="h-4 w-4 text-[#6EADBC]" />
              Puente festivo
            </span>
            <input
              type="checkbox"
              checked={puente}
              onChange={(e) => setPuente(e.target.checked)}
              className="h-4 w-4 accent-[#4A4466] dark:accent-[#408A71] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EDF3DC] dark:border-[#1F4436] bg-[#FAFCF6] dark:bg-[#091413] hover:border-[#9FCBAD] dark:hover:border-[#408A71] cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-[#4A4466] dark:text-[#B0E4CC]">
              <DollarSign className="h-4 w-4 text-[#6EADBC]" />
              Día de quincena (15 o 30)
            </span>
            <input
              type="checkbox"
              checked={quincena}
              onChange={(e) => setQuincena(e.target.checked)}
              className="h-4 w-4 accent-[#4A4466] dark:accent-[#408A71] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EDF3DC] dark:border-[#1F4436] bg-[#FAFCF6] dark:bg-[#091413] hover:border-[#9FCBAD] dark:hover:border-[#408A71] cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-[#4A4466] dark:text-[#B0E4CC]">
              <Sparkles className="h-4 w-4 text-[#6EADBC]" />
              Temporada Carnaval
            </span>
            <input
              type="checkbox"
              checked={carnaval}
              onChange={(e) => setCarnaval(e.target.checked)}
              className="h-4 w-4 accent-[#4A4466] dark:accent-[#408A71] rounded cursor-pointer"
            />
          </label>
        </div>
      </fieldset>

      <article className="rounded-3xl p-7 border border-[#EDF3DC] dark:border-[#1F4436] bg-white dark:bg-[#285A48] space-y-6 lg:col-span-2 shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <header className="mb-5">
            <h3 className="text-base font-bold font-heading text-[#4A4466] dark:text-[#B0E4CC]">
              Respuesta en {servicio.nombre}
            </h3>
            <p className="text-xs font-semibold mt-0.5 text-[#4A4466]/80 dark:text-[#B0E4CC]/70">
              Impacto sobre el volumen base según el escenario configurado
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4.5 rounded-2xl border border-[#EDF3DC] dark:border-[#1F4436] bg-[#FAFCF6] dark:bg-[#091413]">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#3B7D8C] dark:text-[#9FCBAD]">
                Llegadas estimadas
              </span>
              <div className="text-3xl font-extrabold mt-1 font-mono-num text-[#4A4466] dark:text-[#B0E4CC]">
                {prediccion}{' '}
                <span className="text-xs font-sans font-medium text-[#4A4466]/70 dark:text-[#B0E4CC]/60">
                  pacientes
                </span>
              </div>
              <span
                className={`text-xs font-bold font-mono-num ${
                  deltaTotal > 0 ? 'text-[#C5304C]' : deltaTotal < 0 ? 'text-[#205C3B] dark:text-[#9FCBAD]' : 'text-[#4A4466] dark:text-[#B0E4CC]'
                }`}
              >
                {deltaTotal > 0 ? '+' : ''}
                {deltaTotal} vs habitual
              </span>
            </div>

            <div className={`p-4.5 rounded-2xl border ${alerta.colorBg} ${alerta.colorBorder} dark:bg-[#091413] dark:border-[#1F4436]`}>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#4A4466] dark:text-[#B0E4CC]">
                Nivel de saturación
              </span>
              <div className={`text-2xl font-black mt-1 uppercase tracking-tight font-heading ${alerta.colorTexto} dark:brightness-125`}>
                {alerta.etiqueta}
              </div>
              <span className="text-xs text-[#4A4466]/80 dark:text-[#B0E4CC]/70 font-medium">{alerta.subtitulo}</span>
            </div>
          </div>

          <section className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-[#4A4466] dark:text-[#B0E4CC]">
              Aporte de cada factor al total
            </h4>
            {factores.length > 0 ? (
              <div className="h-44 w-full font-mono-num text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={factores} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <XAxis type="number" stroke={isDark ? '#B0E4CC' : '#4A4466'} fontSize={11} />
                    <YAxis dataKey="nombre" type="category" stroke={isDark ? '#B0E4CC' : '#4A4466'} fontSize={11} width={150} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#091413' : '#FAFCF6',
                        borderColor: isDark ? '#408A71' : '#9FCBAD',
                        borderRadius: '12px',
                        color: isDark ? '#B0E4CC' : '#4A4466',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                      {factores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.aporte > 0 ? '#6EADBC' : isDark ? '#408A71' : '#9FCBAD'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="p-4 rounded-2xl border border-[#EDF3DC] dark:border-[#1F4436] bg-[#FAFCF6] dark:bg-[#091413] text-xs text-center font-semibold text-[#4A4466] dark:text-[#B0E4CC]">
                No hay factores externos activos. Flujo estimado normal.
              </p>
            )}
          </section>
        </div>
      </article>
    </section>
  );
}
