import { addDays, isDateString } from '@/core/clock';
import { t } from '@/i18n';
import styles from './date-field.module.css';

interface DateFieldProps {
  label: string;
  value: string;
  fallbackDate: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  min?: string;
}

export function DateField({
  label,
  value,
  fallbackDate,
  onChange,
  disabled = false,
  className,
  min,
}: DateFieldProps) {
  const baseDate = isDateString(value) ? value : fallbackDate;
  const previousDisabled = disabled || (min !== undefined && baseDate <= min);
  const classes = [styles.field, className].filter(Boolean).join(' ');

  return (
    <label className={classes}>
      <span className={styles.label}>{label}</span>
      <span className={styles.control}>
        <button
          type="button"
          className={styles.stepper}
          aria-label={t('date.previousDay')}
          disabled={previousDisabled}
          onClick={() => onChange(addDays(baseDate, -1))}
        >
          <span aria-hidden="true">−</span>
        </button>
        <input
          type="date"
          className={styles.input}
          value={value}
          min={min}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.stepper}
          aria-label={t('date.nextDay')}
          disabled={disabled}
          onClick={() => onChange(addDays(baseDate, 1))}
        >
          <span aria-hidden="true">+</span>
        </button>
      </span>
    </label>
  );
}
