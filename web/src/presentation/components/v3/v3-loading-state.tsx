import { cn } from '@/core/utils/formatters';

export interface V3LoadingStateProps {
  title?: string;
  className?: string;
}

/**
 * Loading state primitive for the v3 design language.
 *
 * Renders an accessible spinner with an optional label. Use it inside the final
 * layout container so the occupied area matches the loaded content and reduces
 * layout shift.
 */
export function V3LoadingState({
  title = '加载中…',
  className,
}: V3LoadingStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-8 text-center',
        className
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--v3-border)] border-t-[var(--v3-primary)]" />
      <span className="text-[14px] text-[var(--v3-text-muted)]">{title}</span>
    </div>
  );
}
