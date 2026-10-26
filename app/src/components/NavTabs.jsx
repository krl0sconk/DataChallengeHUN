import { Activity, Info, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'panel', label: 'Panel de Saturación', icon: Activity },
  { id: 'simulador', label: 'Simulador "¿Qué pasa si...?"', icon: Sparkles },
  { id: 'metodologia', label: 'Guía Operativa & OMOP', icon: Info },
];

export function NavTabs({ tabActiva, onCambiarTab }) {
  return (
    <nav className="border-b border-[#EDF3DC] dark:border-[#1F4436] bg-[#F4F9EA]/60 dark:bg-[#285A48]/60 px-6 transition-colors">
      <div className="max-w-7xl mx-auto flex gap-8 text-sm">
        {TABS.map(({ id, label, icon: Icon }) => {
          const activo = tabActiva === id;
          return (
            <button
              key={id}
              onClick={() => onCambiarTab(id)}
              className={`flex items-center gap-2 border-b-2 py-3.5 font-bold transition-colors ${
                activo
                  ? 'border-[#4A4466] dark:border-[#B0E4CC] text-[#4A4466] dark:text-[#B0E4CC]'
                  : 'border-transparent text-[#6EADBC] dark:text-[#B0E4CC]/60 hover:text-[#4A4466] dark:hover:text-[#B0E4CC]'
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
