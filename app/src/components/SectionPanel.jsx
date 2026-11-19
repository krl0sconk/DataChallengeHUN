/**
 * Contenedor estándar MediFlow (borde limpio 1px, radio 12px, sin sombras falsas ni tarjetas anidadas).
 */
export function SectionPanel({
  id,
  title,
  subtitle,
  actions,
  children,
  className = '',
  noPadding = false,
}) {
  return (
    <section
      aria-labelledby={id ? `${id}-title` : undefined}
      className={`mf-panel ${noPadding ? '' : 'p-5 sm:p-6'} ${className}`}
    >
      {(title || actions) && (
        <header
          className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${
            noPadding ? 'px-5 pt-5 pb-4 sm:px-6' : 'pb-4 mb-5'
          } border-b border-[var(--mf-border)]`}
        >
          <div className="min-w-0">
            {title && (
              <h2
                id={id ? `${id}-title` : undefined}
                className="text-base sm:text-[1.0625rem] font-semibold tracking-[-0.015em] text-[var(--mf-ink)]"
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--mf-ink-2)] max-w-[68ch]">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
