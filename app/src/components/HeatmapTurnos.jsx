import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const FRANJAS_DEFAULT = ['Mañana (06-12h)', 'Tarde (12-18h)', 'Noche (18-24h)', 'Madrugada (00-06h)'];
const DIAS_DEFAULT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Diccionario en memoria que almacena las matrices descargadas (0ms de latencia en cambios de tab)
const turnosCache = {};

export function HeatmapTurnos({ servicio, isDark }) {
  const [datosTurnos, setDatosTurnos] = useState(() => turnosCache[servicio.id] || null);

  // Consulta al backend para obtener la matriz calculada en el servidor (con caché en memoria)
  useEffect(() => {
    let cancelado = false;

    // Si ya existe en el diccionario, no hace petición HTTP
    if (turnosCache[servicio.id]) {
      setDatosTurnos(turnosCache[servicio.id]);
      return;
    }

    async function cargarTurnos() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/turnos/${servicio.id}`);
        if (res.ok) {
          const data = await res.json();
          turnosCache[servicio.id] = data; // Guardado en el diccionario
          if (!cancelado) setDatosTurnos(data);
        }
      } catch {
        // Fallback defensivo silencioso
      }
    }
    cargarTurnos();
    return () => {
      cancelado = true;
    };
  }, [servicio.id]);

  const franjas = datosTurnos?.franjas || FRANJAS_DEFAULT;
  const dias = datosTurnos?.dias || DIAS_DEFAULT;

  // Si aún no responde la API remota, estructura básica
  const matriz = datosTurnos?.matriz || franjas.map((franja) =>
    dias.map((dia) => ({
      dia,
      franja,
      estimado: Math.round(servicio.mediaDiaria / 4),
      ratio: 1.0,
      nivel: 'amarillo',
    }))
  );

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
        ? 'bg-[#12544F] text-[#C4E5CA] border-[#2A835F]'
        : 'bg-[#EBF5EE] text-[#14472C] border-[#7CB592] font-semibold';
    }
    // Valle
    return isDark
      ? 'bg-[#071D22] text-[#A8D4AE] border-[#1B524F]'
      : 'bg-[#F4F9EA] text-[#332E47] border-[#D6E0C2] font-medium';
  };

  return (
    <section className="rounded-3xl p-6 border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] transition-colors flex flex-col justify-between">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#2D283E] dark:text-[#C4E5CA]">
              <Flame className="h-5 w-5 text-[#1E4D57] dark:text-[#A8E2AF]" />
              Afluencia por Turno
            </h2>
            <p className="text-xs font-semibold mt-0.5 text-[#2D283E] dark:text-[#C4E5CA]">
              Distribución de pacientes según día y guardia horaria
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#14472C] dark:text-[#C4E5CA]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#7CB592] dark:bg-[#12544F] border border-[#14472C]" /> Normal
            </span>
            <span className="flex items-center gap-1.5 text-[#663E00] dark:text-[#FFD875]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#E0BA42] dark:bg-[#D98A00]" /> Concurrido
            </span>
            <span className="flex items-center gap-1.5 text-[#781827] dark:text-[#FFA8B6]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#C5304C]" /> Pico Crítico
            </span>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-num text-center border-collapse">
            <thead>
              <tr>
                <th className="p-2.5 text-left font-sans font-extrabold text-[#2D283E] dark:text-[#C4E5CA]">
                  Guardia
                </th>
                {dias.map((dia) => (
                  <th
                    key={dia}
                    className="p-2 font-heading font-extrabold text-[#2D283E] dark:text-[#C4E5CA]"
                  >
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.map((fila, fIdx) => (
                <tr key={franjas[fIdx] || fIdx}>
                  <td className="p-2 text-left font-sans font-bold text-[#2D283E] dark:text-[#C4E5CA]">
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
                        <span className="block text-[10px] font-semibold text-[#2D283E] dark:text-[#C4E5CA]">pac.</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-4 pt-3 border-t border-[#D6E0C2] dark:border-[#1B524F] text-[11px] text-[#2D283E] dark:text-[#C4E5CA] leading-relaxed font-sans font-medium">
        💡 <strong>Cómo leer esta tabla:</strong> Las celdas rojas marcan las horas con mayor congestión donde se recomienda reforzar la atención médica inicial.
      </footer>
    </section>
  );
}
