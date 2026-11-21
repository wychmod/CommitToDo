/**
 * 全局搜索弹层的 UI 状态（PRD V1-04 OP-01）。
 *
 * 只放界面状态：归档开关在本次会话内保留，关闭弹层不清空；
 * 查询词与结果属于组件/数据层，不复制进 store。
 */
import { create } from 'zustand';

/** 顶栏搜索入口的固定 id，关闭弹层后焦点回到这里。 */
export const SEARCH_TRIGGER_ID = 'workspace-search-trigger';

interface SearchState {
  includeArchived: boolean;
  setIncludeArchived: (value: boolean) => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  includeArchived: false,
  setIncludeArchived: (includeArchived) => set({ includeArchived }),
}));
