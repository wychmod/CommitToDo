import { addDays, format, startOfDay } from 'date-fns';

import type { Task } from '@/domain/entities/task';

export interface WorkspaceHeatmapProps {
  tasks: Task[];
}

type HeatLevel = 0 | 1 | 2 | 3 | 4;

const levelColor: Record<HeatLevel, string> = {
  0: 'var(--v3-heat-0)',
  1: 'var(--v3-heat-1)',
  2: 'var(--v3-heat-2)',
  3: 'var(--v3-heat-3)',
  4: 'var(--v3-heat-4)',
};

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

function getLevel(count: number): HeatLevel {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export function WorkspaceHeatmap({ tasks }: WorkspaceHeatmapProps): JSX.Element {
  const today = startOfDay(new Date());
  const weeks: Date[][] = [];

  for (let row = 4; row >= 0; row--) {
    const week: Date[] = [];
    for (let col = 0; col < 7; col++) {
      week.push(addDays(today, -(row * 7 + (6 - col))));
    }
    weeks.push(week);
  }

  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const day = startOfDay(task.completedAt);
    counts.set(day.toISOString(), (counts.get(day.toISOString()) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-8 gap-1.5">
        <span className="text-[12px] text-[var(--v3-text-muted)]" />
        {weekDays.map((day) => (
          <span
            key={day}
            className="text-center text-[12px] text-[var(--v3-text-muted)]"
          >
            {day}
          </span>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-8 gap-1.5">
          <span className="flex items-center text-[12px] text-[var(--v3-text-muted)]">
            {format(week[0], 'M/d')}
          </span>
          {week.map((date) => {
            const count = counts.get(startOfDay(date).toISOString()) ?? 0;
            const level = getLevel(count);
            return (
              <div
                key={date.toISOString()}
                className="h-[27px] w-[38px] rounded-[var(--v3-radius-sm)] transition-transform duration-(--v3-fast) hover:scale-105"
                style={{ backgroundColor: levelColor[level] }}
                title={`${format(date, 'yyyy 年 M 月 d 日')}，完成 ${count} 个任务`}
                aria-label={`${format(date, 'M 月 d 日')}，完成 ${count} 个任务`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
