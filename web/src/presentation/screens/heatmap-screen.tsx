import { useEffect, useMemo, useState } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { container } from '../../core/di/injection-container';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { Task } from '../../domain/entities/task';
import { HeatmapCalendar } from '../components/heatmap/heatmap-calendar';

export function HeatmapScreen(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const taskRepo = container.resolve<ITaskRepository>('ITaskRepository');
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), 365));
    taskRepo
      .getCompletedByDateRange(start, end)
      .then((completed) => {
        setTasks(completed);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const streak = computeStreak(tasks);
    const bestDay = computeBestDay(tasks);
    return { total, streak, bestDay };
  }, [tasks]);

  return (
    <div className="flex flex-col gap-md">
      <h1 className="text-headline font-semibold text-ink">热力图</h1>
      <p className="text-body text-ink-muted">过去一年任务完成情况</p>

      <div className="grid grid-cols-1 gap-xs sm:grid-cols-3">
        <StatCard label="总完成数" value={String(stats.total)} />
        <StatCard label="连续完成天数" value={String(stats.streak)} />
        <StatCard label="单日最高" value={String(stats.bestDay)} />
      </div>

      <div className="rounded-lg border border-hairline bg-surface-1 p-md">
        {isLoading ? (
          <p className="text-body text-ink-muted">加载中…</p>
        ) : tasks.length === 0 ? (
          <p className="text-body text-ink-muted">过去一年没有已完成任务</p>
        ) : (
          <HeatmapCalendar tasks={tasks} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-md">
      <p className="text-eyebrow text-ink-muted">{label}</p>
      <p className="mt-xs text-display-md font-semibold text-ink">{value}</p>
    </div>
  );
}

function computeStreak(tasks: Task[]): number {
  const dates = new Set(
    tasks
      .filter((t) => t.completedAt)
      .map((t) => startOfDay(t.completedAt!).toDateString())
  );
  let streak = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i);
    if (dates.has(d.toDateString())) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function computeBestDay(tasks: Task[]): number {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const key = startOfDay(task.completedAt).toDateString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...Array.from(counts.values()));
}
