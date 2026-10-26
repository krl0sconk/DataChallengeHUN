import React, { useState } from 'react';
import {
  DemandChart,
  Header,
  Metodologia,
  NavTabs,
  SimulatorPanel,
  StatCardGrid,
} from './components';
import { useDemandaSimulator } from './hooks/useDemandaSimulator';

/**
 * Componente raíz refactorizado:
 * - Arquitectura desacoplada y modular
 * - HTML semántico y accesibilidad A11y
 * - Lógica de negocio extraída a useDemandaSimulator
 */
export default function App() {
  const [tabActiva, setTabActiva] = useState('panel');

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
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Header con selector de servicio */}
      <Header
        servicios={serviciosDisponibles}
        servicioActivoId={servicioActivoId}
        onSeleccionarServicio={setServicioActivoId}
      />

      {/* 2. Pestañas de Navegación Semántica */}
      <NavTabs tabActiva={tabActiva} onCambiarTab={setTabActiva} />

      {/* 3. Contenedor Principal Semántico */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full space-y-6">
        {tabActiva === 'panel' && (
          <section
            role="tabpanel"
            id="panel-panel"
            aria-labelledby="tab-panel"
            className="space-y-6"
          >
            <StatCardGrid
              alerta={resultado.alerta}
              prediccion={resultado.prediccion}
              p10={resultado.p10}
              p90={resultado.p90}
              servicio={servicio}
            />
            <DemandChart serie7d={resultado.serie7d} servicio={servicio} />
          </section>
        )}

        {tabActiva === 'simulador' && (
          <section
            role="tabpanel"
            id="panel-simulador"
            aria-labelledby="tab-simulador"
          >
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
            />
          </section>
        )}

        {tabActiva === 'metodologia' && (
          <section
            role="tabpanel"
            id="panel-metodologia"
            aria-labelledby="tab-metodologia"
          >
            <Metodologia />
          </section>
        )}
      </main>

      {/* 4. Footer Semántico */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          Hospital Universidad del Norte · Predicción y Control de Flujo de Pacientes · Sprint 2 (Web & Validación)
        </p>
      </footer>
    </div>
  );
}
