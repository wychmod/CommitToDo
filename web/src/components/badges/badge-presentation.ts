import { canonicalBadgeId } from '@/core/rules/badge-catalog';
import type { BadgeJumpTarget } from '@/core/rules/badge-view';
import type { MessageKey } from '@/i18n';

/** 徽章名称、来源句与条件句的唯一映射（V1-05 §4.1 / §4.2）。 */
export function badgeNameKey(catalogId: string): MessageKey {
  switch (canonicalBadgeId(catalogId)) {
    case 'first-commit':
      return 'badge.firstCommit.name';
    case 'first-fork':
      return 'badge.firstFork.name';
    case 'first-milestone':
      return 'badge.firstMilestone.name';
    case 'first-merge':
      return 'badge.firstMerge.name';
    case 'all-merged':
      return 'badge.allMerged.name';
    case 'dual-lanes':
      return 'badge.dualLanes.name';
    case 'let-go':
      return 'badge.letGo.name';
    case 'well-ended':
      return 'badge.wellEnded.name';
    case 'five-faces':
      return 'badge.fiveFaces.name';
    case 'trunk':
      return 'badge.trunk.name';
    case 'backfill':
      return 'badge.backfill.name';
    case 'evergreen':
      return 'badge.evergreen.name';
    case 'first-year':
      return 'badge.firstYear.name';
    case 'three-milestones':
      return 'badge.threeMilestones.name';
    case 'milestone-note':
      return 'badge.milestoneNote.name';
    case 'year-marks':
      return 'badge.yearMarks.name';
    case 'night-flight':
      return 'badge.nightFlight.name';
    case 'cross-year':
      return 'badge.crossYear.name';
    case 'blank-year':
      return 'badge.blankYear.name';
    case 'revival':
      return 'badge.revival.name';
    case 'full-moon':
      return 'badge.fullMoon.name';
    default:
      return 'badge.unknown.name';
  }
}

export function badgeSourceKey(catalogId: string): MessageKey {
  switch (canonicalBadgeId(catalogId)) {
    case 'first-commit':
      return 'badge.firstCommit.source';
    case 'first-fork':
      return 'badge.firstFork.source';
    case 'first-milestone':
      return 'badge.firstMilestone.source';
    case 'first-merge':
      return 'badge.firstMerge.source';
    case 'all-merged':
      return 'badge.allMerged.source';
    case 'dual-lanes':
      return 'badge.dualLanes.source';
    case 'let-go':
      return 'badge.letGo.source';
    case 'well-ended':
      return 'badge.wellEnded.source';
    case 'five-faces':
      return 'badge.fiveFaces.source';
    case 'trunk':
      return 'badge.trunk.source';
    case 'backfill':
      return 'badge.backfill.source';
    case 'evergreen':
      return 'badge.evergreen.source';
    case 'first-year':
      return 'badge.firstYear.source';
    case 'three-milestones':
      return 'badge.threeMilestones.source';
    case 'milestone-note':
      return 'badge.milestoneNote.source';
    case 'year-marks':
      return 'badge.yearMarks.source';
    case 'night-flight':
      return 'badge.nightFlight.source';
    case 'cross-year':
      return 'badge.crossYear.source';
    case 'blank-year':
      return 'badge.blankYear.source';
    case 'revival':
      return 'badge.revival.source';
    case 'full-moon':
      return 'badge.fullMoon.source';
    default:
      return 'badge.unknown.source';
  }
}

export function badgeConditionKey(catalogId: string): MessageKey {
  switch (canonicalBadgeId(catalogId)) {
    case 'first-commit':
      return 'badge.firstCommit.condition';
    case 'first-fork':
      return 'badge.firstFork.condition';
    case 'first-milestone':
      return 'badge.firstMilestone.condition';
    case 'first-merge':
      return 'badge.firstMerge.condition';
    case 'all-merged':
      return 'badge.allMerged.condition';
    case 'dual-lanes':
      return 'badge.dualLanes.condition';
    case 'let-go':
      return 'badge.letGo.condition';
    case 'well-ended':
      return 'badge.wellEnded.condition';
    case 'five-faces':
      return 'badge.fiveFaces.condition';
    case 'trunk':
      return 'badge.trunk.condition';
    case 'backfill':
      return 'badge.backfill.condition';
    case 'evergreen':
      return 'badge.evergreen.condition';
    case 'first-year':
      return 'badge.firstYear.condition';
    case 'three-milestones':
      return 'badge.threeMilestones.condition';
    case 'milestone-note':
      return 'badge.milestoneNote.condition';
    case 'year-marks':
      return 'badge.yearMarks.condition';
    case 'night-flight':
      return 'badge.nightFlight.condition';
    case 'cross-year':
      return 'badge.crossYear.condition';
    case 'blank-year':
      return 'badge.blankYear.condition';
    case 'revival':
      return 'badge.revival.condition';
    case 'full-moon':
      return 'badge.fullMoon.condition';
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
