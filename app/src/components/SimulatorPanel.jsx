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
 * Panel interactivo del simulador de contingencias "¿Qué pasa si...?" con descomposición de factores causales SHAP.
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
      <fieldset className="rounded-2xl p-6 border border-slate-800 bg-[#0e1733]/70 space-y-5 lg:col-span-1 shadow-xl">
        <legend className="border-b border-slate-800 pb-3 w-full">
          <h2 id="titulo-simulador" className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" aria-hidden="true" />
            Variables de Contingencia
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mueve los parámetros para evaluar el impacto en tiempo real
          </p>
        </legend>

        {/* Control Slider: Lluvia en mm */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <label
              htmlFor="slider-lluvia"
              className="flex items-center gap-1.5 text-slate-300 cursor-pointer"
            >
              <CloudRain className="h-4 w-4 text-blue-400" aria-hidden="true" />
              Lluvia en Soledad (24h)
            </label>
            <output htmlFor="slider-lluvia" className="text-blue-400 font-mono">
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
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500" aria-hidden="true">
            <span>Seco (0mm)</span>
            <span>Tormenta (&gt;50mm)</span>
          </div>
        </div>

        {/* Toggles Accesibles */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-medium text-slate-300">
              <Calendar className="h-4 w-4 text-purple-400" aria-hidden="true" />
              Puente Festivo
            </span>
            <input
              type="checkbox"
              checked={esFestivo}
              onChange={(e) => setEsFestivo(e.target.checked)}
              className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-medium text-slate-300">
              <DollarSign className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Día de Quincena (15 o 30)
            </span>
            <input
              type="checkbox"
              checked={esQuincena}
              onChange={(e) => setEsQuincena(e.target.checked)}
              className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
            <span className="flex items-center gap-2.5 text-xs font-medium text-slate-300">
              <Sparkles className="h-4 w-4 text-pink-400" aria-hidden="true" />
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
      <article className="rounded-2xl p-6 border border-slate-800 bg-[#0e1733]/70 space-y-6 lg:col-span-2 shadow-xl flex flex-col justify-between">
        <div>
          <header className="mb-5">
            <h3 className="text-base font-bold text-white">
              Impacto Proyectado en {servicio.nombre}
            </h3>
            <p className="text-xs text-slate-400">
              Sensibilidad estimada de acuerdo a pesos y elasticidades históricas validadas
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">
                Demanda Simulada
              </span>
              <div className="text-3xl font-extrabold text-white mt-1">
                {prediccion} <span className="text-xs text-slate-400 font-normal">pacientes</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  deltaTotal > 0 ? 'text-rose-400' : deltaTotal < 0 ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {deltaTotal > 0 ? '+' : ''}
                {deltaTotal} vs día habitual
              </span>
            </div>

            <div
              className={`p-4 rounded-xl border ${alerta.colorBg} ${alerta.colorBorder} ${alerta.colorTexto}`}
            >
              <span className="text-xs font-semibold uppercase opacity-80">Riesgo Operativo</span>
              <div className="text-2xl font-black mt-1 uppercase tracking-tight">
                {alerta.etiqueta}
              </div>
              <span className="text-xs opacity-90">{alerta.subtitulo}</span>
            </div>
          </div>

          {/* Gráfico SHAP */}
          <section aria-label="Aportes causales" className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Descomposición de Factores Activos (SHAP)
            </h4>
            {factores.length > 0 ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={factores}
                    margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                  >
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis
                      dataKey="nombre"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="aporte" radius={[0, 6, 6, 0]}>
                      {factores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.aporte > 0 ? '#ef4444' : '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
                No hay factores extraordinarios activos. El servicio operará en su promedio base habitual.
              </p>
            )}
          </section>
        </div>
      </article>
    </section>
  );
});
