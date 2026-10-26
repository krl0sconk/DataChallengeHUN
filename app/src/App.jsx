import { useState, useEffect } from 'react';
import {
  DemandChart,
  Header,
  HeatmapTurnos,
  Metodologia,
  NavTabs,
  ComparadorServicios,
  SimulatorPanel,
  StatCardGrid,
} from './components';
import { SERVICIOS } from './constants/servicios';
import { useDemandaSimulator } from './hooks/useDemandaSimulator';

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
    lluvia,
    setLluvia,
    puente,
    setPuente,
    quincena,
    setQuincena,
    carnaval,
    setCarnaval,
    proyeccion,
  } = useDemandaSimulator('urgencias');

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FAFCF6] dark:bg-[#092328] text-[#4A4466] dark:text-[#8BBB92] transition-colors">
      <Header
        servicios={listaServicios}
        servicioActivoId={servicioSel}
        onSeleccionarServicio={setServicioSel}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <NavTabs tabActiva={tabActiva} onCambiarTab={setTabActiva} />

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {tabActiva === 'panel' && (
          <section className="space-y-6">
            <StatCardGrid
              alerta={proyeccion.alerta}
              prediccion={proyeccion.prediccion}
              p10={proyeccion.min}
              p90={proyeccion.max}
              servicio={servicio}
            />
            <DemandChart serie7d={proyeccion.serie7d} servicio={servicio} isDark={isDark} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HeatmapTurnos servicio={servicio} isDark={isDark} />
              <ComparadorServicios servicios={SERVICIOS} servicioActivoId={servicioSel} onSeleccionarServicio={setServicioSel} isDark={isDark} />
            </div>
          </section>
        )}

        {tabActiva === 'simulador' && (
          <SimulatorPanel
            servicio={servicio}
            lluvia={lluvia}
            setLluvia={setLluvia}
            puente={puente}
            setPuente={setPuente}
            quincena={quincena}
            setQuincena={setQuincena}
            carnaval={carnaval}
            setCarnaval={setCarnaval}
            proyeccion={proyeccion}
            isDark={isDark}
          />
        )}

        {tabActiva === 'metodologia' && <Metodologia />}
      </main>

      <footer className="border-t border-[#EDF3DC] dark:border-[#0E3B39] py-5 px-6 text-center text-xs font-medium text-[#4A4466]/70 dark:text-[#8BBB92]/70 bg-[#F4F9EA]/50 dark:bg-[#12544F]/50 transition-colors">
        <p>Hospital Universidad del Norte · Monitoreo y Simulación de Demanda</p>
      </footer>
    </div>
  );
}
