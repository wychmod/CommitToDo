import { Search, SlidersHorizontal } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { V3Button } from '@/presentation/components/v3';
import {
  DueDateFilterKey,
  StatusFilterKey,
  TaskSortKey,
  dueDateFilterOptions,
  sortOptions,
  statusFilterOptions,
} from './repository-tasks-types';
import { TaskTableRow } from './task-table-row';

export interface TaskTableProps {
  tasks: Task[];
  selectedTaskId: string | null;
  branchName: string;
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: StatusFilterKey;
  onStatusFilterChange: (value: StatusFilterKey) => void;
  priorityFilter: Set<Priority>;
  onPriorityFilterChange: (value: Set<Priority>) => void;
  dueDateFilter: DueDateFilterKey;
  onDueDateFilterChange: (value: DueDateFilterKey) => void;
  sort: TaskSortKey;
  onSortChange: (value: TaskSortKey) => void;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onNewTask: () => void;
  onClearFilters: () => void;
  emptyBranch: boolean;
}

export function TaskTable({
  tasks,
  selectedTaskId,
  branchName,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  dueDateFilter,
  onDueDateFilterChange,
  sort,
  onSortChange,
  onSelectTask,
  onToggleComplete,
  onNewTask,
  onClearFilters,
  emptyBranch,
}: TaskTableProps): JSX.Element {
  const hasActiveFilters =
    query.trim() ||
    statusFilter !== 'all' ||
    priorityFilter.size > 0 ||
    dueDateFilter !== 'all';

  return (
    <div className="flex flex-1 flex-col rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--v3-divider)] px-4 py-3">
        <div className="relative flex h-[39px] w-full items-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 tablet:w-[238px]">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" className="text-[var(--v3-text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="搜索当前分支任务…"
            className="flex-1 bg-transparent text-[14px] text-[var(--v3-text)] outline-none placeholder:text-[var(--v3-text-muted)]"
          />
        </div>

        <StatusSelect value={statusFilter} onChange={onStatusFilterChange} />

        <PrioritySelect value={priorityFilter} onChange={onPriorityFilterChange} />

        <Select<DueDateFilterKey>
          value={dueDateFilter}
          options={dueDateFilterOptions}
          placeholder="截止日期"
          onChange={onDueDateFilterChange}
        />

        <Select<TaskSortKey>
          value={sort}
          options={sortOptions}
          placeholder="排序"
          onChange={onSortChange}
        />
      </div>

      <div
        className="grid grid-cols-[42px_1fr_105px_105px_90px_110px_110px] gap-2 border-b border-[var(--v3-divider)] px-3 py-2.5 text-[13px] text-[var(--v3-text-muted)]"
        role="rowgroup"
      >
        <span className="sr-only">选择</span>
        <span role="columnheader">任务</span>
        <span role="columnheader">状态</span>
        <span role="columnheader">优先级</span>
        <span role="columnheader">分支</span>
        <span className="text-right" role="columnheader">截止日期</span>
        <span className="text-right" role="columnheader">更新时间</span>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          {emptyBranch ? (
            <>
              <p className="text-[16px] font-medium text-[var(--v3-text-strong)]">{branchName} 还没有任务</p>
              <p className="max-w-[280px] text-[14px] text-[var(--v3-text-secondary)]">
                添加第一条任务，开始推进这个分支。
              </p>
              <V3Button onClick={onNewTask}>+ 新建任务</V3Button>
            </>
          ) : (
            <>
              <SlidersHorizontal size={32} strokeWidth={1.5} aria-hidden="true" className="text-[var(--v3-text-muted)]" />
              <p className="text-[16px] font-medium text-[var(--v3-text-strong)]">没有匹配的任务</p>
              <p className="max-w-[280px] text-[14px] text-[var(--v3-text-secondary)]">
                调整筛选条件或清除搜索关键词。
              </p>
              {hasActiveFilters ? (
                <V3Button variant="secondary" onClick={onClearFilters}>
                  清除筛选
                </V3Button>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto" role="table" aria-label="任务列表">
          {tasks.map((task) => (
            <TaskTableRow
              key={task.id}
              task={task}
              branchName={branchName}
              selected={task.id === selectedTaskId}
              onSelect={onSelectTask}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}

      <div className="flex h-[44px] items-center justify-between border-t border-[var(--v3-divider)] px-4 text-[14px]">
        <span className="text-[var(--v3-text-secondary)]">共 {tasks.length} 项任务</span>
        <span className="text-[13px] text-[var(--v3-text-muted)]">
          ↑↓ 切换排序 · ← → 切换列宽
        </span>
      </div>
    </div>
  );
}

interface SelectProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  placeholder: string;
  onChange: (value: T) => void;
}

interface StatusSelectProps {
  value: StatusFilterKey;
  onChange: (value: StatusFilterKey) => void;
}

function StatusSelect({ value, onChange }: StatusSelectProps): JSX.Element {
  const stringValue = typeof value === 'number' ? value.toString() : value;
  return (
    <div className="relative flex h-[39px] min-w-[120px] items-center rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3">
      <select
        value={stringValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'all' || v === 'today') {
            onChange(v);
          } else {
            onChange(TaskStatus.fromValue(Number(v)));
          }
        }}
        className="h-full w-full appearance-none bg-transparent pr-4 text-[14px] text-[var(--v3-text)] outline-none"
        aria-label="状态"
      >
        <option value="" disabled>状态</option>
        {statusFilterOptions.map((option) => (
          <option
            key={option.label}
            value={typeof option.value === 'number' ? option.value.toString() : option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-[var(--v3-text-muted)]">⌄</span>
    </div>
  );
}

function Select<T extends string>({ value, options, placeholder, onChange }: SelectProps<T>): JSX.Element {
  return (
    <div className="relative flex h-[39px] min-w-[120px] items-center rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-full w-full appearance-none bg-transparent pr-4 text-[14px] text-[var(--v3-text)] outline-none"
        aria-label={placeholder}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-[var(--v3-text-muted)]">⌄</span>
    </div>
  );
}

interface PrioritySelectProps {
  value: Set<Priority>;
  onChange: (value: Set<Priority>) => void;
}

function PrioritySelect({ value, onChange }: PrioritySelectProps): JSX.Element {
  const options = [
    { value: Priority.high, label: '高' },
    { value: Priority.medium, label: '中' },
    { value: Priority.low, label: '低' },
  ];

  return (
    <div className="relative flex h-[39px] min-w-[120px] items-center rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3">
      <select
        multiple
        value={Array.from(value).map((v) => v.toString())}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value) as Priority);
          onChange(new Set(selected));
        }}
        className={cn(
          'h-full w-full appearance-none bg-transparent pr-4 text-[14px] text-[var(--v3-text)] outline-none',
          value.size === 0 && 'text-[var(--v3-text-muted)]'
        )}
        aria-label="优先级"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-[var(--v3-text-muted)]">⌄</span>
    </div>
  );
}
