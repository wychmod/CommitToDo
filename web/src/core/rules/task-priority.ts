/**
 * 待办优先级（PRD V2-03 OP-07）。
 *
 * 只有模板生成的待办会带这个可选字段；普通待办不写，也不建索引，
 * 因此不影响现有表结构与查询。
 */

export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value);
}
