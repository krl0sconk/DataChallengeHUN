import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Database,
  ExternalLink,
  Eye,
  FileCode2,
  Flame,
  Layers,
  LineChart,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import celdasNotebook from '../constants/notebookJuan.json';

const FIGURAS_EXPLORACION = [
  {
    id: '01',
    archivo: '/figures/exploracion/01_llegadas_dia_hora.png',
    titulo: '1. Llegadas por Día de la Semana y Hora',
    subtitulo: 'Curvas de afluencia horaria según servicio clínico',
    servicio: 'Urgencias & Rehabilitación',
    hallazgos: [
      'Urgencias (OMOP 9203): Pico matutino marcado entre las 08:00 y las 14:00 (máximo entre 10:00 y 11:00 con ~25–30 ingresos/hora). Disminución continua durante la noche.',
      'Efecto Lunes: El lunes es el día de máxima afluencia asistencial (16,49% del volumen semanal total), decreciendo de manera constante hasta el domingo (11,11%).',
      'Rehabilitación Ambulatoria (581479): Actividad 100% diurna programada de lunes a viernes (07:00 a 17:00). Actividad residual los sábados (3,66%) y nula los domingos (0,08%).',
    ],
  },
  {
    id: '02',
    archivo: '/figures/exploracion/02_tendencia.png',
    titulo: '2. Tendencia Histórica y Estacionalidad Anual',
    subtitulo: 'Serie temporal continua 2023–2026 y factores externos',
    servicio: 'Todos los Servicios',
    hallazgos: [
      'Volumen histórico continuo y balanceado a lo largo del periodo 2023–2026 sin vacíos de registro.',
      'Valles estacionales profundos: Caída drástica de admisiones en Semana Santa, Carnaval de Barranquilla (lunes y martes) y festividades decembrinas (24–25 dic y 31 dic–1 ene).',
      'Crecimiento tendencial: Expansión sostenida del volumen de consultas en rehabilitación ambulatoria a partir del primer trimestre de 2024.',
    ],
  },
  {
    id: '03',
    archivo: '/figures/exploracion/03_duracion_etapas_franja.png',
    titulo: '3. Duración de Etapas según Franja Horaria',
    subtitulo: 'Tiempos de ciclo y dispersión del percentil 90',
    servicio: 'Hospitalización & Observación',
    hallazgos: [
      'Hospitalización (9201): Ingresos iniciados en la tarde, noche o fines de semana presentan duraciones acumuladas superiores (p50 ~46 h, p90 ~186 h) frente a ingresos matutinos en días hábiles.',
      'Urgencia - tratamiento (3045729): Los pacientes ingresados en tarde/noche prolongan su observación (el percentil p90 sube de 1,2 h hasta más de 12–15 h).',
      'Cuello de botella Urgencias → Hospitalización: Mediana de traslado de 2,1 h, pero con un p90 crítico de 24,5 h por retención al aguardar desocupación de camas de piso.',
    ],
  },
  {
    id: '04',
    archivo: '/figures/exploracion/04_censo_etapas.png',
    titulo: '4. Censo Concurrente y Presión Asistencial',
    subtitulo: 'Detección empírica de episodios de saturación',
    servicio: 'Urgencia - tratamiento & Piso',
    hallazgos: [
      'Urgencia - tratamiento (3045729): El censo p90 se dispara entre las 14:00 y las 20:00 horas alcanzando entre 35 y 45 pacientes activos (frente a mediana basal de 18–22).',
      'Origen de la saturación: Acumulación vespertina en espera de resultados de laboratorio, imágenes diagnósticas o respuesta clínica a terapia endovenosa.',
      'Hospitalización (9201): Ocupación basal continua de 100–120 pacientes concurrentes, con percentil 90 que supera los 135–140 pacientes en sala.',
    ],
  },
];

