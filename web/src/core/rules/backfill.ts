/**
 * 回填过去的校验与归一（PRD V1-07 A-04 / OP-05 / OP-06）。
 *
 * 只创建月精度里程碑：标题必填、年月必填且不晚于当前月、所属分支须可接收。
 * 不产生提交与待办，因此不回填任何计数；「补白」徽章由写入用例触发。
 */

import {
  milestoneTargetReason,
  type MilestoneTargetBranch,
  type MilestoneTargetReason,
} from './milestone-target';

export const BACKFILL_MAX = 5;

export interface BackfillDraftRow {
  title: string;
  /** `YYYY-MM`；为空表示还没选。 */
  month: string;
  branchId: string | null;
}

export type BackfillField = 'rows' | 'title' | 'month' | 'branch';
export type BackfillReason =
  'empty' | 'invalid' | 'future' | 'limit' | 'missing' | MilestoneTargetReason;

export interface BackfillIssue {
  index: number;
  field: BackfillField;
  reason: BackfillReason;
}

export interface BackfillEntry {
  title: string;
  /** 归一为当月 1 日，供 `datePrecision=month` 写入。 */
  date: string;
  month: string;
  branchId: string;
}

export interface BackfillValidation {
  issues: BackfillIssue[];
  entries: BackfillEntry[];
  canSave: boolean;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isBackfillMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

export function validateBackfill(
  rows: readonly BackfillDraftRow[],
  branches: readonly MilestoneTargetBranch[],
  todayDate: string,
): BackfillValidation {
  const issues: BackfillIssue[] = [];
  const entries: BackfillEntry[] = [];

  if (rows.length > BACKFILL_MAX) {
    issues.push({ index: BACKFILL_MAX, field: 'rows', reason: 'limit' });
  }

  rows.forEach((row, index) => {
    const title = row.title.trim();
    if (!title) issues.push({ index, field: 'title', reason: 'empty' });

    const month = row.month.trim();
    let monthOk = false;
    if (!month) {
      issues.push({ index, field: 'month', reason: 'empty' });
    } else if (!isBackfillMonth(month)) {
      issues.push({ index, field: 'month', reason: 'invalid' });
    } else if (month > todayDate.slice(0, 7)) {
      issues.push({ index, field: 'month', reason: 'future' });
    } else {
      monthOk = true;
    }

    let branchId: string | null = null;
    if (!row.branchId) {
      issues.push({ index, field: 'branch', reason: 'missing' });
    } else {
      const branch = branches.find((item) => item.id === row.branchId);
      if (!branch) {
        issues.push({ index, field: 'branch', reason: 'missing' });
      } else {
        const reason = milestoneTargetReason(branch);
        if (reason !== null) issues.push({ index, field: 'branch', reason });
        else branchId = branch.id;
      }
    }

    if (title && monthOk && branchId) {
      entries.push({ title, date: `${month}-01`, month, branchId });
    }
  });

  return { issues, entries, canSave: issues.length === 0 && entries.length > 0 };
}
