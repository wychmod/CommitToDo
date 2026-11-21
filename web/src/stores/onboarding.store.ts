/**
 * 首次引导的本机状态（PRD M12 §5）。
 *
 * 只存 UI 状态：是否开始/跳过/结束，以及引导中建出的分支与待办 id；
 * 步骤本身由真实数据推导，刷新后不会回到 1/3。清空本机数据时一并移除。
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  finishOnboarding,
  reopenOnboarding,
  resetOnboarding,
  skipOnboarding,
  startOnboarding,
  type OnboardingState,
} from '@/core/rules/onboarding-state';

interface OnboardingStoreState extends OnboardingState {
  branchId: string | null;
  taskId: string | null;
  markStarted: () => void;
  recordBranch: (branchId: string) => void;
  recordTask: (taskId: string) => void;
  skip: () => void;
  finish: () => void;
  reopen: () => void;
  reset: () => void;
}

export const ONBOARDING_STORAGE_KEY = 'onboarding.state';

const BASE: OnboardingState & { branchId: string | null; taskId: string | null } = {
  started: false,
  skipped: false,
  finished: false,
  branchId: null,
  taskId: null,
};

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set) => ({
      ...BASE,
      markStarted: () => set((state) => ({ ...startOnboarding(state) })),
      recordBranch: (branchId) => set((state) => ({ ...startOnboarding(state), branchId })),
      recordTask: (taskId) => set((state) => ({ ...startOnboarding(state), taskId })),
      skip: () => set((state) => ({ ...skipOnboarding(state) })),
      finish: () => set((state) => ({ ...finishOnboarding(state) })),
      reopen: () => set(() => ({ ...reopenOnboarding(), branchId: null, taskId: null })),
      reset: () => set(() => ({ ...resetOnboarding(), branchId: null, taskId: null })),
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        started: state.started,
        skipped: state.skipped,
        finished: state.finished,
        branchId: state.branchId,
        taskId: state.taskId,
      }),
    },
  ),
);
