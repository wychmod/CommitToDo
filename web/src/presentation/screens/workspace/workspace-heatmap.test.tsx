import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';

import { WorkspaceHeatmap } from './workspace-heatmap';

function makeTask(title: string, completedAt: Date): Task {
  return new Task({
    id: `task-${title}`,
    branchId: 'branch-1',
    title,
    description: null,
    status: TaskStatus.done,
    priority: Priority.medium,
    dueDate: completedAt,
    completedAt,
    parentTaskId: null,
    sortOrder: 0,
    isDeleted: false,
    createdAt: completedAt,
    updatedAt: completedAt,
  });
}

describe('WorkspaceHeatmap', () => {
  it('renders weekday headers and 35 cells', () => {
    const today = new Date();
    const tasks = [makeTask('today', today)];
    render(<WorkspaceHeatmap tasks={tasks} />);

    expect(screen.getByText('一')).toBeInTheDocument();
    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/完成 \d+ 个任务/)).toHaveLength(35);
  });

  it('reports completed count for today', () => {
    const today = new Date();
    const tasks = [makeTask('today', today)];
    render(<WorkspaceHeatmap tasks={tasks} />);

    const cells = screen.getAllByLabelText(/完成 \d+ 个任务/);
    const todayCell = cells[cells.length - 1];
    expect(todayCell).toHaveAttribute(
      'aria-label',
      expect.stringContaining('完成 1 个任务')
    );
  });
});
