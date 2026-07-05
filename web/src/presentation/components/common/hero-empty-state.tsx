import type { ReactNode } from 'react';
import { cn } from '../../../core/utils/formatters';
import { AppIcon, AppIconName } from '../../icons/app-icons';

export interface HeroEmptyStateProps {
  icon: AppIconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function HeroEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: HeroEmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xxl bg-canvas p-xxl text-center',
        className
      )}
    >
      <div className="mb-md flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-primary-gradient-from to-primary-gradient-to">
        <AppIcon
          name={icon}
          className="h-10 w-10 text-white"
          aria-hidden="true"
        />
      </div>
      <h2 className="text-display-md font-semibold text-ink mb-xs">
        {title}
      </h2>
      {description ? (
        <p className="mb-md max-w-md text-body text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-xs">{action}</div> : null}
    </div>
  );
}
