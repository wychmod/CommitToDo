import { describe, expect, it } from 'vitest';
import {
  INITIAL_ONBOARDING_STATE,
  deriveOnboardingStep,
  finishOnboarding,
  needsOnboarding,
  onboardingDataFrom,
  reopenOnboarding,
  resetOnboarding,
  shouldShowOnboarding,
  skipOnboarding,
  startOnboarding,
  type OnboardingData,
  type OnboardingRows,
} from './onboarding-state';

function rows(over: Partial<OnboardingRows> = {}): OnboardingRows {
  return {
    branches: [{ depth: 0, deletedAt: null }],
    tasks: [],
    commits: [],
    milestones: [],
    ...over,
  };
}

function data(over: Partial<OnboardingData> = {}): OnboardingData {
  return {
    extraBranchCount: 0,
    taskCount: 0,
    commitCount: 0,
    milestoneCount: 0,
    ...over,
  };
}

describe('onboardingDataFrom / needsOnboarding（M12 OP-01）', () => {
  it('只有根分支时仍视为无真实数据', () => {
    const view = onboardingDataFrom(rows());

    expect(view).toEqual(data());
    expect(needsOnboarding(view)).toBe(true);
  });

  it('根分支之外的已删除分支不计入', () => {
    const view = onboardingDataFrom(
      rows({
        branches: [
          { depth: 0, deletedAt: null },
          { depth: 1, deletedAt: 1 },
        ],
      }),
    );

    expect(view.extraBranchCount).toBe(0);
    expect(needsOnboarding(view)).toBe(true);
  });

  it('未删除的一级分支算真实数据', () => {
    const view = onboardingDataFrom(
      rows({
        branches: [
          { depth: 0, deletedAt: null },
          { depth: 1, deletedAt: null },
        ],
      }),
    );

    expect(view.extraBranchCount).toBe(1);
    expect(needsOnboarding(view)).toBe(false);
  });

  it('待办、有效提交与未删除里程碑都算真实数据', () => {
    expect(needsOnboarding(onboardingDataFrom(rows({ tasks: [{ deletedAt: null }] })))).toBe(false);
    expect(
      needsOnboarding(onboardingDataFrom(rows({ commits: [{ voidedAt: null, deletedAt: null }] }))),
    ).toBe(false);
    expect(needsOnboarding(onboardingDataFrom(rows({ milestones: [{ deletedAt: null }] })))).toBe(
      false,
    );
  });

  it('已删除待办、已撤销提交与已删除里程碑都不算真实数据', () => {
    const view = onboardingDataFrom(
      rows({
        tasks: [{ deletedAt: 1 }],
        commits: [{ voidedAt: 1, deletedAt: null }],
        milestones: [{ deletedAt: 1 }],
      }),
    );

    expect(view).toEqual(data());
    expect(needsOnboarding(view)).toBe(true);
  });
});

describe('deriveOnboardingStep（M12 OP-02）', () => {
  it('无数据 1/3，建分支 2/3，建待办 3/3，生成提交进入完成态', () => {
    expect(deriveOnboardingStep(data())).toBe(1);
    expect(deriveOnboardingStep(data({ extraBranchCount: 1 }))).toBe(2);
    expect(deriveOnboardingStep(data({ extraBranchCount: 1, taskCount: 1 }))).toBe(3);
    expect(
      deriveOnboardingStep({
        extraBranchCount: 1,
        taskCount: 1,
        commitCount: 1,
        milestoneCount: 0,
      }),
    ).toBe('done');
  });

  it('未建待办直接有提交也进入完成态', () => {
    expect(
      deriveOnboardingStep({
        extraBranchCount: 0,
        taskCount: 0,
        commitCount: 1,
        milestoneCount: 0,
      }),
    ).toBe('done');
  });

  it('同一份数据重复推导结果一致，不依赖调用次数', () => {
    const view = data({ extraBranchCount: 1, taskCount: 1 });

    expect(deriveOnboardingStep(view)).toBe(deriveOnboardingStep(view));
  });
});

describe('shouldShowOnboarding（M12 OP-01 / OP-04）', () => {
  it('无真实数据时自动出现，即使还没有标记开始', () => {
    expect(shouldShowOnboarding(INITIAL_ONBOARDING_STATE, data())).toBe(true);
  });

  it('已有真实数据且未开始时不出现', () => {
    expect(shouldShowOnboarding(INITIAL_ONBOARDING_STATE, data({ extraBranchCount: 1 }))).toBe(
      false,
    );
  });

  it('已开始且已产生数据时继续出现到完成', () => {
    expect(
      shouldShowOnboarding({ ...INITIAL_ONBOARDING_STATE, started: true }, data({ taskCount: 1 })),
    ).toBe(true);
  });

  it('跳过后不再自动展开，即使清空后仍无数据', () => {
    expect(shouldShowOnboarding(skipOnboarding(INITIAL_ONBOARDING_STATE), data())).toBe(false);
  });

  it('结束后不再出现，即使仍有真实数据', () => {
    expect(
      shouldShowOnboarding(finishOnboarding(INITIAL_ONBOARDING_STATE), data({ commitCount: 1 })),
    ).toBe(false);
  });

  it('跳过后「重新查看引导」恢复到 started 并重新出现', () => {
    const reopened = reopenOnboarding();

    expect(reopened).toEqual({ started: true, skipped: false, finished: false });
    expect(shouldShowOnboarding(reopened, data())).toBe(true);
  });

  it('清空后重置回到初始态，重新满足触发条件', () => {
    const skipped = skipOnboarding(INITIAL_ONBOARDING_STATE);
    const reset = resetOnboarding();

    expect(reset).toEqual(INITIAL_ONBOARDING_STATE);
    expect(shouldShowOnboarding(skipped, data())).toBe(false);
    expect(shouldShowOnboarding(reset, data())).toBe(true);
  });

  it('状态迁移是纯函数，不修改入参', () => {
    const state = { ...INITIAL_ONBOARDING_STATE };

    skipOnboarding(state);
    startOnboarding(state);
    finishOnboarding(state);

    expect(state).toEqual(INITIAL_ONBOARDING_STATE);
  });
});
