import * as React from 'react';

import { V3Card } from '@/presentation/components/v3';
import { Task } from '@/domain/entities/task';
import { Commit } from '@/domain/entities/commit';
import { Branch } from '@/domain/entities/branch';
import { V3HeatmapCalendar } from './v3-heatmap-calendar';
import {
  computeInsightsStats,
  filterTasksByCompletionRange,
  InsightsRange,
} from '@/presentation/stores/insights-store';

export interface RhythmTabProps {
  commits: Commit[];
  tasks: Task[];
  branches: Branch[];
  range: InsightsRange;
  onCellClick?: (date: Date) => void;
}

export function RhythmTab({
  commits,
  tasks,
  branches,
  range,
  onCellClick,
}: RhythmTabProps): JSX.Element {
  const completedInRange = React.useMemo(
    () => filterTasksByCompletionRange(tasks, range),
    [tasks, range]
  );

  const stats = React.useMemo(
    () => computeInsightsStats(commits, completedInRange),
    [commits, completedInRange]
  );

  const branchContributions = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of completedInRange) {
      counts.set(task.branchId, (counts.get(task.branchId) ?? 0) + 1);
    }
    return branches
      .map((branch) => ({
        branch,
        count: counts.get(branch.id) ?? 0,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [completedInRange, branches]);

  return (
    <div className="flex flex-col gap-4">
      <section
        className="grid grid-cols-2 gap-3 tablet:grid-cols-4"
        aria-label="节奏统计"
      >
        <StatCard label="完成任务" value={stats.completedTasks} caption="已完成" />
        <StatCard label="提交" value={stats.commits} caption="次提交" />
        <StatCard label="连续完成" value={stats.streakDays} caption="天" />
        <StatCard label="单日最高" value={stats.bestDay} caption="最多一天" />
      </section>

      <V3Card className="p-5">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--v3-text-strong)]">
            节奏热力图
          </h3>
          <span className="text-[12px] text-[var(--v3-text-muted)]">
            {rangeLabel(range)}
          </span>
        </header>
        <V3HeatmapCalendar
          tasks={completedInRange}
          weeks={26}
          cellSize={13}
          gap={4}
          onCellClick={onCellClick}
        />
      </V3Card>

      <V3Card className="p-5">
        <header className="mb-3">
          <h3 className="text-[15px] font-semibold text-[var(--v3-text-strong)]">
            分支贡献摘要
          </h3>
        </header>
        {branchContributions.length === 0 ? (
          <p className="text-[13px] text-[var(--v3-text-muted)]">
            当前范围暂无分支贡献数据。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {branchContributions.map(({ branch, count }) => (
              <li
                key={branch.id}
                className="flex items-center justify-between rounded-[var(--v3-radius-md)] bg-[var(--v3-bg-near)] px-3 py-2"
              >
                <span className="flex items-center gap-2 text-[13px] text-[var(--v3-text)]"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: branch.color }}
                    aria-hidden="true"
                  />
                  {branch.name}
                </span>
                <span className="font-mono text-[13px] text-[var(--v3-text-muted)]"
                >
                  {count} 项
                </span>
              </li>
            ))}
          </ul>
        )}
      </V3Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}): JSX.Element {
  return (
    <V3Card className="flex flex-col gap-1 p-4">
      <span className="text-[12px] text-[var(--v3-text-muted)]">{label}</span>
      <span className="text-[28px] font-semibold leading-none text-[var(--v3-text-strong)]">
        {value}
      </span>
      <span className="text-[11px] text-[var(--v3-text-muted)]">{caption}</span>
    </V3Card>
  );
}

function rangeLabel(range: InsightsRange): string {
  switch (range) {
    case '90d':
      return '过去 90 天';
    case '12m':
      return '过去 12 个月';
    case 'year':
      return '今年';
    case 'custom':
      return '自定义范围';
  }
}
