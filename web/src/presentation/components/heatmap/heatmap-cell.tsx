import { cn } from '../../../core/utils/formatters';

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapCellProps {
  level: HeatmapLevel;
  date: Date;
  count: number;
  size?: number;
  className?: string;
}

const levelClasses: Record<HeatmapLevel, string> = {
  0: 'bg-heatmap-empty',
  1: 'bg-heatmap-1',
  2: 'bg-heatmap-2',
  3: 'bg-heatmap-3',
  4: 'bg-heatmap-4',
};

export function HeatmapCell({
  level,
  date,
  count,
  size = 12,
  className,
}: HeatmapCellProps): JSX.Element {
  return (
    <div
      className={cn('rounded-xs', levelClasses[level], className)}
      style={{ width: size, height: size }}
      title={`${date.toLocaleDateString()}: ${count} 个完成任务`}
      aria-label={`${date.toLocaleDateString()} 完成 ${count} 个任务`}
    />
  );
}
