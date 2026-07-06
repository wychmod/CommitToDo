import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { useParams } from 'react-router-dom';
import { container } from '../../core/di/injection-container';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { Task } from '../../domain/entities/task';
import { HeatmapCalendar } from '../components/heatmap/heatmap-calendar';
import { useRepositoryStore } from '../stores/repository-store';
import { Branch } from '../../domain/entities/branch';
import { CalendarCheck2 } from 'lucide-react';
import { AppButton } from '../components/common/app-button';
import { useNavigate } from 'react-router-dom';

export function RepoHeatmapScreen(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { repository, loadData } = useRepositoryStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (id) void loadData(id);
  }, [id, loadData]);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      if (!repository?.id) return;
      setIsLoading(true);
      const branchRepo = container.resolve<IBranchRepository>('IBranchRepository');
      const taskRepo = container.resolve<ITaskRepository>('ITaskRepository');
      const branches: Branch[] = await branchRepo.getByRepositoryId(repository.id);
      const lists = await Promise.all(
        branches.map((b: Branch) => taskRepo.getByBranchId(b.id))
      );
      const all = lists.flat();
      const completed = all.filter(
        (t) =>
          t.completedAt &&
          t.completedAt >= startOfDay(subDays(new Date(), 365)) &&
          t.completedAt <= endOfDay(new Date())
      );
      if (cancelled) return;
      setTasks(completed);

      // Streak
      const dates = new Set(
        completed.map((t) => startOfDay(t.completedAt!).toDateString())
      );
      let s = 0;
      const today = startOfDay(new Date());
      for (let i = 0; i < 365; i++) {
        const d = subDays(today, i);
        if (dates.has(d.toDateString())) {
          s++;
        } else if (i === 0) {
          continue;
        } else {
          break;
        }
      }
      setStreak(s);

      const counts = new Map<string, number>();
      for (const t of completed) {
        if (!t.completedAt) continue;
        const key = startOfDay(t.completedAt).toDateString();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      setBest(Math.max(0, ...Array.from(counts.values())));
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [repository?.id]);

  return (
    <div className="work-main">
      <div className="work-main-pad">
        <header className="flex flex-col gap-xs">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
            In-repo Heatmap
          </span>
          <h1 className="flex items-center gap-sm text-[22px] font-semibold leading-tight text-ink">
            <CalendarCheck2 className="h-5 w-5 text-primary" aria-hidden />{' '}
            {repository?.name ?? '仓库'} · 节奏
          </h1>
          <p className="text-[13px] text-ink-muted">
            仅显示本仓库的提交完成情况。
          </p>
        </header>

        <section className="grid grid-cols-3 gap-sm">
          <div className="stat-card" data-tone="primary">
            <span className="stat-card-label">仓库完成数</span>
            <span className="stat-card-value tabular">{tasks.length}</span>
            <span className="stat-card-caption">12 个月内</span>
          </div>
          <div className="stat-card" data-tone="primary">
            <span className="stat-card-label">连续天数</span>
            <span className="stat-card-value tabular">{streak}</span>
            <span className="stat-card-caption">仓库范围内</span>
          </div>
          <div className="stat-card" data-tone="primary">
            <span className="stat-card-label">单日最高</span>
            <span className="stat-card-value tabular">{best}</span>
            <span className="stat-card-caption">单日任务数</span>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <span className="panel-title">Heatmap · 本仓库</span>
            <span className="panel-meta">{tasks.length} 条</span>
          </header>
          <div className="panel-body">
            {isLoading ? (
              <div className="flex items-center gap-2 text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> 正在加载…
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-title">本仓库暂无完成记录</span>
                <span className="empty-state-caption">
                  完成任务后会在这里形成节奏热力图。先回到任务页推进一个任务。
                </span>
                {id ? (
                  <AppButton onClick={() => navigate(`/repository/${id}`)}>
                    回到任务页
                  </AppButton>
                ) : null}
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
