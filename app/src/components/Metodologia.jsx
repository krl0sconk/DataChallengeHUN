import { Info, Lock, ShieldCheck } from 'lucide-react';

export function Metodologia({ isDark }) {
  return (
    <article
      className={`rounded-2xl p-6 border space-y-5 text-sm shadow-xs transition-colors ${
        isDark ? 'border-[#2e3748] bg-[#1e2536] text-slate-200' : 'border-stone-200 bg-white text-stone-700'
      }`}
    >
      <header>
        <h2 className={`text-lg font-bold font-heading flex items-center gap-2 ${isDark ? 'text-white' : 'text-stone-900'}`}>
          <Info className={`h-5 w-5 ${isDark ? 'text-indigo-400' : 'text-sky-700'}`} />
          Metodología, Arquitectura y Privacidad Clínica
        </h2>
        <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
          Directrices oficiales del Hospital Universidad del Norte (HUN) · Data Challenge 2026
        </p>
      </header>

      <p className={`leading-relaxed font-medium ${isDark ? 'text-slate-200' : 'text-stone-700'}`}>
        Esta plataforma web constituye la <strong>Capa de Decisión Asistencial</strong> del proyecto.
        Está diseñada para proveer alertas tempranas de saturación a coordinadores de piso sin requerir
        acceso a bases de datos en producción.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <section
          className={`p-5 rounded-xl border space-y-2.5 ${
            isDark ? 'bg-[#161c28] border-[#333d52]' : 'bg-stone-50 border-stone-200'
          }`}
        >
          <h3 className={`font-bold flex items-center gap-2 text-xs uppercase tracking-wider font-heading ${isDark ? 'text-white' : 'text-stone-900'}`}>
            <Lock className={`h-4 w-4 ${isDark ? 'text-amber-300' : 'text-amber-700'}`} />
            Privacidad Estricta y Reglas Anti-Fuga
          </h3>
          <p className={`text-xs leading-relaxed font-normal ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
            Ningún registro médico individual ni fila de paciente sale de la infraestructura segura
            del hospital. La aplicación interactúa exclusivamente con series temporales agregadas y
            coeficientes validados mediante validación walk-forward.
          </p>
        </section>

        <section
          className={`p-5 rounded-xl border space-y-2.5 ${
            isDark ? 'bg-[#161c28] border-[#333d52]' : 'bg-stone-50 border-stone-200'
          }`}
        >
          <h3 className={`font-semibold flex items-center gap-2 text-xs uppercase tracking-wider font-heading ${isDark ? 'text-white' : 'text-stone-900'}`}>
            <ShieldCheck className={`h-4 w-4 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
            Estándar OMOP Common Data Model
          </h3>
          <p className={`text-xs leading-relaxed font-normal ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
            Los servicios evaluados corresponden a conceptos clínicos estandarizados:
            Urgencias (<code>9203</code>), Rehabilitación Ambulatoria (<code>581479</code>) y Tratamiento
            de Urgencias (<code>3045729</code>), permitiendo comparabilidad multicéntrica.
          </p>
        </section>
      </div>
    </article>
  );
}
