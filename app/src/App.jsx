import { useEffect, useState } from 'react';
import {
  BottleneckGauge,
  ComparadorServicios,
  Chatbot,
  DemandChart,
  Header,
  HallazgosCards,
  HeatmapTurnos,
  LongTermForecast,
  RadarPresionServicios,
  Metodologia,
  NavTabs,
  PrecisionPanel,
  EventEffectsChart,
  OptimizationPanel,
  SimulatorPanel,
  StatCardGrid,
} from './components';
import {
  FECHA_BASE_MAXIMA,
  FECHA_INICIO_DATOS,
  SERVICIOS,
} from './constants/servicios';
import { useDemandaSimulator } from './hooks/useDemandaSimulator';
import { getOptimizacion } from './lib/api';
import { AlertCircle, CalendarDays } from 'lucide-react';

export default function App() {
  const [tabActiva, setTabActiva] = useState('hoy');
  const [optimizacionData, setOptimizacionData] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('hun-theme') === 'dark';
  });

  useEffect(() => {
    let activo = true;
    getOptimizacion()
      .then((data) => { if (activo) setOptimizacionData(data); })
      .catch(() => { if (activo) setOptimizacionData(null); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('hun-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const {
    servicio,
    listaServicios,
    servicioSel,
    setServicioSel,
    fechaSimulacion,
    setFechaSimulacion,
    proyeccion,
    isApiConnected,
    isLoading,
  } = useDemandaSimulator('urgencias');

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F7FAFC] dark:bg-[#071B2A] text-[#102A43] dark:text-[#D8EFF7] transition-colors">
      <Header
        tabActiva={tabActiva}
        onCambiarTab={setTabActiva}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isApiConnected={isApiConnected}
      />

      {['hoy', 'atascos', 'precision', 'simulador'].includes(tabActiva) && (
        <NavTabs
          servicios={listaServicios}
          servicioActivoId={servicioSel}
          onSeleccionarServicio={setServicioSel}
        />
      )}

      <main className="hun-main max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {tabActiva === 'hoy' && (
          <section className="hun-hero grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[#14516B] dark:text-[#B9E2F0]">Centro de decisiones HUN</p>
              <h1 className="max-w-3xl font-heading text-3xl font-extrabold tracking-[-0.035em] text-[#102A43] dark:text-[#D8EFF7] sm:text-4xl">
                ¿Cómo viene hoy la demanda?
              </h1>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-[#14516B] dark:text-[#B9E2F0]">
              <CalendarDays className="h-5 w-5" />
              <span>Base histórica HUN · 2023–2026</span>
            </div>
          </section>
        )}

        {tabActiva === 'atascos' && (
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#102A43] dark:text-[#D8EFF7]">¿Dónde se atasca?</h1>
        )}

        {tabActiva === 'simulador' && (
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#102A43] dark:text-[#D8EFF7]">Eventos y escenarios de optimización</h1>
        )}

        {/* Banner institucional cuando el servicio no está disponible */}
        {tabActiva === 'hoy' && !isApiConnected && !isLoading && (
          <div className="rounded-2xl border border-[#DFC264] dark:border-[#7A5A00] bg-[#FEF9E2] dark:bg-[#201B0E] p-4 flex items-start gap-3 shadow-xs">
            <AlertCircle className="h-5 w-5 text-[#B26B00] dark:text-[#FFDF80] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-extrabold text-[#704200] dark:text-[#FFDF80]">
                Servicio de Pronóstico No Disponible
              </h2>
              <p className="text-xs text-[#704200]/90 dark:text-[#FFDF80]/80 mt-0.5">
                No se pudo establecer conexión con el motor analítico de estimación hospitalaria. Verifica que el servicio esté en ejecución o contacta al administrador del sistema.
              </p>
            </div>
          </div>
        )}

        {tabActiva === 'hoy' && (
          <section className="space-y-6">
            <HallazgosCards />
            <StatCardGrid
              alerta={proyeccion.alerta}
              prediccion={proyeccion.prediccion}
              p10={proyeccion.min}
              p90={proyeccion.max}
              servicio={servicio}
              isApiConnected={isApiConnected}
              isLoading={isLoading}
            />
            <DemandChart
              serie7d={proyeccion.serie7d}
              factores={proyeccion.factores}
              servicio={servicio}
              isDark={isDark}
              fechaSimulacion={fechaSimulacion}
              onCambiarFecha={setFechaSimulacion}
              minFecha={FECHA_INICIO_DATOS}
              maxFecha={FECHA_BASE_MAXIMA}
              isApiConnected={isApiConnected}
              isLoading={isLoading}
            />
            <LongTermForecast servicio={servicio} />
            <ComparadorServicios
              servicios={SERVICIOS}
              servicioActivoId={servicioSel}
              onSeleccionarServicio={setServicioSel}
              isDark={isDark}
            />
          </section>
        )}

        {tabActiva === 'simulador' && (
          <section className="space-y-6">
            <EventEffectsChart servicio={servicio} />
            <SimulatorPanel
              servicio={servicio}
              fechaSimulacion={fechaSimulacion}
              setFechaSimulacion={setFechaSimulacion}
              proyeccion={proyeccion}
              isDark={isDark}
            />
            <OptimizationPanel key={servicio.id} servicio={servicio} />
          </section>
        )}

        {tabActiva === 'atascos' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isApiConnected && !isLoading && <BottleneckGauge
                value={proyeccion.prediccion ?? 0}
                p75={servicio.p75}
                p90={servicio.p90}
                unidad="pacientes/día"
                label={`Demanda en ${servicio.nombre}`}
              />}
              {Number.isFinite(optimizacionData?.ley_little_camas?.censo_mediana_observada) && <BottleneckGauge
                value={optimizacionData.ley_little_camas.censo_mediana_observada}
                p75={optimizacionData.ley_little_camas.umbral_p75}
                p90={optimizacionData.ley_little_camas.umbral_p90}
                unidad="pacientes simultáneos"
                label="Hospitalización: censo mediano histórico (no actual)"
              />}
            </div>
            {!Number.isFinite(optimizacionData?.ley_little_camas?.censo_mediana_observada) && (
              <p role="status">Censo de referencia no disponible.</p>
            )}
            <HeatmapTurnos servicio={servicio} isDark={isDark} />
            <RadarPresionServicios servicios={SERVICIOS} servicioActivoId={servicioSel} isDark={isDark} />
          </section>
        )}

        {tabActiva === 'precision' && <PrecisionPanel servicio={servicio} proyeccion={proyeccion} />}

        {tabActiva === 'metodologia' && <Metodologia />}
      </main>

      <Chatbot
        pantalla={tabActiva}
        servicio={servicio}
        fecha={fechaSimulacion}
        prediccion={proyeccion.prediccion}
        intervalo={[proyeccion.min, proyeccion.max]}
        alerta={proyeccion.alerta}
        factores={proyeccion.factores}
      />

      {/* Footer Institucional */}
      <footer className="border-t border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] py-6 px-6 text-center text-xs font-semibold text-[#102A43]/80 dark:text-[#D8EFF7]/80 transition-colors">
        <p>
          Hospital Universidad del Norte · Proyecto de Optimización de Capacidad Asistencial (Data Challenge 2026)
        </p>
        <p className="text-[11px] font-normal text-[#102A43]/60 dark:text-[#D8EFF7]/60 mt-1">
          Gobernanza OMOP CDM v5.4 estricta · Privacidad por diseño sin almacenamiento de PHI/PII.
        </p>
      </footer>
    </div>
  );
}
