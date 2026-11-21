/**
 * 今天页的 UI 状态（TECH-ARCHITECTURE.md §2.6）。
 *
 * 只存清单收起这类纯界面状态；待办、分支与提交一律从 Dexie 用 useLiveQuery 读。
 */
import { create } from 'zustand';

interface TodayState {
  /** P01 清单收起：只露第一条，完成后自动露出下一条。 */
  listCollapsed: boolean;
  setListCollapsed: (collapsed: boolean) => void;
  toggleListCollapsed: () => void;
}

export const useTodayStore = create<TodayState>()((set, get) => ({
  listCollapsed: false,
  setListCollapsed: (listCollapsed) => set({ listCollapsed }),
  toggleListCollapsed: () => set({ listCollapsed: !get().listCollapsed }),
}));
