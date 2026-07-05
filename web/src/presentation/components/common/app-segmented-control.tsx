import { cn } from '../../../core/utils/formatters';

export interface AppSegmentedControlOption<T extends string | number> {
  value: T;
  label: string;
}

export interface AppSegmentedControlProps<T extends string | number> {
  options: AppSegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function AppSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: AppSegmentedControlProps<T>): JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex rounded-pill bg-canvas p-micro border border-hairline',
        className
      )}
      role="tablist"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-pill px-sm py-xs text-button transition-colors',
              isSelected
                ? 'bg-surface-2 text-ink'
                : 'text-ink-subtle hover:text-ink'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
