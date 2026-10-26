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
 * Panel interactivo del simulador con alto contraste en etiquetas, controles y barras SHAP.
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
      <fieldset className="rounded-2xl p-6 border border-slate-700/80 bg-[#0d1736] space-y-5 lg:col-span-1 shadow-xl">
        <legend className="border-b border-slate-700/80 pb-3 w-full">
          <h2 id="titulo-simulador" className="text-base font-bold text-white font-heading flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-300" aria-hidden="true" />
            Variables de Contingencia
          </h2>
          <p className="text-xs font-medium text-slate-300 mt-1">
            Mueve los parámetros para evaluar el impacto en tiempo real
          </p>
        </legend>

        {/* Control Slider: Lluvia en mm */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <label
              htmlFor="slider-lluvia"
              className="flex items-center gap-1.5 text-slate-200 cursor-pointer"
            >
              <CloudRain className="h-4 w-4 text-sky-400" aria-hidden="true" />
              Lluvia en Soledad (24h)
            </label>
            <output htmlFor="slider-lluvia" className="text-sky-300 font-mono-num font-bold text-sm">
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
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[11px] font-medium text-slate-400" aria-hidden="true">
            <span>Seco (0mm)</span>
            <span>Tormenta (&gt;50mm)</span>
          </div>
        </div>

        {/* Toggles Accesibles */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#070e24] border border-slate-700 hover:border-slate-500 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
              <Calendar className="h-4 w-4 text-purple-300" aria-hidden="true" />
              Puente Festivo
            </span>
            <input
              type="checkbox"
              checked={esFestivo}
              onChange={(e) => setEsFestivo(e.target.checked)}
              className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#070e24] border border-slate-700 hover:border-slate-500 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
              <DollarSign className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Día de Quincena (15 o 30)
            </span>
            <input
              type="checkbox"
              checked={esQuincena}
              onChange={(e) => setEsQuincena(e.target.checked)}
              className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#070e24] border border-slate-700 hover:border-slate-500 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
              <Sparkles className="h-4 w-4 text-pink-300" aria-hidden="true" />
              Carnaval de Barranquilla
            </span>
            <input
              type="checkbox"
              checked={esCarnaval}
              onChange={(e) => setEsCarnaval(e.target.checked)}
              className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </fieldset>

      {/* 2. Impacto Proyectado y Factores SHAP */}
      <article className="rounded-2xl p-6 border border-slate-700/80 bg-[#0d1736] space-y-6 lg:col-span-2 shadow-xl flex flex-col justify-between">
        <div>
          <header className="mb-5">
            <h3 className="text-base font-bold text-white font-heading">
              Impacto Proyectado en {servicio.nombre}
            </h3>
            <p className="text-xs font-medium text-slate-300 mt-0.5">
              Sensibilidad estimada de acuerdo a pesos y elasticidades históricas validadas
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#070e24] border border-slate-700/80">
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                Demanda Simulada
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 font-mono-num">
                {prediccion} <span className="text-xs text-slate-300 font-sans font-medium">pacientes</span>
              </div>
              <span
                className={`text-xs font-bold font-mono-num ${
                  deltaTotal > 0 ? 'text-rose-300' : deltaTotal < 0 ? 'text-emerald-300' : 'text-slate-300'
                }`}
              >
                {deltaTotal > 0 ? '+' : ''}
                {deltaTotal} vs promedio
              </span>
            </div>

            <div
              className={`p-4 rounded-xl border ${alerta.colorBg} ${alerta.colorBorder}`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Riesgo Operativo</span>
              <div className={`text-2xl font-black mt-1 uppercase tracking-tight font-heading ${alerta.colorTexto}`}>
                {alerta.etiqueta}
              </div>
              <span className="text-xs font-medium text-slate-200">{alerta.subtitulo}</span>
            </div>
          </div>

          {/* Gráfico SHAP */}
          <section aria-label="Aportes causales" className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
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
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      dataKey="nombre"
                      type="category"
                      stroke="#e2e8f0"
                      fontSize={11}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#070e24',
                        borderColor: '#475569',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                      {factores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.aporte > 0 ? '#f43f5e' : '#34d399'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="p-4 rounded-xl bg-[#070e24] border border-slate-700/80 text-xs text-slate-300 text-center font-medium">
                No hay factores extraordinarios activos. El servicio operará en su promedio base habitual.
              </p>
            )}
          </section>
        </div>
      </article>
    </section>
  );
});
