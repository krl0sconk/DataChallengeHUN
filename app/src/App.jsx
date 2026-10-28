import { useEffect, useState } from 'react';
import {
  ComparadorServicios,
  DemandChart,
  Header,
  Metodologia,
  NavTabs,
  NotebookViewer,
  StatCardGrid,
} from './components';
import {
  FECHA_BASE_MAXIMA,
  FECHA_INICIO_DATOS,
  SERVICIOS,
} from './constants/servicios';
import { useDemandaSimulator } from './hooks/useDemandaSimulator';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [tabActiva, setTabActiva] = useState('panel');
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('hun-theme') === 'dark';
  });

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
    <div className="min-h-screen flex flex-col font-sans bg-[#FAFCF6] dark:bg-[#071D22] text-[#2D283E] dark:text-[#C4E5CA] transition-colors">
      <Header
        tabActiva={tabActiva}
        onCambiarTab={setTabActiva}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isApiConnected={isApiConnected}
      />

      {tabActiva === 'panel' && (
        <NavTabs
          servicios={listaServicios}
          servicioActivoId={servicioSel}
          onSeleccionarServicio={setServicioSel}
        />
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Banner institucional cuando el servicio no está disponible */}
        {tabActiva === 'panel' && !isApiConnected && !isLoading && (
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

        {tabActiva === 'panel' && (
          <section className="space-y-6">
            <StatCardGrid
              alerta={proyeccion.alerta}
              prediccion={proyeccion.prediccion}
              p10={proyeccion.min}
              p90={proyeccion.max}
              servicio={servicio}
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
            />
            <ComparadorServicios
              servicios={SERVICIOS}
              servicioActivoId={servicioSel}
              onSeleccionarServicio={setServicioSel}
              isDark={isDark}
            />
          </section>
        )}

        {tabActiva === 'notebook' && <NotebookViewer isDark={isDark} />}

        {tabActiva === 'metodologia' && <Metodologia />}
      </main>

      {/* Footer Institucional */}
      <footer className="border-t border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] py-6 px-6 text-center text-xs font-semibold text-[#2D283E]/80 dark:text-[#C4E5CA]/80 transition-colors">
        <p>
          Hospital Universidad del Norte · Proyecto de Optimización de Capacidad Asistencial (Data Challenge 2026)
        </p>
        <p className="text-[11px] font-normal text-[#2D283E]/60 dark:text-[#C4E5CA]/60 mt-1">
          Gobernanza OMOP CDM v5.4 estricta · Privacidad por diseño sin almacenamiento de PHI/PII.
        </p>
      </footer>
    </div>
  );
}
