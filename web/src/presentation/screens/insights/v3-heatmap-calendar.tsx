import * as React from 'react';
import { startOfDay } from 'date-fns';

import { cn } from '@/core/utils/formatters';
import { Task } from '@/domain/entities/task';

export type V3HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface V3HeatmapCalendarProps {
  tasks: Task[];
  weeks?: number;
  cellSize?: number;
  gap?: number;
  className?: string;
  onCellClick?: (date: Date) => void;
}

interface DayCell {
  date: Date;
  count: number;
  level: V3HeatmapLevel;
}

function getLevel(count: number): V3HeatmapLevel {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const LEVEL_STYLES: Record<V3HeatmapLevel, string> = {
  0: 'bg-[var(--v3-heat-0)]',
  1: 'bg-[var(--v3-heat-1)]',
  2: 'bg-[var(--v3-heat-2)]',
  3: 'bg-[var(--v3-heat-3)]',
  4: 'bg-[var(--v3-heat-4)]',
};

export function V3HeatmapCalendar({
  tasks,
  weeks = 26,
  cellSize = 13,
  gap = 4,
  className,
  onCellClick,
}: V3HeatmapCalendarProps): JSX.Element {
  const { grid, months } = React.useMemo(() => {
    const today = startOfDay(new Date());
    const end = today;
    const start = addDays(end, -(weeks * 7 - 1));
    const startWeekday = start.getDay();
    const padDays = (startWeekday + 6) % 7;
    const gridStart = addDays(start, -padDays);

    const completedByDay = new Map<string, number>();
    for (const task of tasks) {
      if (!task.completedAt) continue;
      const day = startOfDay(task.completedAt).toISOString().slice(0, 10);
      completedByDay.set(day, (completedByDay.get(day) ?? 0) + 1);
    }

    const gridCells: DayCell[] = [];
    const monthLabels: { label: string; index: number }[] = [];
    let currentMonthLabel = '';

    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(gridStart, i);
      const key = date.toISOString().slice(0, 10);
      const count = completedByDay.get(key) ?? 0;
      gridCells.push({ date, count, level: getLevel(count) });

      const monthLabel = date.toLocaleString('zh-CN', { month: 'short' });
      if (monthLabel !== currentMonthLabel && date.getDate() <= 7) {
        currentMonthLabel = monthLabel;
        monthLabels.push({ label: monthLabel, index: Math.floor(i / 7) });
      }
    }

    return { grid: gridCells, months: monthLabels };
  }, [tasks, weeks]);

  const weekLabels = ['一', '三', '五', '日'];

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${weeks}, ${cellSize}px)`,
          gap: `${gap}px`,
        }}
      >
        {months.map((month) => (
          <div
            key={`${month.label}-${month.index}`}
            className="text-[10px] text-[var(--v3-text-muted)]"
            style={{
              gridColumn: month.index + 1,
              gridRow: 1,
            }}
          >
            {month.label}
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <div
          className="grid"
          style={{
            gridTemplateRows: `repeat(7, ${cellSize}px)`,
            gridTemplateColumns: `repeat(${weeks}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          {grid.map((cell, index) => (
            <button
              key={cell.date.toISOString()}
              type="button"
              onClick={() => onCellClick?.(cell.date)}
              className={cn(
                'rounded-[var(--v3-radius-sm)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]',
                LEVEL_STYLES[cell.level]
              )}
              style={{
                gridColumn: Math.floor(index / 7) + 1,
                gridRow: (index % 7) + 1,
                width: cellSize,
                height: cellSize,
              }}
              title={`${cell.date.toLocaleDateString('zh-CN')} · ${cell.count} 个完成任务`}
              aria-label={`${cell.date.toLocaleDateString('zh-CN')} 完成 ${cell.count} 个任务`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--v3-text-muted)]">
        <div className="flex flex-col gap-0.5">
          {weekLabels.map((label, i) => (
            <span key={label} className="h-3 leading-3">
              {i % 2 === 0 ? label : ''}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span>少</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={cn(
                'rounded-[var(--v3-radius-sm)]',
                LEVEL_STYLES[level as V3HeatmapLevel]
              )}
              style={{ width: 10, height: 10 }}
              aria-hidden="true"
            />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
