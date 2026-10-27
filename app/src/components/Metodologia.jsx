import {
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export function Metodologia() {
  return (
    <article className="rounded-3xl p-6 border border-[#EDF3DC] dark:border-[#0E3B39] bg-white dark:bg-[#12544F] space-y-6 text-sm text-[#4A4466] dark:text-[#8BBB92] shadow-xs transition-colors">
      <header>
        <h2 className="text-lg font-bold font-heading flex items-center gap-2 text-[#4A4466] dark:text-[#8BBB92]">
          <HelpCircle className="h-5 w-5 text-[#3B7D8C] dark:text-[#8BBB92]" />
          Guía de Uso de la Plataforma Asistencial
        </h2>
        <p className="text-xs font-semibold mt-1 text-[#4A4466]/80 dark:text-[#8BBB92]/70">
          Manual operativo rápido para coordinadores médicos y personal administrativo del Hospital Universidad del Norte (HUN)
        </p>
      </header>

      {/* Sección 1: Cómo usar cada pestaña */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="p-5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] space-y-2">
          <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#3B7D8C] dark:text-[#8BBB92]">
            <TrendingUp className="h-4 w-4" />
            1. Pestaña "Monitor" (Día a Día)
          </h3>
          <p className="text-xs leading-relaxed text-[#4A4466]/90 dark:text-[#8BBB92]/90">
            Revisa el <strong>semáforo de saturación</strong> del servicio activo. Consulta la curva proyectada a 3, 5 o 7 días para anticipar la llegada de pacientes y usa el <strong>Comparador de Servicios</strong> inferior para ver qué área del hospital está más próxima a su capacidad máxima (p90).
          </p>
        </section>

        <section className="p-5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] space-y-2">
          <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#3B7D8C] dark:text-[#8BBB92]">
            <Sparkles className="h-4 w-4" />
            2. Pestaña "Simulador" (Escenarios "¿Qué pasa si...?")
          </h3>
          <p className="text-xs leading-relaxed text-[#4A4466]/90 dark:text-[#8BBB92]/90">
            Selecciona una <strong>fecha específica</strong> en el calendario para planificar turnos futuros. Activa condiciones como <em>lluvias fuertes, olas de calor, dengue o festivos</em> para calcular cuántos pacientes adicionales llegarán frente al promedio habitual.
          </p>
        </section>

        <section className="p-5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] space-y-2">
          <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#3B7D8C] dark:text-[#8BBB92]">
            <Share2 className="h-4 w-4" />
            3. Compartir Configuraciones
          </h3>
          <p className="text-xs leading-relaxed text-[#4A4466]/90 dark:text-[#8BBB92]/90">
            Dentro del Simulador, pulsa el botón <strong>"Copiar Configuración"</strong> para copiar un resumen listo para enviar por WhatsApp o correo al comité de emergencias con la fecha, variables activas y la acción sugerida.
          </p>
        </section>

        <section className="p-5 rounded-2xl border border-[#EDF3DC] dark:border-[#0E3B39] bg-[#FAFCF6] dark:bg-[#092328] space-y-2">
          <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider font-heading text-[#3B7D8C] dark:text-[#8BBB92]">
            <ShieldCheck className="h-4 w-4" />
            4. Interpretación de Semáforos
          </h3>
          <ul className="text-xs space-y-1 text-[#4A4466]/90 dark:text-[#8BBB92]/90 list-disc list-inside">
            <li><strong>Verde (Normal):</strong> Demanda esperada dentro de rangos usuales (&lt; p75).</li>
            <li><strong>Amarillo (Alerta):</strong> Afluencia elevada (p75 - p90). Monitorear salas de espera.</li>
            <li><strong>Rojo (Saturación):</strong> Demanda crítica (&gt; p90). Reforzar triaje y habilitar camas.</li>
          </ul>
        </section>
      </div>

      {/* Sección 2: Privacidad y OMOP */}
      <div className="pt-2 border-t border-[#EDF3DC] dark:border-[#0E3B39]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A4466]/80 dark:text-[#8BBB92]/80 mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#3B7D8C] dark:text-[#8BBB92]" />
          Privacidad y Estándar Clínico OMOP CDM
        </h3>
        <p className="text-xs leading-relaxed text-[#4A4466]/90 dark:text-[#8BBB92]/90">
          Esta herramienta no almacena ni expone nombres ni registros individuales de pacientes. Todo el pronóstico opera con números agregados y conceptos clínicos estandarizados: <strong>Urgencias (OMOP 9203)</strong>, <strong>Rehabilitación Ambulatoria (OMOP 581479)</strong> y <strong>Tratamiento de Urgencias (OMOP 3045729)</strong>.
        </p>
      </div>
    </article>
  );
}
