import * as React from 'react';
import { cn } from '../../../core/utils/formatters';

export interface AppInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-micro">
        <input
          ref={ref}
          className={cn(
            'h-10 w-full rounded-md border border-hairline-strong bg-surface-1 px-xs py-2 text-body text-ink placeholder:text-ink-tertiary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus/50 disabled:opacity-50',
            error && 'border-error focus-visible:ring-error/50',
            className
          )}
          {...props}
        />
        {error ? <span className="text-caption text-error">{error}</span> : null}
      </div>
    );
  }
);
AppInput.displayName = 'AppInput';

export { AppInput };
