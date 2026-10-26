import React, { memo } from 'react';
import { Info, Lock, ShieldCheck } from 'lucide-react';

/**
 * Sección metodológica estilo Cozy Pastel con contraste alto y lectura cómoda.
 */
export const Metodologia = memo(function Metodologia() {
  return (
    <article
      aria-labelledby="titulo-metodologia"
      className="rounded-2xl p-6 border border-stone-200 bg-white space-y-5 text-sm text-stone-700 shadow-xs"
    >
      <header>
        <h2 id="titulo-metodologia" className="text-lg font-bold text-stone-900 font-heading flex items-center gap-2">
          <Info className="h-5 w-5 text-sky-700" aria-hidden="true" />
          Metodología, Arquitectura y Privacidad Clínica
        </h2>
        <p className="text-xs font-semibold text-stone-600 mt-1">
          Directrices oficiales del Hospital Universidad del Norte (HUN) · Data Challenge 2026
        </p>
      </header>

      <p className="leading-relaxed text-stone-700 font-medium">
        Esta plataforma web constituye la <strong>Capa de Decisión Asistencial</strong> del proyecto.
        Está diseñada para proveer alertas tempranas de saturación a coordinadores de piso sin requerir
        acceso a bases de datos en producción.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <section
          aria-label="Seguridad y privacidad"
          className="p-5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5"
        >
          <h3 className="font-bold text-stone-900 flex items-center gap-2 text-xs uppercase tracking-wider font-heading">
            <Lock className="h-4 w-4 text-amber-700" aria-hidden="true" />
            Privacidad Estricta y Reglas Anti-Fuga
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed font-normal">
            Ningún registro médico individual ni fila de paciente sale de la infraestructura segura
            del hospital. La aplicación interactúa exclusivamente con series temporales agregadas y
            coeficientes validados mediante validación walk-forward.
          </p>
        </section>

        <section
          aria-label="Estándar OMOP"
          className="p-5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5"
        >
          <h3 className="font-semibold text-stone-900 flex items-center gap-2 text-xs uppercase tracking-wider font-heading">
            <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            Estándar OMOP Common Data Model
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed font-normal">
            Los servicios evaluados corresponden a conceptos clínicos estandarizados:
            Urgencias (<code>9203</code>), Rehabilitación Ambulatoria (<code>581479</code>) y Tratamiento
            de Urgencias (<code>3045729</code>), permitiendo comparabilidad multicéntrica.
          </p>
        </section>
      </div>
    </article>
  );
});
