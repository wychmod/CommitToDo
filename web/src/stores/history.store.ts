/**
 * 历程页的 UI 状态（M06 §4.3 / OP-04、OP-05）。
 *
 * 时间范围与分支筛选写本机存储，正常进入沿用上次设置；
 * 展开状态只在本会话内保留。直达路径只读这些状态，不写入。
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_HISTORY_FILTER,
  normalizeHistoryFilter,
  type HistoryFilter,
} from '@/core/rules/timeline-filter';
import type { TimeRangeKind } from '@/core/rules/time-range';

interface HistoryFilterState {
  filter: HistoryFilter;
  setRange: (range: TimeRangeKind) => void;
  setBranchId: (branchId: string | null) => void;
}

export const useHistoryFilterStore = create<HistoryFilterState>()(
  persist(
    (set) => ({
      filter: { ...DEFAULT_HISTORY_FILTER },
      setRange: (range) => set((state) => ({ filter: { ...state.filter, range } })),
      setBranchId: (branchId) => set((state) => ({ filter: { ...state.filter, branchId } })),
    }),
    {
      name: 'history.filter',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ filter: state.filter }),
      merge: (persisted, current) => {
        const value = persisted as { filter?: unknown } | undefined;
        return { ...current, filter: normalizeHistoryFilter(value?.filter) };
      },
    },
  ),
);

interface HistoryExpandedState {
  expanded: Record<string, boolean>;
  setExpanded: (branchId: string, expanded: boolean) => void;
  toggleExpanded: (branchId: string, fallback: boolean) => void;
}

export const useHistoryExpandedStore = create<HistoryExpandedState>()(
  persist(
    (set, get) => ({
      expanded: {},
      setExpanded: (branchId, expanded) =>
        set((state) => ({ expanded: { ...state.expanded, [branchId]: expanded } })),
      toggleExpanded: (branchId, fallback) => {
        const current = get().expanded[branchId] ?? fallback;
        set((state) => ({ expanded: { ...state.expanded, [branchId]: !current } }));
      },
    }),
    {
      name: 'history.expanded',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
