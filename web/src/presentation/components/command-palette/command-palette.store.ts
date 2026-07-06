import { create } from 'zustand';

export type CommandPaletteSection = 'actions' | 'tasks' | 'branches' | 'repositories';

/**
 * Lightweight store that owns the Command Palette open/close state plus the
 * currently typed query. The actual results are computed on demand by the
 * CommandPalette component using the data layer — we keep the store narrow so
 * we never duplicate domain state.
 */
export interface CommandPaletteState {
  open: boolean;
  query: string;
  selectedIndex: number;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  query: '',
  selectedIndex: 0,
  openPalette: () => set({ open: true, query: '', selectedIndex: 0 }),
  closePalette: () => set({ open: false }),
  togglePalette: () =>
    set((state) => ({ open: !state.open, query: '', selectedIndex: 0 })),
  setQuery: (query) => set({ query, selectedIndex: 0 }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
}));

/** Convenience hook so consumers don't reach for the store factory each time. */
export const useCommandPalette = (): CommandPaletteState =>
  useCommandPaletteStore((state) => state);
