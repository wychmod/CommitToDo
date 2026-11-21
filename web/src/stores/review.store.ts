import { create } from 'zustand';

/** 今天页回顾区的会话内 UI 状态，不持久化，也不存放领域数据。 */
interface ReviewState {
  expanded: boolean;
  monthOpen: boolean;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  openMonth: () => void;
  closeMonth: () => void;
}

export const useReviewStore = create<ReviewState>()((set) => ({
  expanded: false,
  monthOpen: false,
  toggleExpanded: () => set((state) => ({ expanded: !state.expanded })),
  setExpanded: (expanded) => set({ expanded }),
  openMonth: () => set({ monthOpen: true }),
  closeMonth: () => set({ monthOpen: false }),
}));
