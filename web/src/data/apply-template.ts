/**
 * 空白页模板的生成与撤回（PRD V2-03 OP-08 / OP-09）。
 *
 * 生成与撤回都不写 events、不新增模板类动作：生成结果由分支与待办本身承载，
 * 撤回直接删除子树。模板根 id 记在 localStorage，供界面显示撤回入口；
 * 判定与写入仍以库内数据为准，记录丢失只是少一个入口。
 */

import type { Transaction } from 'dexie';
import { fail, ok, type Result } from '@/core/errors';
import { inheritedBranchColor, normalizeBranchColor } from '@/core/rules/branch-color';
import { childPath } from '@/core/rules/branch-path';
import { templateById, type TemplateId } from '@/core/rules/template-catalog';
import {
  assessTemplateWithdraw,
  isBlankWorkspace,
  type GuardRows,
} from '@/core/rules/template-guard';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import type { Branch, Commit, Milestone, Task } from './types';

const TEMPLATE_ROOT_KEY = 'committodo.template.root';

const TEMPLATE_COLORS: Record<TemplateId, string> = {
  fitness: 'mint',
  reading: 'honey',
  job: 'sky',
  'side-project': 'iris',
};

export interface AppliedTemplate {
  rootId: string;
  branchIds: string[];
  taskIds: string[];
}

export interface WithdrawnTemplate {
  branches: number;
  tasks: number;
}

export function rememberTemplateRoot(rootId: string): void {
  try {
    window.localStorage.setItem(TEMPLATE_ROOT_KEY, rootId);
  } catch {
    // 记录失败只影响撤回入口，不影响数据。
  }
}

export function readTemplateRoot(): string | null {
  try {
    return window.localStorage.getItem(TEMPLATE_ROOT_KEY);
  } catch {
    return null;
  }
}

export function clearTemplateRoot(): void {
  try {
    window.localStorage.removeItem(TEMPLATE_ROOT_KEY);
  } catch {
    // 同上。
  }
}

interface TemplateRows {
  guard: GuardRows;
  branches: Branch[];
}

async function readRows(tx: Transaction): Promise<TemplateRows> {
  const [branches, tasks, commits, milestones] = await Promise.all([
    tx.table<Branch, string>('branches').where('ownerId').equals(LOCAL_OWNER_ID).toArray(),
    tx.table<Task, string>('tasks').where('ownerId').equals(LOCAL_OWNER_ID).toArray(),
    tx.table<Commit, string>('commits').where('ownerId').equals(LOCAL_OWNER_ID).toArray(),
    tx.table<Milestone, string>('milestones').where('ownerId').equals(LOCAL_OWNER_ID).toArray(),
  ]);
  return { guard: { branches, tasks, commits, milestones }, branches };
}

/** 生成一套模板：1 条一级分支、2 条二级分支、4 条待办，不写 events。 */
export async function applyTemplate(
  templateId: TemplateId,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<AppliedTemplate>> {
  const template = templateById(templateId);
  try {
    const result = await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.milestones],
      async (tx) => {
        const rows = await readRows(tx);
        if (!isBlankWorkspace(rows.guard)) {
          return fail('domain.conflict', { field: 'template' });
        }

        const root = rows.branches.find(
          (branch) => branch.deletedAt === null && branch.depth === 0,
        );
        if (!root) return fail('domain.not_found', { field: 'parentId' });

        const at = deps.clock.now();
        const primaryId = deps.ids.ulid(at);
        const secondaryAId = deps.ids.ulid(at);
        const secondaryBId = deps.ids.ulid(at);
        const color = normalizeBranchColor(TEMPLATE_COLORS[templateId]);

        const primary: Branch = {
          id: primaryId,
          ownerId: LOCAL_OWNER_ID,
          parentId: root.id,
          path: childPath(root.path, primaryId),
          depth: 1,
          title: template.primary,
          goal: null,
          color,
          status: 'active',
          order: 1,
          archivedAt: null,
          finishedAt: null,
          finishedIntoId: null,
          droppedAt: null,
          dropReason: null,
          pinnedAt: null,
          taskTotal: 0,
          taskDone: 0,
          commitCount: 0,
          ownLastCommitAt: null,
          rev: 1,
          createdAt: at,
          updatedAt: at,
          deletedAt: null,
        };

        const secondary = (id: string, title: string, order: number): Branch => ({
          ...primary,
          id,
          parentId: primaryId,
          path: childPath(primary.path, id),
          depth: 2,
          title,
          color: inheritedBranchColor(primary.color),
          order,
          taskTotal: 2,
        });

        const secondaries = [
          secondary(secondaryAId, template.secondaries[0], 1),
          secondary(secondaryBId, template.secondaries[1], 2),
        ];

        const orderByBranch = new Map<string, number>();
        const taskRows: Task[] = template.tasks.map((spec) => {
          const branchId =
            spec.branch === 'secondary-a'
              ? secondaryAId
              : spec.branch === 'secondary-b'
                ? secondaryBId
                : primaryId;
          const order = (orderByBranch.get(branchId) ?? 0) + 1;
          orderByBranch.set(branchId, order);
          return {
            id: deps.ids.ulid(at),
            ownerId: LOCAL_OWNER_ID,
            branchId,
            title: spec.title,
            note: null,
            status: 'open',
            dueDate: null,
            plannedDate: null,
            completedAt: null,
            completedCommitId: null,
            cancelledAt: null,
            order,
            rev: 1,
            createdAt: at,
            updatedAt: at,
            deletedAt: null,
          };
        });

        await tx.table<Branch, string>('branches').bulkAdd([primary, ...secondaries]);
        await tx.table<Task, string>('tasks').bulkAdd(taskRows);

        return ok({
          rootId: primaryId,
          branchIds: [primaryId, secondaryAId, secondaryBId],
          taskIds: taskRows.map((task) => task.id),
        });
      },
    );
    if (result.ok) rememberTemplateRoot(result.value.rootId);
    return result;
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}

/** 撤回模板：删除整棵子树与待办；子树内有有效提交或里程碑时拒绝。 */
export async function withdrawTemplate(
  rootId: string,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<WithdrawnTemplate>> {
  try {
    const result = await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.milestones],
      async (tx) => {
        const rows = await readRows(tx);
        const assessment = assessTemplateWithdraw(rootId, rows.guard);
        if (!assessment.allowed) {
          return fail(assessment.reason === 'missing' ? 'domain.not_found' : 'domain.conflict', {
            field: 'template',
          });
        }

        await tx.table<Task, string>('tasks').bulkDelete(assessment.taskIds);
        await tx.table<Branch, string>('branches').bulkDelete(assessment.branchIds);
        return ok({
          branches: assessment.branchIds.length,
          tasks: assessment.taskIds.length,
        });
      },
    );
    // deps 保留在签名里，后续接入同步时与其它用例一致。
    void deps;
    if (result.ok) clearTemplateRoot();
    return result;
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