const METRICAS_CALIDAD = [
  {
    parametro: 'Desfase de Fechas por Anonimización',
    resultado: '0 días (Fechas reales)',
    detalle: 'Confirmado por caída a 0,3% en citas de rehabilitación durante festivos colombianos (mínimo global con desfase 0).',
    estado: 'Verificado',
  },
  {
    parametro: 'Integridad de Fechas en visit_detail',
    resultado: '0,00% nulos / 0% invertidas',
    detalle: '100% de las 3.281.613 etapas clínicas tienen inicio y fin cronológicamente válidos.',
    estado: 'Óptimo',
  },
  {
    parametro: 'Espera Crítica Traslado a Cama',
    resultado: 'p90 = 24,5 horas',
    detalle: 'Transición Urgencias → Hospitalización evidencia congestión en picos vespertinos.',
    estado: 'Alerta Operativa',
  },
  {
    parametro: 'Población Pediátrica en Tratamiento',
    resultado: '41,6% menores (0–17 años)',
    detalle: 'Urgencia-tratamiento concentra fuerte demanda pediátrica (22,0% niños, 19,6% niñas).',
    estado: 'Foco Clínico',
  },
];

export function NotebookViewer() {
  const [copiadoId, setCopiadoId] = useState(null);
  const [vista, setVista] = useState('hallazgos'); // 'hallazgos' | 'figuras' | 'codigo'
  const [figuraAmpliada, setFiguraAmpliada] = useState(null);

  const copiarCodigo = (id, texto) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  return (
    <article className="rounded-3xl p-6 sm:p-8 border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#12544F] space-y-8 text-sm text-[#2D283E] dark:text-[#C4E5CA] shadow-xs transition-colors">
      {/* Cabecera Interactiva */}
      <header className="border-b border-[#D6E0C2] dark:border-[#1B524F] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E3ECCB] dark:bg-[#071D22] text-[#1E4D57] dark:text-[#A8E2AF]">
              <FileCode2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold font-heading text-[#2D283E] dark:text-[#C4E5CA]">
                  Exploración de Flujo, Calidad y Cuellos de Botella
                </h2>
                <span className="rounded-full bg-[#E3ECCB] dark:bg-[#071D22] border border-[#7CB592] dark:border-[#206E4E] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#1E4D57] dark:text-[#A8E2AF]">
                  Datos Reales OMOP · Sprint 1
                </span>
              </div>
              <p className="text-xs font-semibold mt-1 text-[#2D283E] dark:text-[#C4E5CA]">
                Notebooks: <code>01_exploracion_jn_flujo.ipynb</code> & <code>02_preparacion_jn_auditoria_calidad.ipynb</code>
              </p>
            </div>
          </div>

          {/* Selector de Vistas */}
          <div className="flex items-center rounded-2xl border border-[#D6E0C2] dark:border-[#1B524F] bg-[#F4F9EA] dark:bg-[#071D22] p-1 shadow-2xs">
            <button
              onClick={() => setVista('hallazgos')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                vista === 'hallazgos'
                  ? 'bg-[#1E4D57] dark:bg-[#206E4E] text-white shadow-2xs'
                  : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB]'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Hallazgos & Calidad</span>
            </button>
            <button
              onClick={() => setVista('figuras')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                vista === 'figuras'
                  ? 'bg-[#1E4D57] dark:bg-[#206E4E] text-white shadow-2xs'
                  : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Galería de Figuras ({FIGURAS_EXPLORACION.length})</span>
            </button>
            <button
              onClick={() => setVista('codigo')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                vista === 'codigo'
                  ? 'bg-[#1E4D57] dark:bg-[#206E4E] text-white shadow-2xs'
                  : 'text-[#2D283E] dark:text-[#C4E5CA] hover:bg-[#E3ECCB]'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Celdas Notebook</span>
            </button>
          </div>
        </div>
      </header>

      {/* VISTA 1: HALLAZGOS Y CALIDAD DE DATOS */}
      {vista === 'hallazgos' && (
        <div className="space-y-6">
          {/* Banner de Auditoría Cerrada */}
          <div className="p-4 rounded-2xl bg-[#EEF7F1] dark:bg-[#071D22] border border-[#7CB592] dark:border-[#206E4E] text-xs font-medium text-[#0E4222] dark:text-[#8AE6A2] flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[#1E6B3F] dark:text-[#4ADE80] shrink-0 mt-0.5" />
            <div>
              <strong>Auditoría de Calidad y Exploración Ejecutada con Éxito:</strong> Base clínica consolidada con 1.706.001 visitas y 3.281.613 etapas analizadas en el HUN. Las 4 figuras analíticas han sido generadas y validadas con el motor de inferencia y la base de datos OMOP (`docs/hallazgos.md` y `docs/calidad_datos.md`).
            </div>
          </div>

          {/* Cuadrícula de Métricas Clave de Auditoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICAS_CALIDAD.map((item, idx) => (
              <div
                key={idx}
                className="p-4.5 rounded-2xl border border-[#D6E0C2] dark:border-[#1B524F] bg-[#F4F9EA] dark:bg-[#071D22] space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1E4D57] dark:text-[#A8E2AF]">
                      {item.parametro}
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-white dark:bg-[#12544F] border border-[#7CB592] text-[#0E4222] dark:text-[#8AE6A2]">
                      {item.estado}
                    </span>
                  </div>
                  <div className="text-base font-black font-heading text-[#2D283E] dark:text-[#C4E5CA]">
                    {item.resultado}
                  </div>
                </div>
                <p className="text-xs text-[#2D283E]/80 dark:text-[#C4E5CA]/80 leading-relaxed font-medium">
                  {item.detalle}
                </p>
              </div>
            ))}
          </div>

          {/* Desglose Demográfico y Operativo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#071D22] space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#1E4D57] dark:text-[#A8E2AF] flex items-center gap-2">
                <Users className="h-4 w-4" />
                Diferencias Demográficas por Servicio (docs/hallazgos.md)
              </h3>
              <ul className="text-xs space-y-2 font-medium text-[#2D283E] dark:text-[#C4E5CA]">
                <li>
                  <strong>Urgencias (9203):</strong> Alta presencia de mujeres adultas jóvenes (23,9% de 18–39 años) y hombres de 18–39 (15,7%). La población pediátrica representa un notable 26,0% combinado.
                </li>
                <li>
                  <strong>Urgencias - Tratamiento (3045729):</strong> Fuerte concentración pediátrica: el grupo de 0–17 años representa el <strong>41,6%</strong> del servicio (22,0% niños, 19,6% niñas).
                </li>
                <li>
                  <strong>Hospitalización (9201):</strong> Predominio de mujeres en edad media (40–64 años: 24,7% mujeres vs 13,7% hombres) y adultos mayores de 65+ (10,6% mujeres vs 7,4% hombres).
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl border border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-[#071D22] space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#1E4D57] dark:text-[#A8E2AF] flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#C5304C]" />
                Puntos Críticos de Saturación Detectados
              </h3>
              <ul className="text-xs space-y-2 font-medium text-[#2D283E] dark:text-[#C4E5CA]">
                <li>
                  <strong>Cuello de Botella Vespertino (14h–20h):</strong> Urgencia-tratamiento alcanza un censo p90 de <strong>35–45 pacientes activos</strong> por acumulación de espera de paraclínicos e imágenes.
                </li>
                <li>
                  <strong>Transición Crítica a Camas:</strong> Urgencias → Hospitalización presenta una espera p90 de <strong>24,5 horas</strong> para asignación de cama de piso.
                </li>
                <li>
                  <strong>Efecto Rebote Post-Festivo:</strong> Caída en Nochebuena/Fin de Año (56–58% del volumen normal) compensada por rebotes de +14% a +16% los días inmediatamente posteriores.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: GALERÍA DE FIGURAS GENERADAS */}
      {vista === 'figuras' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {FIGURAS_EXPLORACION.map((fig) => (
              <div
                key={fig.id}
                className="rounded-2xl border border-[#D6E0C2] dark:border-[#1B524F] bg-[#FAFCF6] dark:bg-[#071D22] overflow-hidden flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="relative group cursor-pointer overflow-hidden border-b border-[#D6E0C2] dark:border-[#1B524F] bg-white dark:bg-black/30">
                    <img
                      src={fig.archivo}
                      alt={fig.titulo}
                      className="w-full h-56 object-contain p-2 group-hover:scale-[1.02] transition-transform duration-200"
                      onClick={() => setFiguraAmpliada(fig.archivo)}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden h-56 w-full items-center justify-center text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-800">
                      Archivo: {fig.archivo}
                    </div>
                    <div
                      onClick={() => setFiguraAmpliada(fig.archivo)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold"
                    >
                      <Eye className="h-4 w-4" /> Ampliar Gráfica
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#E3ECCB] dark:bg-[#12544F] text-[#1E4D57] dark:text-[#A8E2AF]">
                        {fig.servicio}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        Figura #{fig.id}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-[#2D283E] dark:text-[#C4E5CA]">
                      {fig.titulo}
                    </h3>
                    <p className="text-xs font-semibold text-[#2D283E]/70 dark:text-[#C4E5CA]/70">
                      {fig.subtitulo}
                    </p>
                    <ul className="text-xs space-y-1.5 list-disc list-inside font-medium text-[#2D283E] dark:text-[#C4E5CA] pt-1">
                      {fig.hallazgos.map((h, hIdx) => (
                        <li key={hIdx} className="leading-relaxed">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-[#12544F] border-t border-[#D6E0C2] dark:border-[#1B524F] flex items-center justify-between text-xs font-bold text-[#1E4D57] dark:text-[#A8E2AF]">
                  <span>Fuente: <code>reports/figures/exploracion/</code></span>
                  <a
                    href={fig.archivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:underline text-[11px]"
                  >
                    Abrir en pestaña <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Modal de Vista Ampliada */}
          {figuraAmpliada && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
              onClick={() => setFiguraAmpliada(null)}
            >
              <div className="relative max-w-5xl w-full bg-white dark:bg-[#071D22] rounded-3xl p-4 shadow-2xl border border-white/20">
                <button
                  onClick={() => setFiguraAmpliada(null)}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer"
                >
                  ✕ Cerrar
                </button>
                <img
                  src={figuraAmpliada}
                  alt="Figura ampliada"
                  className="w-full max-h-[80vh] object-contain rounded-2xl"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: CÓDIGO PYTHON ORIGINAL DEL NOTEBOOK */}
      {vista === 'codigo' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-[#F4F9EA] dark:bg-[#071D22] border border-[#D6E0C2] dark:border-[#1B524F] text-xs font-semibold">
            💻 Código fuente original de Jupyter extraído de <code>01_exploracion_jn_flujo.ipynb</code>. Puedes copiar cualquier celda con un clic.
          </div>

          {celdasNotebook.map((celda) => {
            if (celda.type === 'markdown') {
              return (
                <div
                  key={celda.id}
                  className="p-4 rounded-2xl bg-[#FAFCF6] dark:bg-[#071D22] border border-[#D6E0C2] dark:border-[#1B524F] text-xs font-medium whitespace-pre-line text-[#2D283E] dark:text-[#C4E5CA]"
                >
                  <div className="text-[10px] font-bold text-[#1E4D57] dark:text-[#A8E2AF] uppercase tracking-wider mb-1 opacity-70">
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
                  className="rounded-2xl border border-[#D6E0C2] dark:border-[#1B524F] bg-[#0F172A] text-[#F8FAFC] overflow-hidden text-xs font-mono shadow-sm"
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
      <footer className="pt-4 border-t border-[#D6E0C2] dark:border-[#1B524F] text-xs font-semibold text-[#2D283E] dark:text-[#C4E5CA] flex flex-wrap items-center justify-between gap-4">
        <span>Fuente oficial: <code>notebooks/01_exploracion/</code> y <code>docs/hallazgos.md</code></span>
        <span className="font-mono text-[11px]">Sprint 1 & 2 · Hospital Universidad del Norte</span>
      </footer>
    </article>
  );
}
