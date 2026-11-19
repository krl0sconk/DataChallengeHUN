import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { getParametros } from '../lib/api';
import { FlowBandBar } from './FlowBandBar';
import { SectionPanel } from './SectionPanel';

export function Metodologia() {
  const [parametros, setParametros] = useState(null);

  useEffect(() => {
    getParametros().then(setParametros).catch(() => setParametros(null));
  }, []);

  return (
    <SectionPanel
      id="metodologia-mediflow"
      title="Guía operativa y metodología asistencial"
      subtitle="Protocolo de MediFlow para coordinadores médicos, jefes de guardia y equipo directivo del Hospital Universidad del Norte (HUN)."
      actions={
        <span className="inline-flex items-center rounded-full border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-1 text-xs font-medium text-[var(--mf-ink-2)]">
          OMOP CDM v5.4
        </span>
      }
    >
      <div className="space-y-8 text-sm text-[var(--mf-ink)]">
        {/* Funcionalidades del monitor */}
        <section className="space-y-4">
          <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
            Funcionalidades del monitor de demanda
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="mf-subsurface p-4 space-y-2">
              <h4 className="text-sm font-semibold text-[var(--mf-ink)]">
                Proyección temporal (3 a 14 días)
              </h4>
              <p className="text-xs leading-relaxed text-[var(--mf-ink-2)] max-w-[68ch]">
                Calcula la llegada diaria de pacientes mediante el modelo canónico. Incorpora bandas de incertidumbre entre el límite inferior <strong className="font-mono-num text-[var(--mf-ink)]">p10</strong> (mínimo habitual) y el límite superior <strong className="font-mono-num text-[var(--mf-ink)]">p90</strong> (escenario alto probable de afluencia).
              </p>
            </div>

            <div className="mf-subsurface p-4 space-y-2">
              <h4 className="text-sm font-semibold text-[var(--mf-ink)]">
                Descomposición de factores
              </h4>
              <p className="text-xs leading-relaxed text-[var(--mf-ink-2)] max-w-[68ch]">
                El modelo utiliza rezagos de 1–8 semanas, nivel local exponencial y variables de calendario (festivos, puentes, Carnaval y Semana Santa), estratificado por servicio. Los aportes se consultan para cada fecha; la capa de optimización combina Erlang C para dotación, Ley de Little para camas y simulación horaria de altas tempranas.
              </p>
            </div>

            <div className="mf-subsurface p-4 space-y-2">
              <h4 className="text-sm font-semibold text-[var(--mf-ink)]">
                Ocupación relativa hospitalaria
              </h4>
              <p className="text-xs leading-relaxed text-[var(--mf-ink-2)] max-w-[68ch]">
                Compara la presión operacional de las 3 áreas asistenciales del hospital frente a sus percentiles históricos, permitiendo alternar de servicio en la barra superior de contexto para inspeccionar su comportamiento.
              </p>
            </div>
          </div>
        </section>

        {/* Criterios de saturación y protocolo operativo */}
        <section className="space-y-4 border-t border-[var(--mf-border)] pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
                Criterios de saturación y protocolo operativo
              </h3>
              <p className="mt-1 text-xs text-[var(--mf-ink-2)] max-w-[68ch]">
                Escala unificada MediFlow basada en los percentiles históricos p75 y p90 de cada servicio asistencial.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <FlowBandBar
                value={82}
                p75={75}
                p90={90}
                compact
                label="Ejemplo de banda de presión p75 y p90"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="mf-subsurface p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold mf-badge-ok">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Normalidad operativa</span>
                </span>
                <span className="font-mono-num text-xs font-semibold text-[var(--mf-ink-2)]">&lt; p75</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--mf-ink-2)] max-w-[68ch]">
                La afluencia esperada se sitúa dentro del rango habitual del hospital. No se requieren traslados ni refuerzo adicional.
              </p>
            </div>

            <div className="mf-subsurface p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold mf-badge-warn">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Alta demanda</span>
                </span>
                <span className="font-mono-num text-xs font-semibold text-[var(--mf-ink-2)]">p75 – p90</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--mf-ink-2)] max-w-[68ch]">
                Alerta preventiva. Vigilar salas de espera, agilizar altas médicas programadas y confirmar disponibilidad del equipo de apoyo antes del pico.
              </p>
            </div>

            <div className="mf-subsurface p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold mf-badge-crit">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Saturación crítica</span>
                </span>
                <span className="font-mono-num text-xs font-semibold text-[var(--mf-ink-2)]">≥ p90</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--mf-ink-2)] max-w-[68ch]">
                Supera el percentil 90 histórico. Requiere reasignación inmediata de turnos clínicos y priorización de transferencias hacia hospitalización.
              </p>
            </div>
          </div>
        </section>

        {/* Tabla de referencia operativa OMOP */}
        <section className="space-y-4 border-t border-[var(--mf-border)] pt-6">
          <h3 className="text-[0.9375rem] font-semibold text-[var(--mf-ink)]">
            Umbrales históricos y servicios canónicos (2023–2026)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono-num">
              <thead>
                <tr className="border-y border-[var(--mf-border)] bg-[var(--mf-surface-2)] font-sans text-[var(--mf-ink-2)]">
                  <th className="py-2.5 px-3 font-semibold">Servicio asistencial</th>
                  <th className="py-2.5 px-3 font-semibold">Código OMOP</th>
                  <th className="py-2.5 px-3 font-semibold">Media diaria</th>
                  <th className="py-2.5 px-3 font-semibold">Umbral alerta (p75)</th>
                  <th className="py-2.5 px-3 font-semibold">Umbral saturación (p90)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mf-border)]">
                {parametros ? (
                  Object.entries(parametros.servicios || {}).map(([id, item]) => (
                    <tr key={id}>
                      <td className="py-3 px-3 font-sans font-semibold text-[var(--mf-ink)]">
                        {item.nombre || id}
                      </td>
                      <td className="py-3 px-3 text-[var(--mf-ink-2)]">{item.codigo || '—'}</td>
                      <td className="py-3 px-3 font-semibold text-[var(--mf-ink)]">{item.media_diaria} pac/día</td>
                      <td className="py-3 px-3 font-semibold text-[var(--mf-warn)]">{item.umbral_p75} pac.</td>
                      <td className="py-3 px-3 font-semibold text-[var(--mf-crit)]">{item.umbral_p90} pac.</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-5 px-3 text-center font-sans text-[var(--mf-ink-2)]">
                      Cargando parámetros del motor…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Privacidad y gobernanza OMOP */}
        <footer className="border-t border-[var(--mf-border)] pt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--mf-ink-2)]">
          <div className="flex items-start gap-2.5 max-w-[68ch]">
            <Lock className="h-4 w-4 text-[var(--mf-accent)] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              <strong className="font-semibold text-[var(--mf-ink)]">Privacidad y anonimización:</strong> MediFlow cumple con el estándar internacional OMOP Common Data Model v5.4. La plataforma opera exclusivamente sobre datos agregados sin almacenar identificadores ni registros clínicos individuales de pacientes.
            </p>
          </div>
          <span className="shrink-0 self-start sm:self-center rounded-full border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-1 text-xs font-semibold text-[var(--mf-ink)]">
            MediFlow · HUN Data Challenge 2026
          </span>
        </footer>
      </div>
    </SectionPanel>
  );
}
