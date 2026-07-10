import { cn } from '@/core/utils/formatters';

export interface SettingsSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function SettingsSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel,
}: SettingsSwitchProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-[22px] w-[40px] rounded-full transition-[background-color] duration-[var(--v3-fast)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]',
        checked ? 'bg-[var(--v3-primary)]' : 'bg-[var(--v3-control)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] h-[18px] w-[18px] rounded-full bg-[var(--v3-text-strong)] transition-transform duration-[var(--v3-fast)]',
          checked ? 'translate-x-[19px]' : 'translate-x-[2px]'
        )}
        aria-hidden="true"
      />
    </button>
  );
}
