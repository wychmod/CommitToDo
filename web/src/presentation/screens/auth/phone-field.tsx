import { Phone } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';

const COUNTRY_CODES = [
  { code: '+86', label: '中国大陆' },
  { code: '+852', label: '中国香港' },
  { code: '+853', label: '中国澳门' },
  { code: '+886', label: '中国台湾' },
  { code: '+1', label: '美国/加拿大' },
  { code: '+44', label: '英国' },
  { code: '+81', label: '日本' },
  { code: '+82', label: '韩国' },
  { code: '+65', label: '新加坡' },
  { code: '+61', label: '澳大利亚' },
] as const;

export interface PhoneFieldProps {
  id: string;
  value: string;
  countryCode: string;
  onChange(value: string): void;
  onCountryCodeChange(code: string): void;
  error?: string;
  disabled?: boolean;
}

/**
 * Phone number input with country code selector.
 * Normalizes to E.164 format on change.
 */
export function PhoneField({
  id,
  value,
  countryCode,
  onChange,
  onCountryCodeChange,
  error,
  disabled,
}: PhoneFieldProps): JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // Strip non-digits except leading +
    const raw = e.target.value.replace(/[^\d+]/g, '');
    onChange(raw);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-[var(--v3-text-secondary)]"
      >
        手机号
      </label>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          disabled={disabled}
          aria-label="国家/地区代码"
          className={cn(
            'h-12 shrink-0 rounded-[var(--v3-radius-md)] border bg-[var(--v3-control)] px-3 text-[14px] text-[var(--v3-text)]',
            'transition-colors focus:border-[var(--v3-primary)] focus:outline-none',
            error ? 'border-[var(--v3-danger)]' : 'border-[var(--v3-border)]',
            'disabled:opacity-50'
          )}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.label}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--v3-text-muted)]">
            <Phone size={16} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="请输入手机号"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'h-12 w-full rounded-[var(--v3-radius-md)] border bg-[var(--v3-control)] pl-10 pr-4 text-[14px] text-[var(--v3-text)]',
              'placeholder:text-[var(--v3-text-muted)] transition-colors focus:border-[var(--v3-primary)] focus:outline-none',
              error ? 'border-[var(--v3-danger)]' : 'border-[var(--v3-border)]',
              'disabled:opacity-50'
            )}
          />
        </div>
      </div>
      {error ? (
        <p id={`${id}-error`} aria-live="polite" className="text-[12px] text-[var(--v3-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
