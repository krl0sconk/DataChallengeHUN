import React, { memo } from 'react';
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

/**
 * Panel interactivo del simulador con paleta cálida / pastel y contraste AAA.
 */
export const SimulatorPanel = memo(function SimulatorPanel({
  servicio,
  lluviaMm,
  setLluviaMm,
  esFestivo,
  setEsFestivo,
  esQuincena,
  setEsQuincena,
  esCarnaval,
  setEsCarnaval,
  resultado,
}) {
  const { prediccion, alerta, factores, deltaTotal } = resultado;

  return (
    <section
      aria-labelledby="titulo-simulador"
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* 1. Controles del Escenario */}
      <fieldset className="rounded-2xl p-6 border border-stone-200 bg-white space-y-5 lg:col-span-1 shadow-xs">
        <legend className="border-b border-stone-200 pb-3 w-full">
          <h2 id="titulo-simulador" className="text-base font-bold text-stone-900 font-heading flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Variables de Contingencia
          </h2>
          <p className="text-xs font-semibold text-stone-600 mt-1">
            Mueve los parámetros para evaluar el impacto en tiempo real
          </p>
        </legend>

        {/* Control Slider: Lluvia en mm */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <label
              htmlFor="slider-lluvia"
              className="flex items-center gap-1.5 text-stone-700 cursor-pointer"
            >
              <CloudRain className="h-4 w-4 text-sky-700" aria-hidden="true" />
              Lluvia en Soledad (24h)
            </label>
            <output htmlFor="slider-lluvia" className="text-sky-800 font-mono-num font-bold text-sm">
              {lluviaMm} mm
            </output>
          </div>
          <input
            id="slider-lluvia"
            type="range"
            min="0"
            max="100"
            step="5"
            value={lluviaMm}
            onChange={(e) => setLluviaMm(Number(e.target.value))}
            className="w-full accent-sky-600 cursor-pointer h-2 bg-stone-200 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[11px] font-semibold text-stone-500" aria-hidden="true">
            <span>Seco (0mm)</span>
            <span>Tormenta (&gt;50mm)</span>
          </div>
        </div>

        {/* Toggles Cálidos */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-400 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-stone-800">
              <Calendar className="h-4 w-4 text-purple-700" aria-hidden="true" />
              Puente Festivo
            </span>
            <input
              type="checkbox"
              checked={esFestivo}
              onChange={(e) => setEsFestivo(e.target.checked)}
              className="h-4 w-4 accent-sky-700 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-400 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-stone-800">
              <DollarSign className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              Día de Quincena (15 o 30)
            </span>
            <input
              type="checkbox"
              checked={esQuincena}
              onChange={(e) => setEsQuincena(e.target.checked)}
              className="h-4 w-4 accent-sky-700 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-400 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-bold text-stone-800">
              <Sparkles className="h-4 w-4 text-rose-700" aria-hidden="true" />
              Carnaval de Barranquilla
            </span>
            <input
              type="checkbox"
              checked={esCarnaval}
              onChange={(e) => setEsCarnaval(e.target.checked)}
              className="h-4 w-4 accent-sky-700 rounded cursor-pointer"
            />
          </label>
        </div>
      </fieldset>

      {/* 2. Impacto Proyectado y Factores SHAP */}
      <article className="rounded-2xl p-6 border border-stone-200 bg-white space-y-6 lg:col-span-2 shadow-xs flex flex-col justify-between">
        <div>
          <header className="mb-5">
            <h3 className="text-base font-bold text-stone-900 font-heading">
              Impacto Proyectado en {servicio.nombre}
            </h3>
            <p className="text-xs font-semibold text-stone-600 mt-0.5">
              Sensibilidad estimada de acuerdo a pesos y elasticidades históricas validadas
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-xs text-stone-600 font-extrabold uppercase tracking-wider">
                Demanda Simulada
              </span>
              <div className="text-3xl font-extrabold text-stone-900 mt-1 font-mono-num">
                {prediccion} <span className="text-xs text-stone-600 font-sans font-medium">pacientes</span>
              </div>
              <span
                className={`text-xs font-bold font-mono-num ${
                  deltaTotal > 0 ? 'text-rose-700' : deltaTotal < 0 ? 'text-emerald-700' : 'text-stone-700'
                }`}
              >
                {deltaTotal > 0 ? '+' : ''}
                {deltaTotal} vs promedio
              </span>
            </div>

            <div
              className={`p-4 rounded-xl border ${alerta.colorBg} ${alerta.colorBorder}`}
            >
              <span className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Riesgo Operativo</span>
              <div className={`text-2xl font-black mt-1 uppercase tracking-tight font-heading ${alerta.colorTexto}`}>
                {alerta.etiqueta}
              </div>
              <span className={`text-xs ${alerta.colorSubtexto}`}>{alerta.subtitulo}</span>
            </div>
          </div>

          {/* Gráfico SHAP */}
          <section aria-label="Aportes causales" className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3">
              Descomposición de Factores Activos (SHAP)
            </h4>
            {factores.length > 0 ? (
              <div className="h-44 w-full font-mono-num text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={factores}
                    margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                  >
                    <XAxis type="number" stroke="#78716c" fontSize={11} />
                    <YAxis
                      dataKey="nombre"
                      type="category"
                      stroke="#44403c"
                      fontSize={11}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#d6d3d1',
                        borderRadius: '12px',
                        color: '#1c1917',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                      {factores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.aporte > 0 ? '#e11d48' : '#059669'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 text-center font-semibold">
                No hay factores extraordinarios activos. El servicio operará en su promedio base habitual.
              </p>
            )}
          </section>
        </div>
      </article>
    </section>
  );
});
