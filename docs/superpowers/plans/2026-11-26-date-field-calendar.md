# Date Field Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native date input and day steppers with a readable date button, three shortcuts, and a Monday-first month popover that still writes `YYYY-MM-DD`.

**Architecture:** Date rules live in `web/src/core/calendar.ts` and are unit-tested with fixed date strings. `DateField` stays a `ui` component, keeps its current props, and renders the popover itself. Call sites do not change.

**Tech Stack:** TypeScript, React, CSS Modules, Vitest. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-26-date-field-calendar-design.md`

## Global Constraints

- Copy only in `web/src/i18n/zh-CN.ts`. `t()` has no interpolation; assemble the label from a number plus a copy fragment.
- Styles use `design/tokens.css` variables only. No raw colors, font sizes, line widths, radii, spacing, or durations.
- Icons are the existing `ChevronDownIcon`, `ChevronLeftIcon`, and `ChevronRightIcon`. No icon package.
- Calendar math does not call `Date.now()`, `new Date()` for "now", or `crypto.randomUUID()`. Tests pass date strings.
- `DateField` does not import `data`, `stores`, or `pages`.
- Do not add a date-picker package.
- Media queries may use only 390, 760, and 1440.
- Commit subjects match the repo: `type(scope): imperative`, no emoji. End each message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Run Vitest and `tsc` with Node 24 (`D:/Program Files/nodejs-v24.18.0`). The default shell Node 20.16 fails unrelated tests.
- Before Task 1, commit the spec and this plan as `docs: specify the date field calendar`. Do not mix that commit with code.

## Review Focus

These are the ways a person gets a wrong date or a calendar they cannot see. The date rules are pinned in Task 1. The UI cases have no component test — the spec forbids one — so Task 2's manual check is the pin.

- Month chevrons must not call `onChange`. A person paging to December must keep the date they already had.
- The popover must stay visible inside 记一笔. `.panel` is `overflow-y: auto`, so an absolute child is clipped. Position it `fixed` from the trigger's rectangle.
- `disabled` must ignore the trigger and all three shortcuts, and must not open the popover.
- Esc and a click outside close the popover, return focus to the trigger, and do not change the value.
- At 390px the grid must stay inside the viewport, and must flip above the trigger when there is no room below.

---

### Task 1: Calendar math

**Files:**
- Create: `web/src/core/calendar.ts`
- Test: `web/src/core/calendar.test.ts`

**Interfaces:**
- Consumes: `addDays` and `isDateString` from `web/src/core/clock.ts`
- Produces:

```ts
export function weekdayIndex(date: string): 0 | 1 | 2 | 3 | 4 | 5 | 6
export function nextWeekFriday(date: string): string
export function monthOf(date: string): string
export function addMonths(month: string, delta: number): string
export function isSelectable(date: string, min?: string): boolean
export function moveDay(date: string, direction: 'left' | 'right' | 'up' | 'down'): string
export interface CalendarCell { date: string; inMonth: boolean }
export function monthGrid(month: string): CalendarCell[]
export type Shortcut = 'today' | 'tomorrow' | 'nextFriday'
export function shortcutDate(kind: Shortcut, anchor: string): string
```

`weekdayIndex` is Monday = 0 through Sunday = 6. `month` arguments are `YYYY-MM`. `nextWeekFriday` is the Friday of the Monday-start week after the week that contains `date`. An invalid `YYYY-MM-DD` or `YYYY-MM` throws `Error`, same as `addDays`. `isSelectable` is true when `min` is omitted or `date >= min`. `moveDay` steps −1 / +1 / −7 / +7. `monthGrid` is Monday-first and includes leading and trailing days; do not pad to six rows. `shortcutDate('today')` returns `anchor`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  addMonths,
  isSelectable,
  monthGrid,
  monthOf,
  moveDay,
  nextWeekFriday,
  shortcutDate,
  weekdayIndex,
} from './calendar'

describe('nextWeekFriday', () => {
  it('Thursday skips this Friday so it does not collide with tomorrow', () => {
    expect(nextWeekFriday('2026-11-26')).toBe('2026-12-04')
    expect(shortcutDate('tomorrow', '2026-11-26')).toBe('2026-11-27')
  })

  it('Friday and Sunday both land on the following week’s Friday', () => {
    expect(nextWeekFriday('2026-11-27')).toBe('2026-12-04')
    expect(nextWeekFriday('2026-11-29')).toBe('2026-12-04')
  })

  it('Monday’s next Friday is eleven days later, not this Friday', () => {
    expect(nextWeekFriday('2026-11-30')).toBe('2026-12-11')
  })
})

describe('monthGrid', () => {
  it('November 2026 starts on the previous Monday and keeps outside days', () => {
    const cells = monthGrid('2026-11')
    expect(cells[0]).toEqual({ date: '2026-10-26', inMonth: false })
    expect(cells.at(-1)).toEqual({ date: '2026-12-06', inMonth: false })
    expect(cells).toHaveLength(42)
    expect(cells.find((cell) => cell.date === '2026-11-27')).toEqual({
      date: '2026-11-27',
      inMonth: true,
    })
  })

  it('keeps 29 February in a leap year and rejects it otherwise', () => {
    expect(monthGrid('2024-02').some((cell) => cell.date === '2024-02-29' && cell.inMonth)).toBe(true)
    expect(monthGrid('2025-02').some((cell) => cell.date === '2025-02-29')).toBe(false)
  })
})

describe('bounds and movement', () => {
  it('treats the minimum day as selectable and the day before as not', () => {
    expect(isSelectable('2026-11-26', '2026-11-26')).toBe(true)
    expect(isSelectable('2026-11-25', '2026-11-26')).toBe(false)
    expect(isSelectable('2026-11-27', undefined)).toBe(true)
  })

  it('moves across month and year boundaries', () => {
    expect(moveDay('2026-11-01', 'up')).toBe('2026-10-25')
    expect(moveDay('2026-11-01', 'left')).toBe('2026-10-31')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(monthOf('2026-11-27')).toBe('2026-11')
    expect(weekdayIndex('2026-11-30')).toBe(0)
    expect(weekdayIndex('2026-11-29')).toBe(6)
  })

  it('rejects a date that is not a real calendar day', () => {
    expect(() => nextWeekFriday('2026-02-30')).toThrow(Error)
    expect(() => monthGrid('2026-13')).toThrow(Error)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/core/calendar.test.ts`
