import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Code2,
  Copy,
  Database,
  FileCode2,
  Flame,
  Layers,
  LineChart,
  PieChart,
  Terminal,
  TrendingUp,
  Users,
} from 'lucide-react';
import celdasNotebook from '../constants/notebookJuan.json';

// Estructura oficial del análisis de Juan documentada en docs/inventario_base.md y AI.md
const HALLAZGOS_OFICIALES_INVENTARIO = [
  {
    tema: '1. Validación de Horas Reales (Urgencias vs Rehab)',
    fuente: 'docs/inventario_base.md (Tarea #17 / #13)',
    detalle: 'En Urgencias las horas son reales: solo el 1.7% inicia en minuto 0 (lo esperado por azar) y el 0.0003% a medianoche, con pico entre 08h y 13h. En Rehabilitación el 34% empieza en minuto 0 al ser citas programadas (0.08% domingos).',
    estado: 'Verificado en inventario',
  },
  {
    tema: '2. Ausencia de Censo en visit_occurrence',
    fuente: 'docs/inventario_base.md & AI.md sección 2',
    detalle: 'En visit_occurrence la duración es 0 horas en toda la base (visit_end_datetime = visit_start_datetime). El censo hospitalario real no se puede calcular allí y depende de las etapas de visit_detail.',
    estado: 'Limitación documentada',
  },
  {
    tema: '3. Duraciones Reales de Etapas (visit_detail)',
    fuente: 'docs/inventario_base.md & objetivo_prediccion.md',
    detalle: 'Permanencia por etapas: ~3 min en registro inicial de urgencias, ~1.3 horas de mediana en tratamiento de urgencias, y ~46 horas de estancia para pacientes transferidos a hospitalización.',
    estado: 'Verificado en inventario',
  },
];

