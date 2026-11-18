import { useEffect, useState } from 'react';
import { getParametros } from '../lib/api';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Database,
  HelpCircle,
  Layers,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export function Metodologia() {
  const [parametros, setParametros] = useState(null);

  useEffect(() => {
    getParametros().then(setParametros).catch(() => setParametros(null));
  }, []);

  return (
    <article className="rounded-3xl p-6 sm:p-8 border border-[#D1DEE7] dark:border-[#19506B] bg-white dark:bg-[#0E3E5B] space-y-8 text-sm text-[#102A43] dark:text-[#D8EFF7] shadow-xs transition-colors">
      {/* Cabecera Principal */}
      <header className="border-b border-[#D1DEE7] dark:border-[#19506B] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCEFF7] dark:bg-[#071B2A] text-[#14516B] dark:text-[#B9E2F0]">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold font-heading text-[#102A43] dark:text-[#D8EFF7]">
              Guía Operativa y Metodología Asistencial
            </h2>
            <p className="text-xs font-semibold mt-1 text-[#102A43] dark:text-[#D8EFF7]">
              Protocolo para coordinadores médicos, jefes de guardia y equipo directivo del Hospital Universidad del Norte (HUN)
            </p>
          </div>
        </div>
      </header>

      {/* 1. Módulos Operativos del Monitor */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#14516B] dark:text-[#B9E2F0]" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#102A43] dark:text-[#D8EFF7]">
            1. Funcionalidades del Monitor de Demanda
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] space-y-2.5">
            <h4 className="font-extrabold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#14516B] dark:text-[#B9E2F0]">
              <TrendingUp className="h-4 w-4" />
              Proyección Temporal (3 a 14 Días)
            </h4>
            <p className="text-xs leading-relaxed text-[#102A43] dark:text-[#D8EFF7] font-medium">
              Calcula la llegada diaria de pacientes mediante el modelo canónico. Cuenta con dos bandas punteadas de tolerancia: el límite inferior <strong>p10</strong> (mínimo habitual) y el límite superior <strong>p90</strong> (peor escenario probable de afluencia).
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] space-y-2.5">
            <h4 className="font-extrabold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#14516B] dark:text-[#B9E2F0]">
              <Sparkles className="h-4 w-4" />
              Descomposición de Factores
            </h4>
            <p className="text-xs leading-relaxed text-[#102A43] dark:text-[#D8EFF7] font-medium">
              Explica cuantitativamente el origen de cada pico asistencial: <em>Efecto Lunes (+8% pacientes acumulados del fin de semana)</em>, <em>Fin de semana en urgencias (+5%)</em> o <em>Quincenas (+4% días 15 y 30)</em>.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#D1DEE7] dark:border-[#19506B] bg-[#F7FAFC] dark:bg-[#071B2A] space-y-2.5">
            <h4 className="font-extrabold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#14516B] dark:text-[#B9E2F0]">
              <BarChart3 className="h-4 w-4" />
              Ocupación Relativa Hospitalaria
            </h4>
            <p className="text-xs leading-relaxed text-[#102A43] dark:text-[#D8EFF7] font-medium">
              Compara la presión operacional de las 3 áreas del hospital respecto a su histórico. Permite alternar de servicio con un solo clic para inspeccionar su respectivo comportamiento.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Matriz de Decisión y Semáforos */}
      <section className="space-y-4 pt-2 border-t border-[#D1DEE7] dark:border-[#19506B]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#14516B] dark:text-[#B9E2F0]" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#102A43] dark:text-[#D8EFF7]">
            2. Criterios de Saturación y Protocolo Operativo
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-[#71B5CC] bg-[#E8F6FA] dark:bg-[#071B2A] dark:border-[#176D98] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#0C4A62] dark:text-[#9FE4F5] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Estado Verde
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#0E3E5B] text-[#0C4A62] dark:text-[#9FE4F5]">
                &lt; p75
              </span>
            </div>
            <strong className="block text-xs text-[#0C4A62] dark:text-[#9FE4F5] font-extrabold">NORMALIDAD OPERATIVA</strong>
            <p className="text-[11px] leading-relaxed text-[#102A43] dark:text-[#D8EFF7] font-medium">
              La afluencia esperada se sitúa dentro de la media histórica del hospital. No se requieren traslados ni refuerzo adicional.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-[#DFC264] bg-[#FEF9E2] dark:bg-[#071B2A] dark:border-[#D98A00]/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#704200] dark:text-[#FFDF80] flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Estado Amarillo
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#0E3E5B] text-[#704200] dark:text-[#FFDF80]">
                p75 – p90
              </span>
            </div>
            <strong className="block text-xs text-[#704200] dark:text-[#FFDF80] font-extrabold">ALTA DEMANDA ASISTENCIAL</strong>
            <p className="text-[11px] leading-relaxed text-[#102A43] dark:text-[#D8EFF7] font-medium">
              Alerta preventiva. Se recomienda vigilar las salas de espera, agilizar altas médicas programadas y mantener en guardia el personal de apoyo.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-[#EBAAB5] bg-[#FDF0F2] dark:bg-[#071B2A] dark:border-[#C5304C]/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#8A1828] dark:text-[#FFA8B6] flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" /> Estado Rojo
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#0E3E5B] text-[#8A1828] dark:text-[#FFA8B6]">
                &gt; p90
              </span>
            </div>
            <strong className="block text-xs text-[#8A1828] dark:text-[#FFA8B6] font-extrabold">SATURACIÓN CRÍTICA</strong>
            <p className="text-[11px] leading-relaxed text-[#102A43] dark:text-[#D8EFF7] font-medium">
              Supera el percentil 90 histórico. Requiere reasignación inmediata de turnos médicos y priorización de transferencias a hospitalización.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Tabla de Referencia Operativa OMOP */}
      <section className="space-y-4 pt-2 border-t border-[#D1DEE7] dark:border-[#19506B]">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-[#14516B] dark:text-[#B9E2F0]" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#102A43] dark:text-[#D8EFF7]">
            3. Umbrales Históricos y Servicios Canónicos (2023–2026)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono-num">
            <thead>
              <tr className="border-b border-[#D1DEE7] dark:border-[#19506B] text-[#14516B] dark:text-[#B9E2F0] font-heading font-extrabold">
                <th className="py-2.5 px-3">Servicio Asistencial</th>
                <th className="py-2.5 px-3">Código OMOP</th>
                <th className="py-2.5 px-3">Media Diaria</th>
                <th className="py-2.5 px-3">Umbral Alerta (p75)</th>
                <th className="py-2.5 px-3">Umbral Saturación (p90)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1DEE7]/60 dark:divide-[#19506B]/60">
              {parametros ? Object.entries(parametros.servicios || {}).map(([id, item]) => <tr key={id}>
                <td className="py-2.5 px-3 font-bold font-sans text-[#102A43] dark:text-[#D8EFF7]">{item.nombre || id}</td>
                <td className="py-2.5 px-3">{item.codigo || '—'}</td>
                <td className="py-2.5 px-3 font-extrabold">{item.media_diaria} pac/día</td>
                <td className="py-2.5 px-3 font-bold text-[#704200] dark:text-[#FFDF80]">{item.umbral_p75} pac.</td>
                <td className="py-2.5 px-3 font-bold text-[#8A1828] dark:text-[#FFA8B6]">{item.umbral_p90} pac.</td>
              </tr>) : <tr><td colSpan="5" className="py-5 px-3 text-center text-[#46657A]">Cargando parámetros…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Privacidad y Estándar Clínico OMOP */}
      <footer className="pt-4 border-t border-[#D1DEE7] dark:border-[#19506B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-medium text-[#102A43] dark:text-[#D8EFF7]">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#14516B] dark:text-[#B9E2F0] shrink-0" />
          <span>
            <strong>Privacidad y Anonimización:</strong> Cumple con el estándar internacional OMOP Common Data Model. La plataforma opera exclusivamente sobre datos agregados sin almacenar identificadores ni registros clínicos individuales de pacientes.
          </span>
        </div>
        <span className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg bg-[#DCEFF7] dark:bg-[#071B2A] text-[#14516B] dark:text-[#B9E2F0]">
          HUN Data Challenge 2026
        </span>
      </footer>
    </article>
  );
}

