import * as React from 'react';
import { Priority, TaskStatus } from '../../../domain/entities/enums';
import { Task } from '../../../domain/entities/task';
import { AppButton } from '../common/app-button';
import { AppInput } from '../common/app-input';
import { AppSegmentedControl } from '../common/app-segmented-control';

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
}

export interface TaskFormProps {
  task?: Task | null;
  branchName?: string;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const statusOptions = [
  { value: TaskStatus.todo.toString(), label: '待办' },
  { value: TaskStatus.inProgress.toString(), label: '进行中' },
  { value: TaskStatus.done.toString(), label: '已完成' },
  { value: TaskStatus.cancelled.toString(), label: '已取消' },
];

const priorityOptions = [
  { value: Priority.low.toString(), label: '低' },
  { value: Priority.medium.toString(), label: '中' },
  { value: Priority.high.toString(), label: '高' },
];

/**
 * Inline task form (used by TaskFormScreen). Lives inside the new
 * `components/tasks/` tree alongside the rest of the task UI.
 */
export function TaskForm({
  task,
  branchName,
  onSubmit,
  onCancel,
  isLoading = false,
}: TaskFormProps): JSX.Element {
  const [title, setTitle] = React.useState(task?.title ?? '');
  const [description, setDescription] = React.useState(task?.description ?? '');
  const [status, setStatus] = React.useState<TaskStatus>(
    task?.status ?? TaskStatus.todo
  );
  const [priority, setPriority] = React.useState<Priority>(
    task?.priority ?? Priority.medium
  );
  const [dueDate, setDueDate] = React.useState<string>(
    task?.dueDate ? task.dueDate.toISOString().split('T')[0] : ''
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || '',
      status,
      priority,
      dueDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-md">
      {branchName ? (
        <p className="font-mono text-eyebrow text-ink-muted">
          分支 · {branchName}
        </p>
      ) : null}
      <AppInput
        placeholder="任务标题"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="描述（可选）"
        rows={4}
        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      <div className="flex flex-col gap-xs">
        <span className="text-eyebrow text-ink-muted">状态</span>
        <AppSegmentedControl
          value={status.toString()}
          options={statusOptions}
          onChange={(value) => setStatus(TaskStatus.fromValue(Number(value)))}
        />
      </div>
      <div className="flex flex-col gap-xs">
        <span className="text-eyebrow text-ink-muted">优先级</span>
        <AppSegmentedControl
          value={priority.toString()}
          options={priorityOptions}
          onChange={(value) => setPriority(Priority.fromValue(Number(value)))}
        />
      </div>
      <div className="flex flex-col gap-xs">
        <span className="text-eyebrow text-ink-muted">截止日期</span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>
      <div className="flex justify-end gap-xs">
        <AppButton type="button" variant="secondary" onClick={onCancel}>
          取消
        </AppButton>
        <AppButton type="submit" disabled={!title.trim() || isLoading}>
          {task ? '保存' : '创建'}
        </AppButton>
      </div>
    </form>
  );
}
