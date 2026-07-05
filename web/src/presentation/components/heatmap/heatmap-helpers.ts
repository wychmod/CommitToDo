import { startOfDay } from 'date-fns';
import { Task } from '../../../domain/entities/task';

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapDayData {
  date: Date;
  count: number;
  level: HeatmapLevel;
}

export function computeLevel(count: number): HeatmapLevel {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export function computeHeatmapData(tasks: Task[]): Record<string, HeatmapDayData> {
  const map = new Map<string, { date: Date; count: number }>();
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const day = startOfDay(task.completedAt);
    const key = day.toDateString();
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { date: day, count: 1 });
    }
  }

  const result: Record<string, HeatmapDayData> = {};
  for (const [key, { date, count }] of map.entries()) {
    result[key] = { date, count, level: computeLevel(count) };
  }
  return result;
}
