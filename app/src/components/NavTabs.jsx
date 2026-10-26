import { Activity, Info, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'panel', label: 'Panel de Saturación', icon: Activity },
  { id: 'simulador', label: 'Simulador "¿Qué pasa si...?"', icon: Sparkles },
  { id: 'metodologia', label: 'Guía Operativa & OMOP', icon: Info },
];

export function NavTabs({ tabActiva, onCambiarTab }) {
  return (
    <nav className="border-b border-[#FFEBB8] bg-[#FFF9ED] px-6">
      <div className="max-w-7xl mx-auto flex gap-8 text-sm">
        {TABS.map(({ id, label, icon: Icon }) => {
          const activo = tabActiva === id;
          return (
            <button
              key={id}
              onClick={() => onCambiarTab(id)}
              className={`flex items-center gap-2 border-b-2 py-3.5 font-bold transition-colors ${
                activo
                  ? 'border-[#601D49] text-[#601D49]'
                  : 'border-transparent text-[#BD5579] hover:text-[#601D49]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
