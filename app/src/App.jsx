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
    serviciosDisponibles,
    servicioActivoId,
    setServicioActivoId,
    lluviaMm,
    setLluviaMm,
    esFestivo,
    setEsFestivo,
    esQuincena,
    setEsQuincena,
    esCarnaval,
    setEsCarnaval,
    resultado,
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
        servicios={serviciosDisponibles}
        servicioActivoId={servicioActivoId}
        onSeleccionarServicio={setServicioActivoId}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      <NavTabs tabActiva={tabActiva} onCambiarTab={setTabActiva} isDark={isDark} />

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {tabActiva === 'panel' && (
          <section className="space-y-6">
            <StatCardGrid
              alerta={resultado.alerta}
              prediccion={resultado.prediccion}
              p10={resultado.p10}
              p90={resultado.p90}
              servicio={servicio}
              isDark={isDark}
            />
            <DemandChart serie7d={resultado.serie7d} servicio={servicio} isDark={isDark} />
          </section>
        )}

        {tabActiva === 'simulador' && (
          <SimulatorPanel
            servicio={servicio}
            lluviaMm={lluviaMm}
            setLluviaMm={setLluviaMm}
            esFestivo={esFestivo}
            setEsFestivo={setEsFestivo}
            esQuincena={esQuincena}
            setEsQuincena={setEsQuincena}
            esCarnaval={esCarnaval}
            setEsCarnaval={setEsCarnaval}
            resultado={resultado}
            isDark={isDark}
          />
        )}

        {tabActiva === 'metodologia' && <Metodologia isDark={isDark} />}
      </main>

      <footer
        className={`border-t py-6 px-6 text-center text-xs font-semibold transition-colors ${
          isDark
            ? 'border-[#2e3748] bg-[#161c28] text-slate-400'
            : 'border-stone-200 bg-[#fdfbf7] text-stone-500'
        }`}
      >
        <p>
          Hospital Universidad del Norte · Predicción y Control de Flujo de Pacientes · Sprint 2 (Web & Validación)
        </p>
      </footer>
    </div>
  );
}
