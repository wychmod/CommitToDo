import { type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';

/**
 * Labeled input field for the auth forms: icon, input, optional trailing
 * action (e.g. password visibility) and an accessible error message.
 *
 * The label, input and error are linked by id. On error the input gets
 * `aria-invalid` + `aria-describedby`, the container gets a danger border and
 * the message is a polite live region. `forwardRef` lets the form focus the
 * first errored field.
 */
export interface AuthFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  trailingAction?: React.ReactNode;
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  function AuthField(
    { id, label, icon: Icon, error, trailingAction, className, ...inputProps },
    ref
  ) {
    const errorId = `${id}-error`;
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className="text-[13px] font-medium text-[var(--v3-text-secondary)]"
        >
          {label}
        </label>
        <div
          className={cn(
            'flex h-12 items-center gap-2 rounded-[var(--v3-radius-md)] border bg-[var(--v3-bg-near)] px-3 transition-[border-color,box-shadow] duration-(--v3-fast)',
            hasError
              ? 'border-[var(--v3-danger)]'
              : 'border-[var(--v3-border)] focus-within:border-[var(--v3-border-hover)] focus-within:[box-shadow:var(--v3-focus-ring)]'
          )}
        >
          <Icon
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className="shrink-0 text-[var(--v3-text-muted)]"
          />
          <input
            ref={ref}
            id={id}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            className={cn(
              'h-full flex-1 bg-transparent text-[14px] text-[var(--v3-text-strong)] outline-none placeholder:text-[var(--v3-text-muted)]',
              className
            )}
            {...inputProps}
          />
          {trailingAction ? (
            <span className="flex min-w-[40px] items-center justify-center self-stretch">
              {trailingAction}
            </span>
          ) : null}
        </div>
        {hasError ? (
          <p
            id={errorId}
            aria-live="polite"
            className="text-[12px] text-[var(--v3-danger)]"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
