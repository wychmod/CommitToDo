/**
 * 全局外壳的 UI 状态（TECH-ARCHITECTURE.md §2.6）。
 *
 * 只放「界面此刻长什么样」，不放任何领域数据：
 * 分支、待办、提交一律从 Dexie 用 useLiveQuery 读，禁止复制进 store。
 */
import { create } from 'zustand';

export type ShellOverlay =
  | 'quick-add'
  | 'task-detail'
  | 'commit-detail'
  | 'search'
  | 'confirm'
  | 'onboarding'
  | 'undo-receipt';

interface ShellState {
  overlay: ShellOverlay | null;
  undoMessage: string | null;
  openOverlay: (overlay: ShellOverlay) => void;
  closeOverlay: () => void;
  showUndo: (message: string) => void;
  clearUndo: () => void;
}

export const useShellStore = create<ShellState>()((set) => ({
  overlay: null,
  undoMessage: null,
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),
  showUndo: (undoMessage) => set({ overlay: 'undo-receipt', undoMessage }),
  clearUndo: () => set({ overlay: null, undoMessage: null }),
}));
