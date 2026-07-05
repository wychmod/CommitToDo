import { GitBranch } from 'lucide-react';
import { cn } from '../../../core/utils/formatters';

export interface BranchIndicatorProps {
  name: string;
  color: string;
  isMain?: boolean;
  className?: string;
}

export function BranchIndicator({
  name,
  color,
  isMain = false,
  className,
}: BranchIndicatorProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-micro rounded-sm bg-surface-2/50 px-xs py-micro font-mono text-mono',
        className
      )}
    >
      <GitBranch className="h-3 w-3 text-ink-muted" />
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-ink">{name}</span>
      {isMain ? (
        <span className="ml-micro rounded-pill bg-surface-2 px-micro text-mono-sm text-ink-subtle">
          main
        </span>
      ) : null}
    </span>
  );
}
