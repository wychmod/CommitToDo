import { cn } from '@/core/utils/formatters';

export interface SettingsSelectOption<T extends string | number> {
  value: T;
  label: string;
}

export interface SettingsSelectProps<T extends string | number> {
  value: T;
  options: SettingsSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function SettingsSelect<T extends string | number>({
  value,
  options,
  onChange,
  disabled = false,
  className,
  ariaLabel,
}: SettingsSelectProps<T>): JSX.Element {
  return (
    <select
      value={String(value)}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        const option = options.find((o) => String(o.value) === raw);
        if (option) onChange(option.value);
      }}
      className={cn(
        'h-[34px] min-w-[136px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] transition-[border-color,background-color] duration-[var(--v3-fast)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {options.map((option) => (
        <option key={String(option.value)} value={String(option.value)}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
