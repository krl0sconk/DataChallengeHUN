import { Info, Lock, ShieldCheck } from 'lucide-react';

export function Metodologia() {
  return (
    <article className="rounded-3xl p-6 border border-[#FFEBB8] bg-white space-y-5 text-sm text-[#4A1538] shadow-xs">
      <header>
        <h2 className="text-lg font-bold font-heading flex items-center gap-2 text-[#601D49]">
          <Info className="h-5 w-5 text-[#BD5579]" />
          Metodología, Arquitectura y Privacidad Clínica
        </h2>
        <p className="text-xs font-semibold mt-1 text-[#BD5579]">
          Directrices oficiales del Hospital Universidad del Norte (HUN) · Data Challenge 2026
        </p>
      </header>

      <p className="leading-relaxed font-medium">
        Esta plataforma web constituye la <strong>Capa de Decisión Asistencial</strong> del proyecto.
        Está diseñada para proveer alertas tempranas de saturación a coordinadores de piso sin requerir
        acceso a bases de datos en producción.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <section className="p-5 rounded-2xl border border-[#FFEBB8] bg-[#FFF9ED] space-y-2.5">
          <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#601D49]">
            <Lock className="h-4 w-4 text-[#BD5579]" />
            Privacidad Estricta y Reglas Anti-Fuga
          </h3>
          <p className="text-xs leading-relaxed text-[#601D49]/80 font-normal">
            Ningún registro médico individual ni fila de paciente sale de la infraestructura segura
            del hospital. La aplicación interactúa exclusivamente con series temporales agregadas y
            coeficientes validados mediante validación walk-forward.
          </p>
        </section>

        <section className="p-5 rounded-2xl border border-[#FFEBB8] bg-[#FFF9ED] space-y-2.5">
          <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#601D49]">
            <ShieldCheck className="h-4 w-4 text-[#BD5579]" />
            Estándar OMOP Common Data Model
          </h3>
          <p className="text-xs leading-relaxed text-[#601D49]/80 font-normal">
            Los servicios evaluados corresponden a conceptos clínicos estandarizados:
            Urgencias (<code>9203</code>), Rehabilitación Ambulatoria (<code>581479</code>) y Tratamiento
            de Urgencias (<code>3045729</code>), permitiendo comparabilidad multicéntrica.
          </p>
        </section>
      </div>
    </article>
  );
}
