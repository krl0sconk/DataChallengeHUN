import { useState } from 'react';
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
    <div className="min-h-screen flex flex-col font-sans bg-[#FAFCF6] text-[#4A4466]">
      <Header
        servicios={listaServicios}
        servicioActivoId={servicioSel}
        onSeleccionarServicio={setServicioSel}
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
            <DemandChart serie7d={proyeccion.serie7d} servicio={servicio} />
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
          />
        )}

        {tabActiva === 'metodologia' && <Metodologia />}
      </main>

      <footer className="border-t border-[#EDF3DC] py-5 px-6 text-center text-xs font-medium text-[#4A4466]/70 bg-[#F4F9EA]/50">
        <p>Hospital Universidad del Norte · Monitoreo y Simulación de Demanda</p>
      </footer>
    </div>
  );
}
