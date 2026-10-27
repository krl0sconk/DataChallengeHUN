import { Flame } from 'lucide-react';

const FRANJAS = ['Mañana (06-12h)', 'Tarde (12-18h)', 'Noche (18-24h)', 'Madrugada (00-06h)'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

  const matriz = FRANJAS.map((franja, fIdx) => {
    return DIAS.map((dia, dIdx) => {
      const estimado = Math.round(baseDiaria * fDia[dIdx] * fTurno[fIdx]);
      const ratio = fDia[dIdx] * (fTurno[fIdx] / 0.35);
      return { dia, franja, estimado, ratio };
    });
  });

  const getCellColor = (ratio) => {
    if (ratio >= 1.25) {
      // Nivel Rojo - Pico
      return isDark
        ? 'bg-[#C5304C]/35 text-[#FFA8B6] border-[#C5304C]/70 shadow-2xs font-extrabold'
        : 'bg-[#FDF0F2] text-[#8A2434] border-[#F4C5CD] font-extrabold';
    }
    if (ratio >= 1.0) {
      // Nivel Amarillo / Ámbar visible en ambos modos
      return isDark
        ? 'bg-[#D98A00]/30 text-[#FFD875] border-[#D98A00]/70 font-bold'
        : 'bg-[#FFFBEA] text-[#8C5800] border-[#FFEBB8] font-bold';
    }
    if (ratio >= 0.5) {
      // Nivel Verde / Normal
      return isDark
        ? 'bg-[#12544F]/80 text-[#8BBB92] border-[#2A835F]/60'
        : 'bg-[#F2F8F4] text-[#205C3B] border-[#9FCBAD]/60';
    }
    // Nivel Valle
    return isDark
      ? 'bg-[#092328]/60 text-[#8BBB92]/40 border-[#0E3B39]'
      : 'bg-[#FAFCF6] text-[#4A4466]/40 border-[#EDF3DC]';
  };

  return (
    <section className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] transition-colors flex flex-col justify-between">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
              <Flame className="h-5 w-5 text-[#3B7D8C] dark:text-[#8BBB92]" />
              Afluencia por Turno
            </h2>
            <p className="text-xs font-medium mt-0.5 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
              Distribución de pacientes según día y guardia horaria
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[#205C3B] dark:text-[#8BBB92]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#9FCBAD] dark:bg-[#12544F] border border-[#2A835F]" /> Normal
            </span>
            <span className="flex items-center gap-1.5 text-[#8C5800] dark:text-[#FFD875]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#FFEBB8] dark:bg-[#D98A00]" /> Concurrido
            </span>
            <span className="flex items-center gap-1.5 text-[#8A2434] dark:text-[#FFA8B6]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#C5304C]" /> Pico Crítico
            </span>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-num text-center border-collapse">
            <thead>
              <tr>
                <th className="p-2.5 text-left font-sans font-bold text-[#4A4466]/70 dark:text-[#8BBB92]/70">
                  Guardia
                </th>
                {DIAS.map((dia) => (
                  <th
                    key={dia}
                    className="p-2 font-heading font-bold text-[#4A4466] dark:text-[#8BBB92]"
                  >
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.map((fila, fIdx) => (
                <tr key={FRANJAS[fIdx]}>
                  <td className="p-2 text-left font-sans font-semibold text-[#4A4466] dark:text-[#8BBB92]">
                    {FRANJAS[fIdx]}
                  </td>
                  {fila.map((celda, dIdx) => (
                    <td key={dIdx} className="p-1">
                      <div
                        className={`py-2 px-1 rounded-xl border transition-all ${getCellColor(
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
      </div>

      <footer className="mt-4 pt-3 border-t border-[#EDF3DC] dark:border-[#0E3B39] text-[11px] text-[#4A4466]/80 dark:text-[#8BBB92]/80 leading-relaxed font-sans">
        💡 <strong>Cómo leer esta tabla:</strong> Las celdas rojas marcan las horas con mayor congestión donde se recomienda reforzar personal médico en triaje.
      </footer>
    </section>
  );
}
