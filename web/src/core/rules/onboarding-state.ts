/**
 * 首次引导的触发条件与步骤（PRD M12 A-01 / OP-01–OP-04）。
 *
 * 步骤不是「假下一步」，而是从真实数据推导：有分支 → 2/3，有待办 → 3/3，
 * 有有效提交 → 完成态。本机只保存「是否开始、是否跳过、是否结束」和引导中
 * 建出的分支/待办 id，刷新后从下一步继续。根分支本身不算真实数据。
 */

export interface OnboardingRows {
  branches: ReadonlyArray<{ depth: number; deletedAt: number | null }>;
  tasks: ReadonlyArray<{ deletedAt: number | null }>;
  commits: ReadonlyArray<{ voidedAt: number | null; deletedAt: number | null }>;
  milestones: ReadonlyArray<{ deletedAt: number | null }>;
}

export interface OnboardingData {
  /** 根分支之外的未删除分支数。 */
  extraBranchCount: number;
  taskCount: number;
  commitCount: number;
  milestoneCount: number;
}

export type OnboardingStep = 1 | 2 | 3 | 'done';

export interface OnboardingState {
  started: boolean;
  skipped: boolean;
  finished: boolean;
}

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  started: false,
  skipped: false,
  finished: false,
};

export function onboardingDataFrom(rows: OnboardingRows): OnboardingData {
  return {
    extraBranchCount: rows.branches.filter(
      (branch) => branch.deletedAt === null && branch.depth > 0,
    ).length,
    taskCount: rows.tasks.filter((task) => task.deletedAt === null).length,
    commitCount: rows.commits.filter(
      (commit) => commit.deletedAt === null && commit.voidedAt === null,
    ).length,
    milestoneCount: rows.milestones.filter((milestone) => milestone.deletedAt === null).length,
  };
}

/** 只认真实数据：根分支之外无分支、无待办、无有效提交、无里程碑。 */
export function needsOnboarding(data: OnboardingData): boolean {
  return (
    data.extraBranchCount === 0 &&
    data.taskCount === 0 &&
    data.commitCount === 0 &&
    data.milestoneCount === 0
  );
}

export function deriveOnboardingStep(data: OnboardingData): OnboardingStep {
  if (data.commitCount > 0) return 'done';
  if (data.taskCount > 0) return 3;
  if (data.extraBranchCount > 0) return 2;
  return 1;
}

/**
 * 卡片是否出现：跳过或结束后永不出现；无真实数据时自动出现；
 * 已开始且未结束时，即使已经产生数据也继续显示到完成。
 */
export function shouldShowOnboarding(state: OnboardingState, data: OnboardingData): boolean {
  if (state.skipped || state.finished) return false;
  if (needsOnboarding(data)) return true;
  return state.started;
}

/** 跳过作用于整个引导，已创建的数据保留。 */
export function skipOnboarding(state: OnboardingState): OnboardingState {
  return { ...state, started: true, skipped: true };
}

export function finishOnboarding(state: OnboardingState): OnboardingState {
  return { ...state, started: true, finished: true };
}

export function startOnboarding(state: OnboardingState): OnboardingState {
  return { ...state, started: true };
}

/** 跳过后的「重新查看引导」；只应在仍无真实数据时提供。 */
export function reopenOnboarding(): OnboardingState {
  return { started: true, skipped: false, finished: false };
}

/** 清空本机数据后回到初始状态。 */
export function resetOnboarding(): OnboardingState {
  return { ...INITIAL_ONBOARDING_STATE };
}
