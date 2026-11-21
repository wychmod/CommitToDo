import type { BadgeJumpTarget } from '@/core/rules/badge-view';
import type { MessageKey } from '@/i18n';

/** 徽章名称与来源句的唯一映射（M11 §4.1 / §4.2）。 */
export function badgeNameKey(catalogId: string): MessageKey {
  switch (catalogId) {
    case 'first-commit':
      return 'badge.firstCommit.name';
    case 'first-branch':
      return 'badge.firstBranch.name';
    case 'first-milestone':
      return 'badge.firstMilestone.name';
    case 'first-merge':
      return 'badge.firstMerge.name';
    default:
      return 'badge.unknown.name';
  }
}

export function badgeSourceKey(catalogId: string): MessageKey {
  switch (catalogId) {
    case 'first-commit':
      return 'badge.firstCommit.source';
    case 'first-branch':
      return 'badge.firstBranch.source';
    case 'first-milestone':
      return 'badge.firstMilestone.source';
    case 'first-merge':
      return 'badge.firstMerge.source';
    default:
      return 'badge.unknown.source';
  }
}

/** 复用 M06 的直达参数：提交与里程碑优先，其余按分支 + 日期定位。 */
export function badgeHref(jump: BadgeJumpTarget): string {
  const params = new URLSearchParams();
  if (jump.commitId) {
    params.set('commit', jump.commitId);
  } else if (jump.milestoneId) {
    params.set('milestone', jump.milestoneId);
  } else {
    params.set('branch', jump.branchId);
    params.set('date', jump.date);
  }
  return `/history?${params.toString()}`;
}
