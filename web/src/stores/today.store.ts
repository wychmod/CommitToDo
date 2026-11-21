/**
 * 今天页的 UI 状态（TECH-ARCHITECTURE.md §2.6）。
 *
 * 只存清单收起与「哪一组已手动排序」这类纯界面状态；待办、分支与提交
 * 一律从 Dexie 用 useLiveQuery 读。手动排序标记持久化，刷新后仍按 order 展示。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TodayState {
  /** P01 清单收起：只露第一条，完成后自动露出下一条。 */
  listCollapsed: boolean;
  /** 今天三组里被手动拖拽过的组，改用 order 升序。 */
  manualGroups: Record<string, boolean>;
  setListCollapsed: (collapsed: boolean) => void;
  toggleListCollapsed: () => void;
  markManualGroup: (groupKey: string) => void;
}

export const useTodayStore = create<TodayState>()(
  persist(
    (set, get) => ({
      listCollapsed: false,
      manualGroups: {},
      setListCollapsed: (listCollapsed) => set({ listCollapsed }),
      toggleListCollapsed: () => set({ listCollapsed: !get().listCollapsed }),
      markManualGroup: (groupKey) =>
        set((state) =>
          state.manualGroups[groupKey]
            ? {}
            : { manualGroups: { ...state.manualGroups, [groupKey]: true } },
        ),
    }),
    {
      name: 'today.ui',
      version: 1,
      partialize: (state) => ({ manualGroups: state.manualGroups }),
    },
  ),
);
