import React, { memo } from 'react';
import { Activity, Info, Sparkles } from 'lucide-react';

/**
 * Pestañas de navegación estilo cozy con alto contraste y estados táctiles suaves.
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
      className="border-b border-stone-200 bg-[#f9f6f0] px-6"
    >
      <div role="tablist" className="max-w-7xl mx-auto flex gap-8 text-sm">
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
              className={`flex items-center gap-2.5 border-b-2 py-3.5 font-bold transition-colors ${
                isSelected
                  ? 'border-sky-600 text-sky-900'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
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
