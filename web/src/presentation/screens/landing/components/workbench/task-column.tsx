import { Check, ChevronDown, Clock, Plus } from 'lucide-react';

import { taskGroups } from './workbench-demo-data';

function PriorityChip({ priority }: { priority: string | null }): JSX.Element | null {
  if (!priority) return null;

  const styles: Record<string, string> = {
    高优先级: 'bg-[#2a1515] text-[#e6635b]',
    中优先级: 'bg-[#2a2115] text-[#e3a33c]',
    低优先级: 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]',
  };

  return (
    <span
      className={`inline-flex h-[18px] items-center rounded px-1.5 text-[10px] font-medium ${styles[priority] ?? 'bg-[var(--v3-control)] text-[var(--v3-text-muted)]'}`}
    >
      {priority}
    </span>
  );
}

function StatusChip({ status }: { status: string | null }): JSX.Element | null {
  if (!status) return null;

  const styles: Record<string, string> = {
    进行中: 'bg-[#15222a] text-[#68a1ff]',
    已完成: 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]',
    待办: 'bg-[var(--v3-control)] text-[var(--v3-text-muted)]',
  };

  return (
    <span
      className={`inline-flex h-[18px] items-center rounded px-1.5 text-[10px] font-medium ${styles[status] ?? 'bg-[var(--v3-control)] text-[var(--v3-text-muted)]'}`}
    >
      {status}
    </span>
  );
}

function TaskCheckbox({ checked }: { checked: boolean }): JSX.Element {
  return (
    <span
      className={`flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
        checked
          ? 'border-[var(--v3-primary)] bg-[var(--v3-primary)]'
          : 'border-[var(--v3-border)] bg-transparent'
      }`}
      aria-hidden="true"
    >
      {checked && (
        <Check size={10} strokeWidth={2.5} className="text-[var(--v3-text-on-primary)]" />
      )}
    </span>
  );
}

export function TaskColumn(): JSX.Element {
  return (
    <div className="flex w-[478px] shrink-0 flex-col border-r border-[var(--v3-border)] py-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <span className="text-[12px] font-medium text-[var(--v3-text-strong)]">
          Task
        </span>

        <div className="flex items-center gap-2">
          <div className="flex h-[26px] items-center rounded-md border border-[var(--v3-border)] bg-[var(--v3-control)] p-0.5">
            <button
              type="button"
              className="h-full rounded px-2 text-[10px] font-medium text-[var(--v3-text-strong)] bg-[var(--v3-selected)]"
            >
              全部
            </button>
            <button
              type="button"
              className="h-full rounded px-2 text-[10px] text-[var(--v3-text-muted)] hover:text-[var(--v3-text)]"
            >
              我的
            </button>
          </div>

          <button
            type="button"
            className="flex h-[26px] items-center gap-1 rounded-md border border-[var(--v3-border)] px-2 text-[10px] text-[var(--v3-text-muted)] hover:bg-[var(--v3-control)]"
          >
            <span>按更新时间</span>
            <ChevronDown size={12} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4">
        {taskGroups.map((group, groupIndex) => (
          <div
            key={group.branch}
            className={`${groupIndex > 0 ? 'mt-3 border-t border-[var(--v3-divider)] pt-3' : ''}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: group.branchColor }}
                aria-hidden="true"
              />
              <span className="font-mono text-[11px] font-medium text-[var(--v3-text-strong)]">
                {group.branch}
              </span>
            </div>

            <div className="flex flex-col">
              {group.tasks.map((task) => (
                <div
                  key={task.title}
                  className="group flex h-[26px] items-center gap-2 rounded px-1 text-[11px] transition-colors hover:bg-[var(--v3-control)]"
                >
                  <TaskCheckbox checked={task.completed} />
                  <span
                    className={`flex-1 truncate ${
                      task.completed
                        ? 'text-[var(--v3-text-muted)] line-through'
                        : 'text-[var(--v3-text)]'
                    }`}
                  >
                    {task.title}
                  </span>
                  <PriorityChip priority={task.priority} />
                  <StatusChip status={task.status} />
                  <span className="flex w-[70px] items-center justify-end gap-1 text-[10px] text-[var(--v3-text-muted)]">
                    <Clock size={10} strokeWidth={1.5} aria-hidden="true" />
                    {task.time}
                  </span>
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--v3-control)] text-[9px] text-[var(--v3-text-muted)]"
                    aria-label="我"
                  >
                    我
                  </span>
                </div>
              ))}

              <button
                type="button"
                className="flex h-[26px] items-center gap-1 rounded px-1 text-[11px] text-[var(--v3-text-muted)] transition-colors hover:bg-[var(--v3-control)] hover:text-[var(--v3-text)]"
              >
                <Plus size={12} strokeWidth={1.5} aria-hidden="true" />
                <span>新建任务</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
