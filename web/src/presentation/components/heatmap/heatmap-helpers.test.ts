import { describe, expect, it } from 'vitest';
import { Task } from '../../../domain/entities/task';
import { Priority, TaskStatus } from '../../../domain/entities/enums';
import { computeHeatmapData } from './heatmap-helpers';

describe('Heatmap data calculation', () => {
  it('groups completed tasks by day and assigns levels', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tasks = [
      Task.create('branch-1', 'Task 1', { status: TaskStatus.done }),
      Task.create('branch-1', 'Task 2', { status: TaskStatus.done }),
      Task.create('branch-1', 'Task 3', { status: TaskStatus.done, priority: Priority.high }),
    ];
    tasks.forEach((t, i) => {
      (t as unknown as { completedAt: Date }).completedAt = new Date(today.getTime() - i * 1000);
    });

    const data = computeHeatmapData(tasks);
    const todayKey = today.toDateString();
    expect(data[todayKey]).toBeDefined();
    expect(data[todayKey].count).toBe(tasks.length);
    expect(data[todayKey].level).toBeGreaterThan(0);
  });

  it('ignores incomplete tasks', () => {
    const tasks = [Task.create('branch-1', 'Incomplete')];
    const data = computeHeatmapData(tasks);
    expect(Object.keys(data)).toHaveLength(0);
  });
});
