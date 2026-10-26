import React, { memo } from 'react';
import { Activity, Info, Sparkles } from 'lucide-react';

/**
 * Pestañas de navegación semántica accesibles (WAI-ARIA tabs).
 */
export const NavTabs = memo(function NavTabs({ tabActiva, onCambiarTab }) {
  const tabs = [
    { id: 'panel', label: 'Panel de Saturación', icon: Activity },
    { id: 'simulador', label: 'Simulador "¿Qué pasa si...?"', icon: Sparkles },
    { id: 'metodologia', label: 'Guía Operativa & OMOP', icon: Info },
  ];

  return (
    <nav
      aria-label="Secciones del panel de control"
      className="border-b border-slate-800/80 bg-[#0b132a] px-6"
    >
      <div role="tablist" className="max-w-7xl mx-auto flex gap-6 text-sm">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isSelected = tabActiva === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-controls={`panel-${t.id}`}
              aria-selected={isSelected}
              onClick={() => onCambiarTab(t.id)}
              className={`flex items-center gap-2 border-b-2 py-3 font-medium transition-colors ${
                isSelected
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
