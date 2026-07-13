import { cn } from '@/core/utils/formatters';

export interface SettingsSegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SettingsSegmentedControlProps<T extends string> {
  options: SettingsSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function SettingsSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: SettingsSegmentedControlProps<T>): JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex h-[34px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-0.5',
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-4 text-[14px] font-medium transition-[color,background-color,border-color] duration-(--v3-fast) focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)] rounded-[var(--v3-radius-sm)]',
              isSelected
                ? 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)] border border-[var(--v3-primary)]'
                : 'text-[var(--v3-text-secondary)] hover:text-[var(--v3-text)] hover:bg-[var(--v3-control)]'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
