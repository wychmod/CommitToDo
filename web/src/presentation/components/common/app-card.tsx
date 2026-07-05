import * as React from 'react';
import { cn } from '../../../core/utils/formatters';

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-hairline bg-surface-1 p-md text-ink transition-colors',
          className
        )}
        {...props}
      />
    );
  }
);
AppCard.displayName = 'AppCard';

export { AppCard };