export function NotebookViewer() {
  const [copiadoId, setCopiadoId] = useState(null);
  const [vista, setVista] = useState('hallazgos'); // 'hallazgos' | 'codigo'

  const copiarCodigo = (id, texto) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  return (
    <article className="rounded-3xl p-6 sm:p-8 border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] space-y-8 text-sm text-[#102A43] dark:text-[#D8EFF7] shadow-xs transition-colors">
      {/* Cabecera Interactiva */}
      <header className="border-b border-[#D1DEE7] dark:border-[#19506B] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCEFF7] dark:bg-[#071B2A] text-[#14516B] dark:text-[#B9E2F0]">
              <FileCode2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold font-heading text-[#102A43] dark:text-[#D8EFF7]">
                  Exploración de Flujo y Cuellos de Botella
                </h2>
                <span className="rounded-full bg-[#DCEFF7] dark:bg-[#071B2A] border border-[#71B5CC] dark:border-[#176D98] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#14516B] dark:text-[#B9E2F0]">
                  Análisis Exploratorio · Tarea #13
                </span>
              </div>
              <p className="text-xs font-semibold mt-1 text-[#102A43] dark:text-[#D8EFF7]">
                Archivo fuente: <code>notebooks/01_exploracion/01_exploracion_jn_flujo.ipynb</code> (Sprint 1)
              </p>
            </div>
          </div>

          {/* Alternador entre Vista de Hallazgos y Código */}
          <div className="flex items-center rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] p-1 shadow-2xs">
            <button
              onClick={() => setVista('hallazgos')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                vista === 'hallazgos'
                  ? 'bg-[#14516B] dark:bg-[#176D98] text-white shadow-2xs'
                  : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7]'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Hallazgos del Inventario</span>
            </button>
            <button
              onClick={() => setVista('codigo')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                vista === 'codigo'
                  ? 'bg-[#14516B] dark:bg-[#176D98] text-white shadow-2xs'
                  : 'text-[#102A43] dark:text-[#D8EFF7] hover:bg-[#DCEFF7]'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Celdas del Notebook</span>
            </button>
          </div>
        </div>
      </header>

      {/* VISTA 1: HALLAZGOS VERIFICADOS DEL INVENTARIO (100% CANÓNICO) */}
      {vista === 'hallazgos' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#E8F6FA] dark:bg-[#071B2A] border border-[#71B5CC] dark:border-[#176D98] text-xs font-medium text-[#0C4A62] dark:text-[#9FE4F5]">
            ✅ <strong>Cumplimiento Regla 3 AI.md ("No inventar resultados"):</strong> Las cifras mostradas provienen estrictamente de las extracciones cerradas en <code>docs/inventario_base.md</code> y <code>docs/objetivo_prediccion.md</code>. Los gráficos aún no ejecutados en la VPN se mantienen como tareas pendientes en <code>docs/hallazgos.md</code>.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HALLAZGOS_OFICIALES_INVENTARIO.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#14516B] dark:text-[#B9E2F0]">
                      {item.fuente}
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white dark:bg-[#0E3E5B] border border-[#71B5CC] text-[#0C4A62] dark:text-[#9FE4F5]">
                      {item.estado}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xs text-[#102A43] dark:text-[#D8EFF7]">
                    {item.tema}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#102A43] dark:text-[#D8EFF7] font-medium">
                    {item.detalle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Plantilla y Plan del Sprint 2 para Juan */}
          <div className="p-5 rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#071B2A] space-y-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#14516B] dark:text-[#B9E2F0] flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Preguntas de Investigación Abiertas para el Sprint 2 (docs/hallazgos.md)
            </h3>
            <ul className="text-xs space-y-2 list-disc list-inside font-medium text-[#102A43] dark:text-[#D8EFF7]">
              <li><strong>Cuándo:</strong> Curvas agregadas por hora y día de la semana (salida pendiente <code>01_llegadas_dia_hora.png</code>).</li>
              <li><strong>Quién:</strong> Diferencias de flujo por sexo y grupos etarios por servicio.</li>
              <li><strong>Dónde:</strong> Pasos entre etapas con mayor espera y franjas horarias con etapas más prolongadas (<code>03_duracion_etapas_franja.png</code>).</li>
              <li><strong>Saturación:</strong> Horas donde el censo p90 se separa de la mediana (<code>04_censo_etapas.png</code>).</li>
            </ul>
          </div>
        </div>
      )}

      {/* VISTA 2: CÓDIGO PYTHON ORIGINAL DEL NOTEBOOK */}
      {vista === 'codigo' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-[#F7FAFC] dark:bg-[#071B2A] border border-[#D1DEE7] dark:border-[#19506B] text-xs font-semibold">
            💻 Código fuente original de Jupyter extraído de <code>01_exploracion_jn_flujo.ipynb</code>. Puedes copiar cualquier bloque con un clic.
          </div>

          {celdasNotebook.map((celda) => {
            if (celda.type === 'markdown') {
              return (
                <div
                  key={celda.id}
                  className="p-4 rounded-2xl bg-[#F7FAFC] dark:bg-[#071B2A] border border-[#D1DEE7] dark:border-[#19506B] text-xs font-medium whitespace-pre-line text-[#102A43] dark:text-[#D8EFF7]"
                >
                  <div className="text-[10px] font-bold text-[#14516B] dark:text-[#B9E2F0] uppercase tracking-wider mb-1 opacity-70">
                    Markdown #{celda.id}
                  </div>
                  {celda.source}
                </div>
              );
            }

            if (celda.type === 'code') {
              const copiado = copiadoId === celda.id;
              return (
                <div
                  key={celda.id}
                  className="rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#0F172A] text-[#F8FAFC] overflow-hidden text-xs font-mono shadow-sm"
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-[#1E293B] border-b border-[#334155]">
                    <span className="text-[#94A3B8] font-bold">In [{celda.id}]: Python 3</span>
                    <button
                      onClick={() => copiarCodigo(celda.id, celda.source)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0F172A] hover:bg-[#334155] text-white transition-colors cursor-pointer text-[11px] font-bold"
                    >
                      {copiado ? <Check className="h-3 w-3 text-[#4ADE80]" /> : <Copy className="h-3 w-3" />}
                      <span>{copiado ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto leading-relaxed">
                    <code>{celda.source}</code>
                  </pre>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Pie Institucional */}
      <footer className="pt-4 border-t border-[#D1DEE7] dark:border-[#19506B] text-xs font-semibold text-[#102A43] dark:text-[#D8EFF7] flex flex-wrap items-center justify-between gap-4">
        <span>Fuente oficial: <code>notebooks/01_exploracion/</code> · Análisis de Flujo de Pacientes</span>
        <span className="font-mono text-[11px]">Sprint 1 & 2 · Hospital Universidad del Norte</span>
      </footer>
    </article>
  );
}

