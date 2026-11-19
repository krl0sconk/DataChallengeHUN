import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import {
  BottleneckGauge,
  Chatbot,
  ComparadorServicios,
  DemandChart,
  EventEffectsChart,
  HallazgosCards,
  Header,
  HeatmapTurnos,
  LongTermForecast,
  MediFlowLogo,
  Metodologia,
  NavTabs,
  OptimizationPanel,
  PrecisionPanel,
  RadarPresionServicios,
  SimulatorPanel,
  StatCardGrid,
} from './components';
import { FECHA_BASE_MAXIMA, FECHA_INICIO_DATOS, SERVICIOS } from './constants/servicios';
import { useDemandaSimulator } from './hooks/useDemandaSimulator';
import { getOptimizacion } from './lib/api';

const TITULOS_VISTA = {
  hoy: {
    titulo: 'Resumen operativo de demanda',
    descripcion: 'Proyección diaria por servicio frente a umbrales históricos p75 y p90.',
  },
  atascos: {
    titulo: 'Cuellos de botella y presión por turno',
    descripcion: 'Censo histórico, concentración horaria y etapas con mayor tiempo de permanencia.',
  },
  simulador: {
    titulo: 'Simulador de escenarios y dotación',
    descripcion: 'Efecto histórico de eventos locales y recomendación de personal acoplada al pronóstico.',
  },
  precision: {
    titulo: 'Precisión histórica del pronóstico',
    descripcion: 'Comparación entre demanda real observada y predicción del modelo en la ventana seleccionada.',
  },
  metodologia: {
    titulo: 'Guía operativa y metodología',
    descripcion: 'Criterios clínicos, parámetros OMOP CDM v5.4 y reglas de interpretación de alertas.',
  },
};

