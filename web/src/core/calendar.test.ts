import { describe, expect, it } from 'vitest';
import {
  addMonths,
  isSelectable,
  monthGrid,
  monthOf,
  moveDay,
  nextWeekFriday,
  shortcutDate,
  weekdayIndex,
} from './calendar';

describe('nextWeekFriday', () => {
  it('Thursday skips this Friday so it does not collide with tomorrow', () => {
    expect(nextWeekFriday('2026-11-26')).toBe('2026-12-04');
    expect(shortcutDate('tomorrow', '2026-11-26')).toBe('2026-11-27');
  });

  it('Friday and Sunday both land on the following week’s Friday', () => {
    expect(nextWeekFriday('2026-11-27')).toBe('2026-12-04');
    expect(nextWeekFriday('2026-11-29')).toBe('2026-12-04');
  });

  it('Monday’s next Friday is eleven days later, not this Friday', () => {
    expect(nextWeekFriday('2026-11-30')).toBe('2026-12-11');
  });
});

describe('monthGrid', () => {
  it('November 2026 starts on the previous Monday and keeps outside days', () => {
    const cells = monthGrid('2026-11');
    expect(cells[0]).toEqual({ date: '2026-10-26', inMonth: false });
    expect(cells[cells.length - 1]).toEqual({ date: '2026-12-06', inMonth: false });
    expect(cells).toHaveLength(42);
    expect(cells.find((cell) => cell.date === '2026-11-27')).toEqual({
      date: '2026-11-27',
      inMonth: true,
    });
  });

  it('keeps 29 February in a leap year and rejects it otherwise', () => {
    expect(monthGrid('2024-02').some((cell) => cell.date === '2024-02-29' && cell.inMonth)).toBe(
      true,
    );
    expect(monthGrid('2025-02').some((cell) => cell.date === '2025-02-29')).toBe(false);
  });
});

describe('bounds and movement', () => {
  it('treats the minimum day as selectable and the day before as not', () => {
    expect(isSelectable('2026-11-26', '2026-11-26')).toBe(true);
    expect(isSelectable('2026-11-25', '2026-11-26')).toBe(false);
    expect(isSelectable('2026-11-27', undefined)).toBe(true);
  });

  it('moves across month and year boundaries', () => {
    expect(moveDay('2026-11-01', 'up')).toBe('2026-10-25');
    expect(moveDay('2026-11-01', 'left')).toBe('2026-10-31');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(monthOf('2026-11-27')).toBe('2026-11');
    expect(weekdayIndex('2026-11-30')).toBe(0);
    expect(weekdayIndex('2026-11-29')).toBe(6);
  });

  it('rejects a date that is not a real calendar day', () => {
    expect(() => nextWeekFriday('2026-02-30')).toThrow(Error);
    expect(() => monthGrid('2026-13')).toThrow(Error);
  });
});
