import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { Branch } from '@/domain/entities/branch';
import { Repository } from '@/domain/entities/repository';

import { WorkspaceTaskGroup } from './workspace-task-group';

const repository = new Repository({
  id: 'repo-1',
  name: '运动计划',
  description: null,
  defaultBranchId: null,
  icon: 'repo',
  color: '#80e48c',
  isArchived: false,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const branch = Branch.create(repository.id, 'main', {
  isMain: true,
  color: repository.color,
});

const tasks = [
  new Task({
    id: 'task-1',
    branchId: branch.id,
    title: '完成晨跑 5 km',
    description: null,
    status: TaskStatus.done,
    priority: Priority.medium,
    dueDate: new Date(),
    completedAt: new Date(),
    parentTaskId: null,
    sortOrder: 0,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  new Task({
    id: 'task-2',
    branchId: branch.id,
    title: '整理下周训练任务',
    description: null,
    status: TaskStatus.inProgress,
    priority: Priority.high,
    dueDate: new Date(),
    completedAt: null,
    parentTaskId: null,
    sortOrder: 1,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
];

describe('WorkspaceTaskGroup', () => {
  it('renders repository and branch header', () => {
    render(
      <MemoryRouter>
        <WorkspaceTaskGroup
          group={{ repository, branch, tasks }}
          onTaskClick={vi.fn()}
          onToggleComplete={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '运动计划' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'main' })).toBeInTheDocument();
  });

  it('renders task titles and status chips', () => {
    render(
      <MemoryRouter>
        <WorkspaceTaskGroup
          group={{ repository, branch, tasks }}
          onTaskClick={vi.fn()}
          onToggleComplete={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('完成晨跑 5 km')).toBeInTheDocument();
    expect(screen.getByText('整理下周训练任务')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('进行中')).toBeInTheDocument();
  });

  it('calls click and toggle handlers', async () => {
    const onTaskClick = vi.fn();
    const onToggleComplete = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WorkspaceTaskGroup
          group={{ repository, branch, tasks }}
          onTaskClick={onTaskClick}
          onToggleComplete={onToggleComplete}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByText('整理下周训练任务'));
    expect(onTaskClick).toHaveBeenCalledWith(tasks[1]);

    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(onToggleComplete).toHaveBeenCalledWith(tasks[0]);
  });
});