export default function App() {
  const [tabActiva, setTabActiva] = useState('hoy');
  const [optimizacionData, setOptimizacionData] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('mediflow-theme') || localStorage.getItem('hun-theme');
    return saved === 'dark';
  });

  useEffect(() => {
    let activo = true;
    getOptimizacion()
      .then((data) => { if (activo) setOptimizacionData(data); })
      .catch(() => { if (activo) setOptimizacionData(null); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('mediflow-theme', theme);
    localStorage.setItem('hun-theme', theme);
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
    reintentarConexion,
  } = useDemandaSimulator('urgencias');

  const metaVista = TITULOS_VISTA[tabActiva] || TITULOS_VISTA.hoy;
  const mostrarSelectorServicios = ['hoy', 'atascos', 'precision', 'simulador'].includes(tabActiva);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--mf-bg)] text-[var(--mf-ink)] transition-colors">
      <Header
        tabActiva={tabActiva}
        onCambiarTab={setTabActiva}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isApiConnected={isApiConnected}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {mostrarSelectorServicios && (
          <NavTabs
            servicios={listaServicios}
            servicioActivoId={servicioSel}
            onSeleccionarServicio={setServicioSel}
            fechaSimulacion={fechaSimulacion}
          />
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          {/* Encabezado limpio de vista (sin kicker/eyebrow decorativo) */}
          <header className="flex flex-col gap-3 border-b border-[var(--mf-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-[-0.025em] leading-tight text-[var(--mf-ink)]">
                {metaVista.titulo}
              </h1>
              <p className="mt-1.5 text-sm text-[var(--mf-ink-2)] max-w-[68ch]">
                {metaVista.descripcion}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--mf-ink-2)] shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface)] px-3 py-1.5 font-medium">
                <CalendarDays className="h-3.5 w-3.5 text-[var(--mf-accent)]" aria-hidden="true" />
                <span>Base HUN</span>
                <span className="font-mono-num text-[var(--mf-ink)]">2023–2026</span>
              </span>
            </div>
          </header>

          {/* Aviso accionable cuando la API no está disponible */}
          {!isApiConnected && !isLoading && tabActiva !== 'metodologia' && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-[var(--mf-warn-border)] bg-[var(--mf-warn-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-[var(--mf-warn)] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-[var(--mf-warn)]">
                    Motor analítico temporalmente sin conexión
                  </h2>
                  <p className="mt-0.5 text-sm text-[var(--mf-ink-2)]">
                    No se pudo consultar la API de pronóstico. Verifica que el backend FastAPI esté activo y vuelve a intentar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={reintentarConexion}
                className="mf-btn-secondary shrink-0 self-start sm:self-center"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Reintentar</span>
              </button>
            </div>
          )}

          {tabActiva === 'hoy' && (
            <div className="space-y-6">
              <StatCardGrid
                alerta={proyeccion.alerta}
                prediccion={proyeccion.prediccion}
                p10={proyeccion.min}
                p90={proyeccion.max}
                servicio={servicio}
                isApiConnected={isApiConnected}
                isLoading={isLoading}
              />
              <HallazgosCards
                servicio={servicio}
                proyeccion={proyeccion}
                isApiConnected={isApiConnected}
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
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="xl:col-span-7 min-w-0">
                  <LongTermForecast servicio={servicio} isDark={isDark} />
                </div>
                <div className="xl:col-span-5 min-w-0">
                  <ComparadorServicios
                    servicios={SERVICIOS}
                    servicioActivoId={servicioSel}
                    onSeleccionarServicio={setServicioSel}
                    isDark={isDark}
                  />
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'simulador' && (
            <div className="space-y-6">
              <OptimizationPanel
                key={servicio.id}
                servicio={servicio}
                fechaSimulacion={fechaSimulacion}
                onCambiarFecha={setFechaSimulacion}
                proyeccion={proyeccion}
              />
              <SimulatorPanel
                servicio={servicio}
                fechaSimulacion={fechaSimulacion}
                setFechaSimulacion={setFechaSimulacion}
                proyeccion={proyeccion}
                isDark={isDark}
              />
              <EventEffectsChart servicio={servicio} />
            </div>
          )}

          {tabActiva === 'atascos' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {isApiConnected && !isLoading ? (
                  <BottleneckGauge
                    value={proyeccion.prediccion ?? 0}
                    p75={servicio.p75}
                    p90={servicio.p90}
                    min={proyeccion.min}
                    max={proyeccion.max}
                    unidad="pacientes/día"
                    label={`Demanda proyectada en ${servicio.nombre}`}
                  />
                ) : (
                  <div className="mf-panel p-5 space-y-3" aria-busy={isLoading}>
                    <div className="mf-skeleton h-5 w-48" />
                    <div className="mf-skeleton h-20 w-full" />
                    <div className="mf-skeleton h-3 w-full" />
                  </div>
                )}

                {Number.isFinite(optimizacionData?.ley_little_camas?.censo_mediana_observada) ? (
                  <BottleneckGauge
                    value={optimizacionData.ley_little_camas.censo_mediana_observada}
                    p75={optimizacionData.ley_little_camas.umbral_p75}
                    p90={optimizacionData.ley_little_camas.umbral_p90}
                    unidad="pacientes simultáneos"
                    label="Hospitalización: censo mediano histórico"
                  />
                ) : (
                  <div role="status" className="mf-panel flex items-center justify-center p-6 text-sm text-[var(--mf-ink-2)]">
                    Censo de referencia no disponible con el estado actual del motor.
                  </div>
                )}
              </div>

              <HeatmapTurnos servicio={servicio} isDark={isDark} />
              <RadarPresionServicios servicios={SERVICIOS} servicioActivoId={servicioSel} isDark={isDark} />
            </div>
          )}

          {tabActiva === 'precision' && (
            <PrecisionPanel servicio={servicio} proyeccion={proyeccion} isDark={isDark} />
          )}

          {tabActiva === 'metodologia' && <Metodologia />}
        </main>

        <footer className="border-t border-[var(--mf-border)] bg-[var(--mf-surface)] px-4 py-5 sm:px-6 lg:px-8 transition-colors">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <MediFlowLogo variant="on-light" size="sm" />
            <div className="text-xs text-[var(--mf-ink-2)] sm:text-right">
              <p className="font-medium text-[var(--mf-ink)]">
                Hospital Universidad del Norte · Optimización de Capacidad Asistencial (Data Challenge 2026)
              </p>
              <p className="mt-0.5 text-[var(--mf-ink-3)]">
                Gobernanza OMOP CDM v5.4 · Privacidad por diseño sin almacenamiento de PHI/PII.
              </p>
            </div>
          </div>
        </footer>
      </div>

      <Chatbot
        pantalla={tabActiva}
        servicio={servicio}
        fecha={fechaSimulacion}
        prediccion={proyeccion.prediccion}
        intervalo={[proyeccion.min, proyeccion.max]}
        alerta={proyeccion.alerta}
        factores={proyeccion.factores}
      />
    </div>
  );
}
