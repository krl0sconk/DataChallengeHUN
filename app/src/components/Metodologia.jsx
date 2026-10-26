import React, { memo } from 'react';
import { Info, Lock, ShieldCheck } from 'lucide-react';

/**
 * Sección metodológica y conformidad de datos con OMOP CDM y directivas de privacidad.
 * Contraste optimizado para lectura técnica médica.
 */
export const Metodologia = memo(function Metodologia() {
  return (
    <article
      aria-labelledby="titulo-metodologia"
      className="rounded-2xl p-6 border border-slate-700/80 bg-[#0d1736] space-y-5 text-sm text-slate-200 shadow-xl"
    >
      <header>
        <h2 id="titulo-metodologia" className="text-lg font-bold text-white font-heading flex items-center gap-2">
          <Info className="h-5 w-5 text-sky-400" aria-hidden="true" />
          Metodología, Arquitectura y Privacidad Clínica
        </h2>
        <p className="text-xs font-medium text-slate-300 mt-1">
          Directrices oficiales del Hospital Universidad del Norte (HUN) · Data Challenge 2026
        </p>
      </header>

      <p className="leading-relaxed text-slate-200 font-normal">
        Esta plataforma web constituye la <strong>Capa de Decisión Asistencial</strong> del proyecto.
        Está diseñada para proveer alertas tempranas de saturación a coordinadores de piso sin requerir
        acceso a bases de datos en producción.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <section
          aria-label="Seguridad y privacidad"
          className="p-5 rounded-xl bg-[#070e24] border border-slate-700/80 space-y-2.5"
        >
          <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider font-heading">
            <Lock className="h-4 w-4 text-amber-300" aria-hidden="true" />
            Privacidad Estricta y Reglas Anti-Fuga
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Ningún registro médico individual ni fila de paciente sale de la infraestructura segura
            del hospital. La aplicación interactúa exclusivamente con series temporales agregadas y
            coeficientes validados mediante validación walk-forward.
          </p>
        </section>

        <section
          aria-label="Estándar OMOP"
          className="p-5 rounded-xl bg-[#070e24] border border-slate-700/80 space-y-2.5"
        >
          <h3 className="font-semibold text-white flex items-center gap-2 text-xs uppercase tracking-wider font-heading">
            <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            Estándar OMOP Common Data Model
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Los servicios evaluados corresponden a conceptos clínicos estandarizados:
            Urgencias (<code>9203</code>), Rehabilitación Ambulatoria (<code>581479</code>) y Tratamiento
            de Urgencias (<code>3045729</code>), permitiendo comparabilidad multicéntrica.
          </p>
        </section>
      </div>
    </article>
  );
});
