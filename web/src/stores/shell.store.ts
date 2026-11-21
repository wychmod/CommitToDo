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
  | 'undo-receipt'
  | 'milestone-detail'
  | 'milestone-new'
  | 'backfill';

interface ShellState {
  overlay: ShellOverlay | null;
  /** 待办详情浮层要展示的待办；关闭时清空。 */
  overlayTaskId: string | null;
  /** 快速添加要预填的分支；关闭时清空。 */
  overlayBranchId: string | null;
  /** 提交详情浮层要展示的提交；关闭时清空。 */
  overlayCommitId: string | null;
  /** 里程碑详情浮层要展示的里程碑；关闭时清空。 */
  overlayMilestoneId: string | null;
  /** 新建里程碑时预填的所属分支；为空时由面板回落到根分支。 */
  milestoneNewBranchId: string | null;
  /**
   * 刚刚保存的里程碑。来源页据此高亮新节点，短暂展示后由页面清空；
   * 关闭浮层不清理，否则保存后无法回到原位置。
   */
  milestoneFocusId: string | null;
  undoMessage: string | null;
  openOverlay: (overlay: ShellOverlay) => void;
  openQuickAdd: (branchId?: string | null) => void;
  openTaskDetail: (taskId: string) => void;
  openCommitDetail: (commitId: string) => void;
  openMilestoneDetail: (milestoneId: string) => void;
  openMilestoneNew: (branchId?: string | null) => void;
  setMilestoneFocus: (milestoneId: string | null) => void;
  closeOverlay: () => void;
  showUndo: (message: string) => void;
  clearUndo: () => void;
}

export const useShellStore = create<ShellState>()((set) => ({
  overlay: null,
  overlayTaskId: null,
  overlayBranchId: null,
  overlayCommitId: null,
  overlayMilestoneId: null,
  milestoneNewBranchId: null,
  milestoneFocusId: null,
  undoMessage: null,
  openOverlay: (overlay) => set({ overlay }),
  openQuickAdd: (overlayBranchId = null) => set({ overlay: 'quick-add', overlayBranchId }),
  openTaskDetail: (overlayTaskId) => set({ overlay: 'task-detail', overlayTaskId }),
  openCommitDetail: (overlayCommitId) => set({ overlay: 'commit-detail', overlayCommitId }),
  openMilestoneDetail: (overlayMilestoneId) =>
    set({ overlay: 'milestone-detail', overlayMilestoneId }),
  openMilestoneNew: (milestoneNewBranchId = null) =>
    set({ overlay: 'milestone-new', milestoneNewBranchId }),
  setMilestoneFocus: (milestoneFocusId) => set({ milestoneFocusId }),
  closeOverlay: () =>
    set({
      overlay: null,
      overlayTaskId: null,
      overlayBranchId: null,
      overlayCommitId: null,
      overlayMilestoneId: null,
      milestoneNewBranchId: null,
    }),
  showUndo: (undoMessage) => set({ overlay: 'undo-receipt', undoMessage }),
  clearUndo: () => set({ overlay: null, undoMessage: null }),
}));
