import { Flame } from 'lucide-react';

// Distribución horaria típica hospitalaria calculada sobre series agregadas
const FRANJAS = ['Mañana (06-12h)', 'Tarde (12-18h)', 'Noche (18-24h)', 'Madrugada (00-06h)'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Coeficientes empíricos según estacionalidad del servicio
const FACTORES_TURNO = {
  urgencias: [0.38, 0.34, 0.20, 0.08],
  rehabilitacion: [0.55, 0.42, 0.03, 0.00],
  tratamiento_urgencia: [0.35, 0.35, 0.22, 0.08],
};

const FACTORES_DIA = {
  urgencias: [1.18, 1.05, 1.00, 0.98, 1.08, 0.92, 0.79],
  rehabilitacion: [1.12, 1.08, 1.06, 1.04, 0.95, 0.40, 0.05],
  tratamiento_urgencia: [1.15, 1.02, 0.98, 0.96, 1.06, 0.95, 0.88],
};

export function HeatmapTurnos({ servicio, isDark }) {
  const fTurno = FACTORES_TURNO[servicio.id] || FACTORES_TURNO.urgencias;
  const fDia = FACTORES_DIA[servicio.id] || FACTORES_DIA.urgencias;
  const baseDiaria = servicio.mediaDiaria;

  // Calcula valor y semáforo relativo para cada celda
  const matriz = FRANJAS.map((franja, fIdx) => {
    return DIAS.map((dia, dIdx) => {
      const estimado = Math.round(baseDiaria * fDia[dIdx] * fTurno[fIdx]);
      // Nivel de intensidad relativo al turno
      const ratio = fDia[dIdx] * (fTurno[fIdx] / 0.35);
      return { dia, franja, estimado, ratio };
    });
  });

  const getCellColor = (ratio) => {
    if (ratio >= 1.25) {
      return isDark
        ? 'bg-[#8A2434]/70 text-[#FFF] border-[#F4C5CD]/40'
        : 'bg-[#FDF0F2] text-[#8A2434] border-[#F4C5CD]';
    }
    if (ratio >= 1.0) {
      return isDark
        ? 'bg-[#2A835F] text-[#8BBB92] border-[#8C5800]/50'
        : 'bg-[#FFFBEA] text-[#8C5800] border-[#F1F7D4]';
    }
    if (ratio >= 0.5) {
      return isDark
        ? 'bg-[#092328] text-[#8BBB92] border-[#0E3B39]'
        : 'bg-[#F2F8F4] text-[#205C3B] border-[#9FCBAD]/60';
    }
    return isDark
      ? 'bg-[#092328]/40 text-[#8BBB92]/40 border-transparent'
      : 'bg-[#FAFCF6] text-[#4A4466]/40 border-[#EDF3DC]';
  };

  return (
    <section className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] transition-colors">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
            <Flame className="h-5 w-5 text-[#3B7D8C] dark:text-[#9FCBAD]" />
            Patrón de Afluencia por Día y Turno Horario
          </h2>
          <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
            Estimación de llegadas por guardia asistencial en {servicio.nombre}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[#205C3B] dark:text-[#9FCBAD]">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#9FCBAD]" /> Valle
          </span>
          <span className="flex items-center gap-1.5 text-[#8C5800] dark:text-[#F1F7D4]">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#F1F7D4]" /> Normal
          </span>
          <span className="flex items-center gap-1.5 text-[#8A2434] dark:text-[#F4C5CD]">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#8A2434]" /> Pico
          </span>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono-num text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 text-left font-sans font-bold text-[#4A4466]/70 dark:text-[#8BBB92]/70">
                Guardia / Turno
              </th>
              {DIAS.map((dia) => (
                <th
                  key={dia}
                  className="p-2.5 font-heading font-bold text-[#4A4466] dark:text-[#8BBB92]"
                >
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.map((fila, fIdx) => (
              <tr key={FRANJAS[fIdx]}>
                <td className="p-2.5 text-left font-sans font-semibold text-[#4A4466] dark:text-[#8BBB92]">
                  {FRANJAS[fIdx]}
                </td>
                {fila.map((celda, dIdx) => (
                  <td key={dIdx} className="p-1">
                    <div
                      className={`py-2 px-1 rounded-xl border font-bold transition-all ${getCellColor(
                        celda.ratio
                      )}`}
                    >
                      {celda.estimado}
                      <span className="block text-[10px] font-normal opacity-70">pac.</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
