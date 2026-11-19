/**
 * Identidad gráfica oficial de MediFlow.
 * Geometría limpia: cruz clínica arquitectónica + pulso de flujo asistencial.
 */
export function MediFlowLogo({
  variant = 'on-dark',
  size = 'md',
  showSubtitle = false,
  className = '',
}) {
  const isLightSurface = variant === 'on-light';
  const markOnly = variant === 'mark';

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const frameFill = isLightSurface ? '#0B2532' : '#113547';
  const crossFill = isLightSurface ? '#154357' : '#1B4B63';
  const pulseStroke = '#2BB8AD';
  const nodeFill = '#E8F2F6';

  const mark = (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSizes[size] || iconSizes.md} shrink-0`}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill={frameFill} />
      <path d="M27 14H37V27H50V37H37V50H27V37H14V27H27V14Z" fill={crossFill} />
      <path
        d="M12 34H22L27.5 20.5L35 43.5L41 29.5L44.5 34H52"
        stroke={pulseStroke}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="34" r="3" fill={nodeFill} />
    </svg>
  );

  if (markOnly) {
    return (
      <span className={`inline-flex items-center ${className}`} aria-label="MediFlow">
        {mark}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <div className="min-w-0 leading-none">
        <span
          className={`block font-heading font-bold tracking-[-0.025em] ${titleSizes[size] || titleSizes.md} ${
            isLightSurface ? 'text-[var(--mf-ink)]' : 'text-white'
          }`}
        >
          Medi
          <span className={isLightSurface ? 'text-[var(--mf-accent)]' : 'text-[#4AD2C7]'}>
            Flow
          </span>
        </span>
        {showSubtitle && (
          <span
            className={`mt-1 block text-xs font-medium leading-none ${
              isLightSurface ? 'text-[var(--mf-ink-3)]' : 'text-[#98B8C8]'
            }`}
          >
            HUN · Capacidad clínica
          </span>
        )}
      </div>
    </div>
  );
}
