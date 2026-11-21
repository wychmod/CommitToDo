/**
 * 分支树页的 UI 状态（TECH-ARCHITECTURE.md §2.6）。
 *
 * 只记展开/折叠的覆盖值：没有覆盖时按层级取默认（L1、L2 展开，L3 折叠）。
 * 分支数据本身来自 Dexie 的 useLiveQuery，禁止复制进 store。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 默认展开 L1 与 L2；L3 折叠（PRD M02 §4.1）。 */
export function isExpandedByDefault(depth: number): boolean {
  return depth <= 2;
}

interface BranchesUiState {
  expanded: Record<string, boolean>;
  setExpanded: (branchId: string, expanded: boolean) => void;
  expandMany: (branchIds: readonly string[]) => void;
}

export const useBranchesStore = create<BranchesUiState>()(
  persist(
    (set) => ({
      expanded: {},
      setExpanded: (branchId, expanded) =>
        set((state) => ({ expanded: { ...state.expanded, [branchId]: expanded } })),
      expandMany: (branchIds) =>
        set((state) => {
          if (branchIds.length === 0) return {};
          const next = { ...state.expanded };
          for (const branchId of branchIds) next[branchId] = true;
          return { expanded: next };
        }),
    }),
    { name: 'branches.expanded', version: 1 },
  ),
);
