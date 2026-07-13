import { Bookmark, CheckCircle2, Circle, CircleDot, Clock, MinusCircle, Radio } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { StatusCounts, StatusFilterKey, priorityOptions } from './repository-tasks-types';

export interface FilterSidebarProps {
  statusFilter: StatusFilterKey;
  onStatusChange: (value: StatusFilterKey) => void;
  priorityFilter: Set<Priority>;
  onPriorityToggle: (priority: Priority) => void;
  counts: StatusCounts;
  savedViewActive: boolean;
  onSavedViewClick: () => void;
}

const statusMeta: {
  value: StatusFilterKey;
  label: string;
  icon: typeof Radio;
  countKey: keyof StatusCounts;
}[] = [
  { value: 'all', label: '全部', icon: Radio, countKey: 'all' },
  { value: 'today', label: '今天', icon: Clock, countKey: 'today' },
  { value: TaskStatus.todo, label: '待办', icon: Circle, countKey: 'todo' },
  { value: TaskStatus.inProgress, label: '进行中', icon: CircleDot, countKey: 'inProgress' },
  { value: TaskStatus.done, label: '已完成', icon: CheckCircle2, countKey: 'done' },
  { value: TaskStatus.cancelled, label: '已取消', icon: MinusCircle, countKey: 'cancelled' },
];

const priorityMeta: Record<Priority, { label: string; color: string }> = {
  [Priority.high]: { label: '高', color: 'var(--v3-danger)' },
  [Priority.medium]: { label: '中', color: 'var(--v3-warning)' },
  [Priority.low]: { label: '低', color: 'var(--v3-primary)' },
};

export function FilterSidebar({
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityToggle,
  counts,
  savedViewActive,
  onSavedViewClick,
}: FilterSidebarProps): JSX.Element {
  return (
    <aside
      className="flex w-full flex-col gap-5 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-4 desktop:w-[191px]"
      aria-label="任务筛选"
    >
      <section className="flex flex-col gap-1">
        <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
          筛选
        </h3>
        {statusMeta.map((item) => {
          const active = statusFilter === item.value;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onStatusChange(item.value)}
              className={cn(
                'flex h-[38px] items-center justify-between rounded-[var(--v3-radius-sm)] px-2.5 text-[14px] transition-colors duration-(--v3-fast)',
                active
                  ? 'bg-[var(--v3-selected)] text-[var(--v3-text-strong)]'
                  : 'text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text)]'
              )}
              aria-pressed={active}
            >
              <span className="flex items-center gap-2">
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className={cn(
                    item.value === TaskStatus.done && 'text-[var(--v3-primary)]',
                    item.value === TaskStatus.cancelled && 'text-[var(--v3-text-muted)]',
                    item.value !== TaskStatus.done &&
                      item.value !== TaskStatus.cancelled &&
                      (active ? 'text-[var(--v3-primary)]' : 'text-[var(--v3-text-muted)]')
                  )}
                />
                <span>{item.label}</span>
              </span>
              <span className="text-[13px] text-[var(--v3-text-muted)]">{counts[item.countKey]}</span>
            </button>
          );
        })}
      </section>

      <hr className="border-[var(--v3-divider)]" />

      <section className="flex flex-col gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
          优先级
        </h3>
        {priorityOptions.map((option) => {
          const active = priorityFilter.has(option.value);
          const meta = priorityMeta[option.value];
          return (
            <label
              key={option.value}
              className={cn(
                'flex h-[34px] cursor-pointer items-center gap-2.5 rounded-[var(--v3-radius-sm)] px-2.5 text-[14px] transition-colors duration-(--v3-fast)',
                active
                  ? 'bg-[var(--v3-selected)] text-[var(--v3-text-strong)]'
                  : 'text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text)]'
              )}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => onPriorityToggle(option.value)}
                className="h-4 w-4 rounded border-[var(--v3-border)] bg-transparent text-[var(--v3-primary)] focus:ring-[var(--v3-primary)]"
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden="true"
              />
              <span>{meta.label}</span>
            </label>
          );
        })}
      </section>

      <hr className="border-[var(--v3-divider)]" />

      <section className="flex flex-col gap-1">
        <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
          保存的视图
        </h3>
        <button
          type="button"
          onClick={onSavedViewClick}
          className={cn(
            'flex h-[38px] items-center justify-between rounded-[var(--v3-radius-sm)] px-2.5 text-[14px] transition-colors duration-(--v3-fast)',
            savedViewActive
              ? 'bg-[var(--v3-selected)] text-[var(--v3-text-strong)]'
              : 'text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text)]'
          )}
          aria-pressed={savedViewActive}
        >
          <span className="flex items-center gap-2">
            <Bookmark
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
              className={savedViewActive ? 'text-[var(--v3-primary)]' : 'text-[var(--v3-text-muted)]'}
            />
            <span>待提交</span>
          </span>
          <span className="text-[13px] text-[var(--v3-text-muted)]">{counts.uncommitted}</span>
        </button>
      </section>
    </aside>
  );
}
