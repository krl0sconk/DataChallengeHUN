import { useEffect, useState } from 'react';
import {
  Activity,
  BookOpen,
  Gauge,
  Menu,
  Moon,
  SlidersHorizontal,
  Sun,
  Target,
  X,
} from 'lucide-react';
import { MediFlowLogo } from './MediFlowLogo';

const NAV_ITEMS = [
  { id: 'hoy', label: 'Resumen del turno', icon: Activity },
  { id: 'atascos', label: 'Cuellos de botella', icon: Gauge },
  { id: 'simulador', label: 'Simulador y dotación', icon: SlidersHorizontal },
  { id: 'precision', label: 'Precisión del modelo', icon: Target },
  { id: 'metodologia', label: 'Guía operativa', icon: BookOpen },
];

export function Header({
  tabActiva,
  onCambiarTab,
  isDark,
  onToggleTheme,
  isApiConnected,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!menuAbierto) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuAbierto(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuAbierto]);

  const seleccionarTab = (id) => {
    onCambiarTab(id);
    setMenuAbierto(false);
  };

  return (
    <>
      {/* Barra móvil superior (< lg) */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--mf-rail-border)] bg-[var(--mf-rail)] px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => seleccionarTab('hoy')}
          className="flex items-center text-left cursor-pointer rounded-lg"
          aria-label="MediFlow — Ir al resumen del turno"
        >
          <MediFlowLogo variant="on-dark" size="sm" />
        </button>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mf-rail-border)] bg-[#0F3142] px-2.5 py-1 text-xs font-medium text-[#D2E6F0]"
            title={isApiConnected ? 'Conexión activa con el motor analítico' : 'Motor analítico sin conexión'}
          >
            <span
              className={`h-2 w-2 rounded-full ${isApiConnected ? 'bg-[#34D399]' : 'bg-[#F59E0B]'}`}
              aria-hidden="true"
            />
            <span>{isApiConnected ? 'En línea' : 'Sin API'}</span>
          </span>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--mf-rail-border)] bg-[#0F3142] text-[#D2E6F0] hover:bg-[var(--mf-rail-hover)] cursor-pointer transition-colors"
            aria-label={isDark ? 'Cambiar a turno día (modo claro)' : 'Cambiar a turno noche (modo oscuro)'}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMenuAbierto((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--mf-rail-border)] bg-[#0F3142] text-white hover:bg-[var(--mf-rail-hover)] cursor-pointer transition-colors"
            aria-expanded={menuAbierto}
            aria-controls="mf-mobile-nav"
            aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          >
            {menuAbierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Menú desplegable móvil */}
      {menuAbierto && (
        <nav
          id="mf-mobile-nav"
          aria-label="Navegación principal móvil"
          className="border-b border-[var(--mf-rail-border)] bg-[var(--mf-rail)] px-4 py-3 text-white lg:hidden"
        >
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const activa = tabActiva === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => seleccionarTab(id)}
                    aria-current={activa ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      activa
                        ? 'bg-[var(--mf-accent)] text-white font-semibold'
                        : 'text-[#C6DCE8] hover:bg-[var(--mf-rail-hover)] hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Rail lateral fijo en escritorio (>= lg) */}
      <aside
        aria-label="Navegación principal MediFlow"
        className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen border-r border-[var(--mf-rail-border)] bg-[var(--mf-rail)] text-[var(--mf-rail-ink)]"
      >
        <div className="px-5 py-5 border-b border-[var(--mf-rail-border)]">
          <button
            type="button"
            onClick={() => seleccionarTab('hoy')}
            className="w-full text-left rounded-lg cursor-pointer"
            aria-label="MediFlow — Ir al resumen del turno"
          >
            <MediFlowLogo variant="on-dark" size="md" showSubtitle />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Vistas operativas">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const activa = tabActiva === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => seleccionarTab(id)}
                    aria-current={activa ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                      activa
                        ? 'bg-[var(--mf-accent)] text-white font-semibold'
                        : 'text-[#C6DCE8] font-medium hover:bg-[var(--mf-rail-hover)] hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Estado del motor, modo día/noche y atribución clínica */}
        <div className="border-t border-[var(--mf-rail-border)] px-4 py-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-[#0F3142] px-3 py-2 text-xs">
            <span className="flex items-center gap-2 font-medium text-[#D2E6F0]">
              <span
                className={`h-2 w-2 rounded-full ${isApiConnected ? 'bg-[#34D399]' : 'bg-[#F59E0B]'}`}
                aria-hidden="true"
              />
              {isApiConnected ? 'Motor conectado' : 'Motor desconectado'}
            </span>
            <span className="font-mono-num text-[#98B8C8]">API</span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex w-full items-center justify-between rounded-lg border border-[var(--mf-rail-border)] bg-transparent px-3 py-2 text-xs font-medium text-[#D2E6F0] hover:bg-[var(--mf-rail-hover)] hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {isDark ? <Sun className="h-4 w-4 text-[#FCD34D]" /> : <Moon className="h-4 w-4 text-[#98B8C8]" />}
              <span>{isDark ? 'Cambiar a turno día' : 'Cambiar a turno noche'}</span>
            </span>
          </button>

          <div className="pt-1 text-xs leading-relaxed text-[#98B8C8]">
            <p className="font-semibold text-[#D2E6F0]">Hospital Universidad del Norte</p>
            <p className="font-mono-num">OMOP CDM v5.4 · Sin PHI</p>
          </div>
        </div>
      </aside>
    </>
  );
}
