import { type LucideIcon } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { V3Button } from './v3-button';

export interface V3EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

/**
 * Empty state primitive for the v3 design language.
 *
 * Keeps the module outline with a dashed border and provides a single clear
 * primary action, matching the audit requirement that empty states explain
 * what happened, why, and what to do next.
 */
export function V3EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: V3EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[var(--v3-radius-md)] border border-dashed border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-8 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--v3-control)]">
        <Icon
          size={20}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-[var(--v3-text-muted)]"
        />
      </div>
      <p className="text-[16px] font-medium text-[var(--v3-text-strong)]">{title}</p>
      {description ? (
        <p className="max-w-[280px] text-[14px] leading-[1.55] text-[var(--v3-text-secondary)]">
          {description}
        </p>
      ) : null}
      {action ? (
        <V3Button
          variant={action.variant ?? 'primary'}
          onClick={action.onClick}
          className="mt-1"
        >
          {action.label}
        </V3Button>
      ) : null}
    </div>
  );
}
