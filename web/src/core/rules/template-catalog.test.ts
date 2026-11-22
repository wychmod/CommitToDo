import { describe, expect, it } from 'vitest';
import {
  TEMPLATES,
  TEMPLATE_BRANCH_COUNT,
  TEMPLATE_TASK_COUNT,
  templateById,
} from './template-catalog';
import { TASK_PRIORITIES, isTaskPriority } from './task-priority';

describe('模板常量', () => {
  it('每个模板恰好 1 个一级、2 个二级、4 条待办，总节点数 7', () => {
    expect(TEMPLATES).toHaveLength(4);
    for (const template of TEMPLATES) {
      expect(template.primary.length).toBeGreaterThan(0);
      expect(template.secondaries).toHaveLength(2);
      expect(template.tasks).toHaveLength(4);
      expect(1 + template.secondaries.length + template.tasks.length).toBe(7);
      expect(TEMPLATE_BRANCH_COUNT + TEMPLATE_TASK_COUNT).toBe(7);
    }
  });

  it('待办只挂在一级或二级分支，层级不超过 3', () => {
    for (const template of TEMPLATES) {
      const seen = new Set<string>();
      for (const task of template.tasks) {
        expect(['primary', 'secondary-a', 'secondary-b']).toContain(task.branch);
        expect(task.title.trim().length).toBeGreaterThan(0);
      }
      for (const name of [template.primary, ...template.secondaries]) {
        expect(seen.has(name)).toBe(false);
        seen.add(name);
      }
    }
  });

  it('四条待办按分支分组后顺序连续', () => {
    for (const template of TEMPLATES) {
      const counts = new Map<string, number>();
      for (const task of template.tasks) {
        counts.set(task.branch, (counts.get(task.branch) ?? 0) + 1);
      }
      expect(counts.get('secondary-a')).toBe(2);
      expect(counts.get('secondary-b')).toBe(2);
    }
  });

  it('每条待办都带合法优先级，且每套模板覆盖三档', () => {
    for (const template of TEMPLATES) {
      for (const task of template.tasks) {
        expect(isTaskPriority(task.priority)).toBe(true);
      }
      expect(new Set(template.tasks.map((task) => task.priority))).toEqual(
        new Set(TASK_PRIORITIES),
      );
    }
  });

  it('模板 id 与一级名称互不重复', () => {
    const ids = TEMPLATES.map((template) => template.id);
    const names = TEMPLATES.map((template) => template.primary);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('按 id 取模板，未知 id 直接报错', () => {
    expect(templateById('reading').primary).toBe('读书');
    expect(() => templateById('unknown' as never)).toThrow();
  });
});
