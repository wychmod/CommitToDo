import * as React from 'react';
import { Link } from 'react-router-dom';

import { Task } from '@/domain/entities/task';
import { V3Card } from '@/presentation/components/v3';
import {
  buildHeatmapData,
  computeRepositoryStats,
  RepositoryStats,
} from './repository-overview-helpers';

export interface HeatmapMiniCardProps {
  repositoryId: string;
  tasks: Task[];
  commits: CommitForStats[];
}

interface CommitForStats {
  createdAt: Date;
}

export function HeatmapMiniCard({
  repositoryId,
  tasks,
  commits,
}: HeatmapMiniCardProps): JSX.Element {
  const { grid, months } = React.useMemo(
    () => buildHeatmapData(tasks, 12),
    [tasks]
  );
  const stats: RepositoryStats = React.useMemo(
    () => computeRepositoryStats(tasks, commits),
    [tasks, commits]
  );

  const weeks = 12;
  const cellSize = 14;
  const gap = 6;

  return (
    <V3Card className="flex h-full flex-col p-[18px]">
      <header className="mb-4">
        <h2 className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
          过去 12 个月
        </h2>
      </header>

      <div className="flex flex-col gap-1">
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
              className="text-[11px] text-[var(--v3-text-muted)]"
              style={{
                gridColumn: month.index + 1,
                gridRow: 1,
              }}
            >
              {month.label}
            </div>
          ))}
        </div>
        <div
          className="grid"
          style={{
            gridTemplateRows: 'repeat(7, auto)',
            gridTemplateColumns: `repeat(${weeks}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          {grid.map((cell, index) => (
            <div
              key={cell.date.toISOString()}
              className="rounded-[2px]"
              style={{
                gridColumn: Math.floor(index / 7) + 1,
                gridRow: (index % 7) + 1,
                width: cellSize,
                height: cellSize,
                backgroundColor: heatmapColor(cell.level),
              }}
              title={`${cell.date.toLocaleDateString()}: ${cell.count} 个完成任务`}
              aria-label={`${cell.date.toLocaleDateString()} 完成 ${cell.count} 个任务`}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="完成任务" value={stats.completedTasks} />
        <Stat label="连续完成" value={stats.streakDays} suffix="天" />
        <Stat label="本月提交" value={stats.commitsThisMonth} />
      </div>

      <div className="mt-4">
        <Link
          to={`/insights?repository=${repositoryId}&tab=heatmap`}
          className="inline-flex items-center gap-1 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-primary)]"
        >
          查看完整洞察
          <span aria-hidden="true">{'>'}</span>
        </Link>
      </div>
    </V3Card>
  );
}

interface StatProps {
  label: string;
  value: number;
  suffix?: string;
}

function Stat({ label, value, suffix }: StatProps): JSX.Element {
  return (
    <div className="flex flex-col">
      <span className="text-[20px] font-bold text-[var(--v3-primary)]">
        {value}
        {suffix ? <span className="text-[13px] font-normal text-[var(--v3-text-muted)]">{suffix}</span> : null}
      </span>
      <span className="text-[12px] text-[var(--v3-text-muted)]">{label}</span>
    </div>
  );
}

function heatmapColor(level: number): string {
  switch (level) {
    case 0:
      return 'var(--v3-heat-0)';
    case 1:
      return 'var(--v3-heat-1)';
    case 2:
      return 'var(--v3-heat-2)';
    case 3:
      return 'var(--v3-heat-3)';
    case 4:
      return 'var(--v3-heat-4)';
    default:
      return 'var(--v3-heat-0)';
  }
}
