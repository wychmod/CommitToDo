import * as React from 'react';

import { cn } from '@/core/utils/formatters';

export interface OtpFieldProps {
  id: string;
  value: string;
  onChange(value: string): void;
  error?: string;
  disabled?: boolean;
  length?: number;
}

/**
 * OTP code input field.
 * Supports paste, auto-focus, and numeric-only input.
 */
export function OtpField({
  id,
  value,
  onChange,
  error,
  disabled,
  length = 6,
}: OtpFieldProps): JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(raw);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) onChange(pasted);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-[var(--v3-text-secondary)]"
      >
        验证码
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder={`${length} 位数字`}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'h-12 w-full rounded-[var(--v3-radius-md)] border bg-[var(--v3-control)] px-4 text-center text-[18px] font-semibold tracking-[0.3em] text-[var(--v3-text)]',
          'placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal placeholder:text-[var(--v3-text-muted)]',
          'transition-colors focus:border-[var(--v3-primary)] focus:outline-none',
          error ? 'border-[var(--v3-danger)]' : 'border-[var(--v3-border)]',
          'disabled:opacity-50'
        )}
      />
      {error ? (
        <p id={`${id}-error`} aria-live="polite" className="text-[12px] text-[var(--v3-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
