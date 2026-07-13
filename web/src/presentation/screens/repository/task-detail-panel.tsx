import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Edit3,
  GitBranch,
  GitCommit,
  RefreshCcw,
  Trash2,
  X,
} from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { Commit } from '@/domain/entities/commit';
import { CommitType, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { V3Button, V3Card, V3IconButton } from '@/presentation/components/v3';
import { formatShortHash, formatTaskDueDate } from './repository-tasks-formatters';

export interface TaskDetailPanelProps {
  task: Task | null;
  commits: Commit[];
  branchName: string;
  repositoryName: string;
  onEdit: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onCompleteAndCommit: () => void;
  onClose: () => void;
}

export function TaskDetailPanel({
  task,
  commits,
  branchName,
  repositoryName,
  onEdit,
  onRestore,
  onDelete,
  onCompleteAndCommit,
  onClose,
}: TaskDetailPanelProps): JSX.Element {
  if (!task) {
    return (
      <V3Card className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--v3-control)]">
          <GitCommit size={20} strokeWidth={1.5} aria-hidden="true" className="text-[var(--v3-text-muted)]" />
        </div>
        <p className="text-[16px] font-medium text-[var(--v3-text-strong)]">选择一个任务</p>
        <p className="max-w-[220px] text-[14px] text-[var(--v3-text-secondary)]">
          任务详情、关联提交和操作会显示在这里。
        </p>
      </V3Card>
    );
  }

  const isDone = task.status === TaskStatus.done;
  const relatedCommits = commits.filter((c) => c.taskId === task.id);
  const completeCommit = relatedCommits.find((c) => c.type === CommitType.complete);

  return (
    <V3Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between border-b border-[var(--v3-divider)] p-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
            任务详情
          </span>
          <h2 className="text-[22px] font-bold leading-[1.25] text-[var(--v3-text-strong)]">{task.title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <V3IconButton aria-label="关闭任务详情" onClick={onClose}>
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </V3IconButton>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4">
        {task.description ? (
          <section className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
              描述
            </span>
            <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-[var(--v3-text)]">
              {task.description}
            </p>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
            属性
          </span>
          <Field icon={Calendar} label="截止日期" value={formatTaskDueDate(task.dueDate)} />
          <Field
            icon={CheckCircle2}
            label="完成时间"
            value={task.completedAt ? task.completedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '未完成'}
          />
          <Field icon={GitBranch} label="所属分支" value={`${repositoryName} / ${branchName}`} valueColor="var(--v3-launch)" />
        </section>

        <section className="flex flex-col gap-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
            相关提交
          </span>
          {completeCommit ? (
            <div className="flex items-center justify-between rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-3">
              <div className="flex items-center gap-3">
                <GitCommit size={18} strokeWidth={1.5} aria-hidden="true" className="text-[var(--v3-primary)]" />
                <div className="flex flex-col">
                  <span className="text-[14px] font-medium text-[var(--v3-text-strong)]">{completeCommit.message}</span>
                  <span className="font-mono text-[12px] text-[var(--v3-text-muted)]">{formatShortHash(completeCommit.id)} · 刚刚</span>
                </div>
              </div>
              <ChevronRight
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
                className="text-[var(--v3-text-muted)]"
              />
            </div>
          ) : relatedCommits.length > 0 ? (
            <ul className="space-y-2">
              {relatedCommits.slice(0, 3).map((commit) => (
                <li
                  key={commit.id}
                  className="flex items-center justify-between rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-3"
                >
                  <span className="text-[14px] text-[var(--v3-text)]">{commit.message}</span>
                  <span className="font-mono text-[12px] text-[var(--v3-text-muted)]">#{formatShortHash(commit.id)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-[var(--v3-text-muted)]">暂无相关提交</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
            操作
          </span>
          <div className="flex flex-wrap gap-2">
            <V3Button variant="secondary" onClick={onEdit} className="gap-2">
              <Edit3 size={16} strokeWidth={1.5} aria-hidden="true" />
              编辑任务
            </V3Button>
            {isDone ? (
              <V3Button variant="secondary" onClick={onRestore} className="gap-2">
                <RefreshCcw size={16} strokeWidth={1.5} aria-hidden="true" />
                恢复任务
              </V3Button>
            ) : (
              <V3Button onClick={onCompleteAndCommit} className="gap-2">
                <CheckCircle2 size={16} strokeWidth={1.5} aria-hidden="true" />
                完成并提交
              </V3Button>
            )}
            <V3Button variant="ghost" onClick={onDelete} className="gap-2 text-[var(--v3-danger)] hover:bg-[var(--v3-danger)]/10">
              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
              删除
            </V3Button>
          </div>
        </section>
      </div>
    </V3Card>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  valueColor?: string;
}): JSX.Element {
  return (
    <div className="flex h-[36px] items-center gap-3 text-[14px]">
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" className="text-[var(--v3-text-muted)]" />
      <span className="flex-1 text-[var(--v3-text-muted)]">{label}</span>
      <span className="font-medium" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }): JSX.Element {
  const label =
    status === TaskStatus.todo
      ? '待办'
      : status === TaskStatus.inProgress
        ? '进行中'
        : status === TaskStatus.done
          ? '已完成'
          : '已取消';
  return (
    <span
      className={cn(
        'inline-flex h-[30px] items-center rounded-[var(--v3-radius-sm)] px-2.5 text-[13px] font-medium',
        status === TaskStatus.done
          ? 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
          : 'bg-[var(--v3-control)] text-[var(--v3-text-secondary)]'
      )}
    >
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: number }): JSX.Element {
  const label = priority === 2 ? '高优先级' : priority === 1 ? '中优先级' : '低优先级';
  return (
    <span className="inline-flex h-[30px] items-center rounded-[var(--v3-radius-sm)] bg-[var(--v3-control)] px-2.5 text-[13px] text-[var(--v3-text-secondary)]">
      {label}
    </span>
  );
}
