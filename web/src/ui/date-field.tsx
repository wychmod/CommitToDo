import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  addMonths,
  committedDate,
  isSelectable,
  monthGrid,
  monthOf,
  moveDay,
  shortcutDate,
  weekdayIndex,
  type Shortcut,
} from '@/core/calendar';
import { isDateString } from '@/core/clock';
import { t, type MessageKey } from '@/i18n';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@/ui/icons';
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

const WEEKDAY_KEYS = [
  'date.weekday.mon',
  'date.weekday.tue',
  'date.weekday.wed',
  'date.weekday.thu',
  'date.weekday.fri',
  'date.weekday.sat',
  'date.weekday.sun',
] as const satisfies readonly MessageKey[];

const WEEKDAY_SHORT_KEYS = [
  'date.weekdayShort.mon',
  'date.weekdayShort.tue',
  'date.weekdayShort.wed',
  'date.weekdayShort.thu',
  'date.weekdayShort.fri',
  'date.weekdayShort.sat',
  'date.weekdayShort.sun',
] as const satisfies readonly MessageKey[];

const SHORTCUTS: readonly { kind: Shortcut; key: MessageKey }[] = [
  { kind: 'today', key: 'date.today' },
  { kind: 'tomorrow', key: 'date.tomorrow' },
  { kind: 'nextFriday', key: 'date.nextFriday' },
];

const ARROW_KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
} as const;

function formatDate(date: string): string {
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return `${month}${t('date.monthMark')}${day}${t('date.dayMark')} ${t(WEEKDAY_KEYS[weekdayIndex(date)])}`;
}

function formatMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return `${year}${t('date.yearMark')}${monthNumber}${t('date.monthMark')}`;
}

function tokenPx(name: string): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : 0;
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
  const committed = committedDate(value);
  const anchor = committed ?? (isDateString(fallbackDate) ? fallbackDate : null);
  const popoverId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const justOpened = useRef(false);
  const moveFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => (anchor ? monthOf(anchor) : ''));
  const [focused, setFocused] = useState(anchor ?? '');
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const classes = [styles.field, className].filter(Boolean).join(' ');

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (date: string) => {
    if (!isSelectable(date, min)) return;
    onChange(date);
    close();
  };

  const openCalendar = () => {
    if (disabled || !anchor) return;
    setVisibleMonth(monthOf(anchor));
    setFocused(anchor);
    justOpened.current = true;
    setOpen(true);
  };

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;
      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const margin = tokenPx('--s4');
      const gap = tokenPx('--s1');
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const placeAbove = spaceBelow < popoverRect.height + gap && spaceAbove > spaceBelow;
      const top = placeAbove
        ? Math.max(margin, triggerRect.top - popoverRect.height - gap)
        : Math.min(triggerRect.bottom + gap, window.innerHeight - popoverRect.height - margin);
      const maxLeft = window.innerWidth - popoverRect.width - margin;
      const left = Math.min(Math.max(margin, triggerRect.left), Math.max(margin, maxLeft));
      setCoords({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, visibleMonth]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || fieldRef.current?.contains(event.target)) return;
      close();
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !justOpened.current) return;
    justOpened.current = false;
    popoverRef.current?.querySelector<HTMLButtonElement>(`[data-date="${anchor}"]`)?.focus();
  }, [open, anchor]);

  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    const day = popoverRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`);
    (day ?? popoverRef.current)?.focus();
  }, [open, focused, visibleMonth]);

  const onPopoverKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = ARROW_KEYS[event.key as keyof typeof ARROW_KEYS];
    if (!direction || !isDateString(focused)) return;
    event.preventDefault();
    const next = moveDay(focused, direction);
    moveFocus.current = true;
    setFocused(next);
    const nextMonth = monthOf(next);
    if (nextMonth !== visibleMonth) setVisibleMonth(nextMonth);
  };

  const cells = open && visibleMonth !== '' ? monthGrid(visibleMonth) : [];

  return (
    <div className={classes} ref={fieldRef}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.trigger}
        ref={triggerRef}
        aria-label={
          committed
            ? `${label} ${formatDate(committed)} ${t('date.openCalendar')}`
            : `${label} ${t('date.unset')} ${t('date.openCalendar')}`
        }
        aria-expanded={open}
        aria-controls={popoverId}
        disabled={disabled || !anchor}
        onClick={() => (open ? close() : openCalendar())}
      >
        <span>{committed ? formatDate(committed) : t('date.unset')}</span>
        <ChevronDownIcon size={16} />
      </button>
      <div className={styles.shortcuts}>
        {SHORTCUTS.map(({ kind, key }) => {
          const date = isDateString(fallbackDate) ? shortcutDate(kind, fallbackDate) : '';
          const shortcutDisabled =
            disabled || !isDateString(fallbackDate) || !isSelectable(date, min);
          return (
            <button
              key={kind}
              type="button"
              className={styles.shortcut}
              disabled={shortcutDisabled}
              onClick={() => choose(date)}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
      {open ? (
        <div
          ref={popoverRef}
          id={popoverId}
          className={styles.popover}
          role="dialog"
          aria-label={t('date.openCalendar')}
          tabIndex={-1}
          style={coords ? { top: coords.top, left: coords.left } : { visibility: 'hidden' }}
          onKeyDown={onPopoverKeyDown}
        >
          <div className={styles.navRow}>
            <button
              type="button"
              className={styles.nav}
              aria-label={t('date.previousMonth')}
              onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
            >
              <ChevronLeftIcon size={16} />
            </button>
            <span className={styles.monthTitle}>{formatMonth(visibleMonth)}</span>
            <button
              type="button"
              className={styles.nav}
              aria-label={t('date.nextMonth')}
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
          <div className={styles.weekdays}>
            {WEEKDAY_SHORT_KEYS.map((key) => (
              <span key={key} className={styles.weekday}>
                {t(key)}
              </span>
            ))}
          </div>
          <div className={styles.grid} role="grid">
            {cells.map((cell) => {
              const selectable = isSelectable(cell.date, min);
              const selected = committed !== null && cell.date === committed;
              const today = isDateString(fallbackDate) && cell.date === fallbackDate;
              const dayClass = [
                styles.day,
                !cell.inMonth ? styles.dayOutside : '',
                today ? styles.dayToday : '',
                selected ? styles.daySelected : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={cell.date}
                  type="button"
                  className={dayClass}
                  data-date={cell.date}
                  role="gridcell"
                  aria-label={formatDate(cell.date)}
                  aria-pressed={selected}
                  aria-current={today ? 'date' : undefined}
                  aria-disabled={!selectable}
                  onClick={() => {
                    if (selectable) choose(cell.date);
                  }}
                >
                  {Number(cell.date.slice(8, 10))}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
