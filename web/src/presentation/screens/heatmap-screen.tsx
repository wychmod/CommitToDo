import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
    <div className="work-main">
      <div className="work-main-pad page-container">
        <header className="flex flex-col gap-xs">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
            Activity / Rhythm
          </span>
          <h1 className="text-[22px] font-semibold leading-tight text-ink">
            节奏热力图
          </h1>
          <p className="text-[13px] text-ink-muted">
            过去一年任务完成情况，按青色 → 石灰绿 显示强度。
          </p>
        </header>

        <section
          className="grid grid-cols-1 gap-sm tablet:grid-cols-3"
          aria-label="节奏概览"
        >
          <div className="stat-card" data-tone="primary">
            <span className="stat-card-label">总完成数</span>
            <span className="stat-card-value tabular">{stats.total}</span>
            <span className="stat-card-caption">已完成任务</span>
          </div>
          <div className="stat-card" data-tone="primary">
            <span className="stat-card-label">连续完成天数</span>
            <span className="stat-card-value tabular">{stats.streak}</span>
            <span className="stat-card-caption">最近一次断档</span>
          </div>
          <div className="stat-card" data-tone="primary">
            <span className="stat-card-label">单日最高</span>
            <span className="stat-card-value tabular">{stats.bestDay}</span>
            <span className="stat-card-caption">最多一天完成任务数</span>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <span className="panel-title">Heatmap · 过去 12 个月</span>
            <span className="panel-meta">{tasks.length} 条记录</span>
          </header>
          <div className="panel-body">
            {isLoading ? (
              <div className="flex items-center gap-2 text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> 正在加载…
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state heatmap-empty-state">
                <div className="heatmap-empty-copy">
                  <span className="empty-state-title">过去一年没有已完成任务</span>
                  <span className="empty-state-caption">
                    完成第一个任务后，节奏热力图会自动开始累积。
                  </span>
                </div>
                <div className="heatmap-empty-preview" aria-hidden>
                  <HeatmapCalendar tasks={[]} weeks={53} cellSize={9} gap={3} />
                </div>
              </div>
            ) : (
              <HeatmapCalendar tasks={tasks} />
            )}
          </div>
        </section>
      </div>
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
