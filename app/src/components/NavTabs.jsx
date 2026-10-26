import { Activity, Info, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'panel', label: 'Panel de Saturación', icon: Activity },
  { id: 'simulador', label: 'Simulador "¿Qué pasa si...?"', icon: Sparkles },
  { id: 'metodologia', label: 'Guía Operativa & OMOP', icon: Info },
];

export function NavTabs({ tabActiva, onCambiarTab, isDark }) {
  return (
    <nav
      className={`border-b px-6 transition-colors ${
        isDark ? 'border-[#2e3748] bg-[#161c28]' : 'border-stone-200 bg-[#f9f6f0]'
      }`}
    >
      <div className="max-w-7xl mx-auto flex gap-8 text-sm">
        {TABS.map(({ id, label, icon: Icon }) => {
          const activo = tabActiva === id;
          return (
            <button
              key={id}
              onClick={() => onCambiarTab(id)}
              className={`flex items-center gap-2.5 border-b-2 py-3.5 font-bold transition-colors ${
                activo
                  ? isDark
                    ? 'border-indigo-400 text-indigo-300'
                    : 'border-sky-600 text-sky-900'
                  : isDark
                  ? 'border-transparent text-slate-300 hover:text-white'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
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
