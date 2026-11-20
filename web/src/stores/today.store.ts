/**
 * 今天页的 UI 状态（TECH-ARCHITECTURE.md §2.6）。
 *
 * 一屏一个 store，命名 `<screen>.store.ts`。只存选中项与浮层开关，
 * 待办列表本身来自 Dexie 的 useLiveQuery。
 */
import { create } from 'zustand';

interface TodayState {
  selectedTaskId: string | null;
  composerOpen: boolean;
  selectTask: (taskId: string | null) => void;
  setComposerOpen: (open: boolean) => void;
}

export const useTodayStore = create<TodayState>()((set) => ({
  selectedTaskId: null,
  composerOpen: false,
  selectTask: (selectedTaskId) => set({ selectedTaskId }),
  setComposerOpen: (composerOpen) => set({ composerOpen }),
}));
