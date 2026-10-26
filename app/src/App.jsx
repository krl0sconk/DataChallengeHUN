import { useState, useEffect } from 'react';
import {
  DemandChart,
  Header,
  Metodologia,
  NavTabs,
  SimulatorPanel,
  StatCardGrid,
} from './components';
import { useDemandaSimulator } from './hooks/useDemandaSimulator';

export default function App() {
  const [tabActiva, setTabActiva] = useState('panel');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('hun-theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('hun-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

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
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark
          ? 'bg-[#121620] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200'
          : 'bg-[#faf8f5] text-stone-800 selection:bg-sky-200 selection:text-sky-900'
      }`}
    >
      <Header
        servicios={listaServicios}
        servicioActivoId={servicioSel}
        onSeleccionarServicio={setServicioSel}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      <NavTabs tabActiva={tabActiva} onCambiarTab={setTabActiva} isDark={isDark} />

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {tabActiva === 'panel' && (
          <section className="space-y-6">
            <StatCardGrid
              alerta={proyeccion.alerta}
              prediccion={proyeccion.prediccion}
              p10={proyeccion.min}
              p90={proyeccion.max}
              servicio={servicio}
              isDark={isDark}
            />
            <DemandChart serie7d={proyeccion.serie7d} servicio={servicio} isDark={isDark} />
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

        {tabActiva === 'metodologia' && <Metodologia isDark={isDark} />}
      </main>

      <footer
        className={`border-t py-5 px-6 text-center text-xs font-medium transition-colors ${
          isDark
            ? 'border-[#2e3748] bg-[#161c28] text-slate-400'
            : 'border-stone-200 bg-[#fdfbf7] text-stone-500'
        }`}
      >
        <p>Hospital Universidad del Norte · Monitoreo y Simulación de Demanda</p>
      </footer>
    </div>
  );
}
