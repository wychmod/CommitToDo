import * as React from 'react';

import { V3Card } from '@/presentation/components/v3';
import { Commit } from '@/domain/entities/commit';
import { Task } from '@/domain/entities/task';
import { V3HeatmapCalendar } from './v3-heatmap-calendar';
import {
  computeInsightsStats,
  filterTasksByCompletionRange,
  InsightsRange,
} from '@/presentation/stores/insights-store';

export interface RhythmSummaryCardProps {
  range: InsightsRange;
  tasks: Task[];
  commits: Commit[];
  onClick: () => void;
}

export function RhythmSummaryCard({
  range,
  tasks,
  commits,
  onClick,
}: RhythmSummaryCardProps): JSX.Element {
  const completedInRange = React.useMemo(
    () => filterTasksByCompletionRange(tasks, range),
    [tasks, range]
  );

  const stats = React.useMemo(
    () => computeInsightsStats(commits, completedInRange),
    [commits, completedInRange]
  );

  return (
    <V3Card
      className="flex cursor-pointer flex-col gap-4 p-5 transition-colors hover:bg-[var(--v3-card-hover)]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      aria-label="切换到节奏标签"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[var(--v3-text-strong)]">
          节奏摘要
        </span>
        <span className="text-[11px] text-[var(--v3-text-muted)]">
          {rangeLabel(range)}
        </span>
      </div>

      <V3HeatmapCalendar
        tasks={completedInRange}
        weeks={20}
        cellSize={10}
        gap={3}
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="提交" value={stats.commits} />
        <Stat label="完成任务" value={stats.completedTasks} />
        <Stat label="连续完成" value={stats.streakDays} suffix="天" />
      </div>
    </V3Card>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}): JSX.Element {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-[var(--v3-text-muted)]">{label}</span>
      <span className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
        {value}
        {suffix ? (
          <span className="ml-0.5 text-[11px] font-normal text-[var(--v3-text-muted)]">
            {suffix}
          </span>
        ) : null}
      </span>
    </div>
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