Expected: FAIL because `./calendar` cannot be resolved.

- [ ] **Step 3: Implement the signatures above in `web/src/core/calendar.ts`**

Use UTC date parts, as `addDays` does. Do not read the system clock.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run src/core/calendar.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/core/calendar.ts web/src/core/calendar.test.ts
git commit -m "$(cat <<'EOF'
feat(core): add Monday-first calendar math

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Date field popover

**Files:**
- Modify: `web/src/ui/date-field.tsx`
- Modify: `web/src/ui/date-field.module.css`
- Modify: `web/src/i18n/zh-CN.ts`
- Leave unchanged: `quick-add-panel.tsx`, `task-detail-panel.tsx`, `onboarding-card.tsx`

**Interfaces:**
- Consumes: Task 1 signatures, plus `addDays` / `isDateString` from `clock.ts`, and `ChevronDownIcon` / `ChevronLeftIcon` / `ChevronRightIcon`
- Produces: the same `DateField` props (`label`, `value`, `fallbackDate`, `onChange`, `disabled?`, `className?`, `min?`). Shortcuts are relative to `fallbackDate`, which every caller already sets to today. Do not add a `today` prop.

- [ ] **Step 1: Replace the stepper copy**

Remove `date.previousDay` and `date.nextDay`. Add:

| Key | Text |
| --- | --- |
| `date.monthMark` | 月 |
| `date.dayMark` | 日 |
| `date.yearMark` | 年 |
| `date.weekday.mon` … `date.weekday.sun` | 周一 … 周日 |
| `date.weekdayShort.mon` … `date.weekdayShort.sun` | 一 … 日 |
| `date.today` | 今天 |
| `date.tomorrow` | 明天 |
| `date.nextFriday` | 下周五 |
| `date.openCalendar` | 打开日历 |
| `date.previousMonth` | 上个月 |
| `date.nextMonth` | 下个月 |

Visible date is `${month}${t('date.monthMark')}${day}${t('date.dayMark')} ${t(weekdayKey)}`. Month title is `${year}${t('date.yearMark')}${month}${t('date.monthMark')}`.

- [ ] **Step 2: Rewrite `DateField`**

Resolved display date is `value` when `isDateString(value)`, otherwise `fallbackDate`. Do not call `onChange` for that fallback.

Closed state: a button showing the visible date and `ChevronDownIcon`, `aria-label={t('date.openCalendar')}`. Under it, three shortcut buttons from `shortcutDate`. A shortcut or day whose `isSelectable` is false is `disabled`. `disabled` on the field disables the trigger and the shortcuts and does not open.

Open state: a `fixed` popover, not `Dialog`. Place it from the trigger rectangle; flip above when the space below is smaller than the popover. `role="dialog"`. Header has previous month, the month title, and next month. Those buttons call `addMonths` and only change the visible month. Weekday row uses the short keys. Day buttons come from `monthGrid`. Mark the cell equal to `fallbackDate` as today, and the cell equal to the resolved date as selected. Days outside the month stay clickable when selectable. Choosing a day or a shortcut calls `onChange` with that `YYYY-MM-DD` and closes. Arrow keys call `moveDay` and follow into another month when the focused day leaves the visible month. Enter selects the focused day. Esc and a pointer outside the field close and return focus to the trigger, without `onChange`.

- [ ] **Step 3: Style the field in `date-field.module.css`**

Tokens only. Seven equal columns of `var(--s7)`. Popover width is `min(calc(100vw - var(--s8)), calc(var(--s7) * 7 + var(--s5)))`, so 390 does not overflow. `touch-action: manipulation` on day and shortcut buttons. Focus ring matches the existing `outline: var(--timeline-selected-ring) solid var(--focus)`.

- [ ] **Step 4: Verify**

Run, with Node 24 on `PATH`:

```bash
cd web && npm run lint && npx vitest run src/core/calendar.test.ts && npm run build
```

Expected: lint clean, calendar tests PASS, `tsc -b` and vite build succeed.

Manual check, because there is no component test:

- Paging months does not change the stored date.
- The popover is visible over 记一笔 and is not clipped by the scrolling panel.
- A disabled field does not open and its shortcuts do nothing.
- Esc and an outside click close it, focus returns to the trigger, and the date is unchanged.
- At 390px the grid stays on screen, including when the trigger is near the bottom.

- [ ] **Step 5: Commit**

```bash
git add web/src/ui/date-field.tsx web/src/ui/date-field.module.css web/src/i18n/zh-CN.ts
git commit -m "$(cat <<'EOF'
feat(ui): replace the date field with a month popover

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```
