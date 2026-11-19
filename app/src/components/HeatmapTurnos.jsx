import { useEffect, useState } from 'react';
import { CircleHelp, Flame } from 'lucide-react';
import { getTurnos } from '../lib/api';

const FRANJAS_DEFAULT = ['Mañana (06-12h)', 'Tarde (12-18h)', 'Noche (18-24h)', 'Madrugada (00-06h)'];
const DIAS_DEFAULT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Diccionario en memoria que almacena las matrices descargadas (0ms de latencia en cambios de tab)
const turnosCache = {};

export function HeatmapTurnos({ servicio, isDark }) {
  const [respuesta, setRespuesta] = useState(() => ({
    servicioId: servicio.id, datos: turnosCache[servicio.id] || null,
  }));
  const [error, setError] = useState(null);
  const datosTurnos = respuesta.servicioId === servicio.id ? respuesta.datos : null;

  // Consulta al backend para obtener la matriz calculada en el servidor (con caché en memoria)
  useEffect(() => {
    let cancelado = false;
    setError(null);
    setRespuesta({ servicioId: servicio.id, datos: null });

    // Si ya existe en el diccionario, no hace petición HTTP
    if (turnosCache[servicio.id]) {
      setRespuesta({ servicioId: servicio.id, datos: turnosCache[servicio.id] });
      return;
    }

    async function cargarTurnos() {
      try {
        const data = await getTurnos(servicio.id);
        turnosCache[servicio.id] = data; // Guardado en el diccionario
        if (!cancelado) setRespuesta({ servicioId: servicio.id, datos: data });
      } catch {
        if (!cancelado) setError('No se pudo cargar la matriz de este servicio.');
      }
    }
    cargarTurnos();
    return () => {
      cancelado = true;
    };
  }, [servicio.id]);

  const franjas = datosTurnos?.franjas || FRANJAS_DEFAULT;
  const dias = datosTurnos?.dias || DIAS_DEFAULT;

  // Sin datos no se inventa una distribución ni se conserva la de otro servicio.
  const matriz = datosTurnos?.matriz || [];

  const getCellColor = (nivel) => {
    if (nivel === 'rojo') {
      return isDark
        ? 'bg-[#C5304C]/35 text-[#FFA8B6] border-[#C5304C]/80 shadow-2xs font-extrabold'
        : 'bg-[#FEECEF] text-[#781827] border-[#F1A5B4] font-extrabold';
    }
    if (nivel === 'amarillo') {
      return isDark
        ? 'bg-[#D98A00]/30 text-[#FFD875] border-[#D98A00]/80 font-bold'
        : 'bg-[#FEF7D6] text-[#663E00] border-[#E0BA42] font-bold';
    }
    if (nivel === 'verde') {
      return isDark
        ? 'bg-[#0E3E5B] text-[#D8EFF7] border-[#1B8CC9]'
        : 'bg-[#EBF5EE] text-[#14472C] border-[#71B5CC] font-semibold';
    }
    // Valle
    return isDark
      ? 'bg-[#071B2A] text-[#B9E2F0] border-[#19506B]'
      : 'bg-[#F7FAFC] text-[#332E47] border-[#D1DEE7] font-medium';
  };

  return (
    <section className="rounded-3xl p-6 border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] transition-colors flex flex-col justify-between">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-2">
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#102A43] dark:text-[#D8EFF7]">
              <Flame className="h-5 w-5 text-[#14516B] dark:text-[#B9E2F0]" />
              Afluencia por Turno
            </h2>
            <p className="text-xs font-semibold mt-0.5 text-[#102A43] dark:text-[#D8EFF7]">
              Distribución de pacientes según día y guardia horaria
            </p>
            <CircleHelp className="mt-1 h-4 w-4 shrink-0 text-[#14516B] dark:text-[#B9E2F0]" title="Razón respecto al promedio de cada franja, no percentiles" />
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#14472C] dark:text-[#D8EFF7]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#A9D6B5] dark:bg-[#0E3E5B] border border-[#14516B]" /> Baja/Normal: &lt; 0.85× promedio/franja
            </span>
            <span className="flex items-center gap-1.5 text-[#663E00] dark:text-[#FFD875]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#F0C86A] dark:bg-[#D98A00]" /> Media/Alerta: 0.85×–1.25×
            </span>
            <span className="flex items-center gap-1.5 text-[#781827] dark:text-[#FFA8B6]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#D96B78]" /> Alta/Pico: &gt; 1.25×
            </span>
          </div>
        </header>

        {!datosTurnos && <p role="status">{error || 'Cargando matriz del servicio…'}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-num text-center border-collapse">
            <thead>
              <tr>
                <th className="p-2.5 text-left font-sans font-extrabold text-[#102A43] dark:text-[#D8EFF7]">
                  Guardia
                </th>
                {dias.map((dia) => (
                  <th
                    key={dia}
                    className="p-2 font-heading font-extrabold text-[#102A43] dark:text-[#D8EFF7]"
                  >
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.map((fila, fIdx) => (
                <tr key={franjas[fIdx] || fIdx}>
                  <td className="p-2 text-left font-sans font-bold text-[#102A43] dark:text-[#D8EFF7]">
                    {franjas[fIdx]}
                  </td>
                  {fila.map((celda, dIdx) => (
                    <td key={dIdx} className="p-1">
                      <div
                        className={`py-2 px-1 rounded-xl border transition-all ${getCellColor(
                          celda.nivel
                        )}`}
                      >
                        {celda.estimado}
                        <span className="block text-[10px] font-semibold text-[#102A43] dark:text-[#D8EFF7]">pac.</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-4 pt-3 border-t border-[#D1DEE7] dark:border-[#19506B] text-[11px] text-[#102A43] dark:text-[#D8EFF7] leading-relaxed font-sans font-medium">
        💡 <strong>Cómo leer esta tabla:</strong> Las celdas rojas marcan las horas con mayor congestión donde se recomienda reforzar la atención médica inicial.
      </footer>
    </section>
  );
}
