import { Task } from '../../../domain/entities/task';
import { TaskCard } from './task-card';

export interface TaskListProps {
  tasks: Task[];
  selectedTaskId?: string | null;
  onItemClick?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
}

export function TaskList({ tasks, selectedTaskId, onItemClick, onToggleComplete }: TaskListProps): JSX.Element {
  if (tasks.length === 0) {
    return (
      <p className="py-lg text-center text-body text-ink-muted">当前分支暂无任务</p>
    );
  }

  return (
    <div className="flex flex-col gap-xs">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          selected={task.id === selectedTaskId}
          onClick={() => onItemClick?.(task)}
          onToggleComplete={() => onToggleComplete?.(task)}
        />
      ))}
    </div>
  );
}
