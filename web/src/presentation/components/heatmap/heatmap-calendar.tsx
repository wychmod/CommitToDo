import { useMemo } from 'react';
import { Task } from '../../../domain/entities/task';
import { formatDate } from '../../../core/utils/formatters';
import { HeatmapCell, HeatmapLevel } from './heatmap-cell';

export interface HeatmapCalendarProps {
  tasks: Task[];
  weeks?: number;
  cellSize?: number;
  gap?: number;
  className?: string;
}

interface DayCell {
  date: Date;
  count: number;
  level: HeatmapLevel;
}

function getLevel(count: number): HeatmapLevel {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function HeatmapCalendar({
  tasks,
  weeks = 53,
  cellSize = 12,
  gap = 3,
  className,
}: HeatmapCalendarProps): JSX.Element {
  const { grid, months } = useMemo(() => {
    const today = startOfDay(new Date());
    const end = today;
    const start = addDays(end, -(weeks * 7 - 1));
    const startWeekday = start.getDay();
    const padDays = (startWeekday + 6) % 7;
    const gridStart = addDays(start, -padDays);

    const completedByDay = new Map<string, number>();
    for (const task of tasks) {
      if (!task.completedAt) continue;
      const day = formatDate(startOfDay(task.completedAt));
      completedByDay.set(day, (completedByDay.get(day) ?? 0) + 1);
    }

    const grid: DayCell[] = [];
    const months: { label: string; index: number }[] = [];
    let currentMonthLabel = '';

    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(gridStart, i);
      const count = completedByDay.get(formatDate(date)) ?? 0;
      grid.push({ date, count, level: getLevel(count) });

      const monthLabel = date.toLocaleString('zh-CN', { month: 'short' });
      if (monthLabel !== currentMonthLabel && date.getDate() <= 7) {
        currentMonthLabel = monthLabel;
        months.push({ label: monthLabel, index: Math.floor(i / 7) });
      }
    }

    return { grid, months };
  }, [tasks, weeks]);

  const weekLabels = ['一', '三', '五', '日'];

  return (
    <div className={`flex flex-col gap-xs ${className ?? ''}`}>
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
            className="text-mono-sm text-ink-subtle"
            style={{
              gridColumn: month.index + 1,
              gridRow: 1,
            }}
          >
            {month.label}
          </div>
        ))}
      </div>
      <div className="flex gap-xs overflow-x-auto pb-xs">
        <div
          className="grid"
          style={{
            gridTemplateRows: `repeat(7, ${cellSize}px)`,
            gridTemplateColumns: `repeat(${weeks}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          {grid.map((cell, index) => (
            <div
              key={cell.date.toISOString()}
              style={{
                gridColumn: Math.floor(index / 7) + 1,
                gridRow: (index % 7) + 1,
              }}
            >
              <HeatmapCell
                date={cell.date}
                count={cell.count}
                level={cell.level}
                size={cellSize}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-mono-sm text-ink-subtle">
        <div className="flex flex-col gap-micro">
          {weekLabels.map((label, i) => (
            <span key={label} className="h-3 leading-3">
              {i % 2 === 0 ? label : ''}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-xs">
          <span>少</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <HeatmapCell key={level} date={new Date()} count={0} level={level as HeatmapLevel} size={10} />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
