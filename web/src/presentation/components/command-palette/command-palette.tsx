import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Folder,
  GitBranch,
  ListTodo,
  Plus,
  Search,
  Settings as SettingsIcon,
  Network,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

import { useCommandPaletteStore } from './command-palette.store';
import { useSearchStore } from '../../stores/search-store';
import { container } from '../../../core/di/injection-container';
import { IBranchRepository } from '../../../domain/repositories/i-branch-repository';
import { TaskStatus } from '../../../domain/entities/enums';

interface CommandAction {
  id: string;
  type: 'action';
  label: string;
  hint: string;
  icon: LucideIcon;
  keywords?: string[];
  onSelect: () => void;
}

interface CommandResult {
  id: string;
  section: 'actions' | 'tasks' | 'branches' | 'repositories';
  icon: LucideIcon;
  label: string;
  meta?: string;
  onSelect: () => void;
}

const SECTION_TITLES: Record<CommandResult['section'], string> = {
  actions: '动作',
  tasks: '任务',
  branches: '分支',
  repositories: '仓库',
};

/**
 * Headless command palette. Triggered by Ctrl/Cmd+K or by clicking the topbar
 * search input. Performs local-first fuzzy filtering against the existing
 * search store results. Intentionally NOT a global keyboard shortcut violation
 * — dialog opening disables page scroll and listens for Escape.
 */
export function CommandPalette(): JSX.Element {
  const open = useCommandPaletteStore((s) => s.open);
  const closePalette = useCommandPaletteStore((s) => s.closePalette);
  const setQuery = useCommandPaletteStore((s) => s.setQuery);
  const query = useCommandPaletteStore((s) => s.query);

  const { tasks, branches, repositories, search, clear } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [hasLoaded, setHasLoaded] = useState(false);

  // Search whenever the palette is open and the query changes
  useEffect(() => {
    if (!open) return;
    if (query.trim()) {
      void search(query);
      setHasLoaded(true);
    } else if (hasLoaded) {
      clear();
    }
  }, [open, query, search, clear, hasLoaded]);

  // Focus input when palette opens; reset on close
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    setHasLoaded(false);
    return undefined;
  }, [open]);

  const navigateTo = useCallback((path: string): void => {
    closePalette();
    navigate(path);
  }, [closePalette, navigate]);

  // Build the actions list (always available)
  const actions = useMemo<CommandResult[]>(() => {
    const list: CommandAction[] = [
      {
        id: 'go-overview',
        type: 'action',
        label: '进入工作台',
        hint: 'App 总览',
        icon: ListTodo,
        keywords: ['home', '工作台', 'overview', 'workspace'],
        onSelect: () => navigateTo('/workspace'),
      },
      {
        id: 'go-search',
        type: 'action',
        label: '打开搜索页',
        hint: 'Search',
        icon: Search,
        onSelect: () => navigateTo('/search'),
      },
      {
        id: 'go-graph',
        type: 'action',
        label: '查看 Graph',
        hint: 'Graph',
        icon: Network,
        onSelect: () => navigateTo('/graph'),
      },
      {
        id: 'go-heatmap',
        type: 'action',
        label: '查看热力图',
        hint: 'Heatmap',
        icon: BarChart3,
        onSelect: () => navigateTo('/heatmap'),
      },
      {
        id: 'go-settings',
        type: 'action',
        label: '打开设置',
        hint: 'Settings',
        icon: SettingsIcon,
        onSelect: () => navigateTo('/settings'),
      },
      {
        id: 'go-landing',
        type: 'action',
        label: '回到首页',
        hint: 'Landing',
        icon: ArrowRight,
        onSelect: () => navigateTo('/'),
      },
    ];
    return list.map<CommandResult>((a) => ({
      id: a.id,
      section: 'actions',
      icon: a.icon,
      label: a.label,
      meta: a.hint,
      onSelect: a.onSelect,
    }));
  }, [navigateTo]);

  const taskResults = useMemo<CommandResult[]>(() => {
    const branchRepo = container.resolve<IBranchRepository>('IBranchRepository');
    return tasks.slice(0, 6).map((t) => ({
      id: `task:${t.id}`,
      section: 'tasks' as const,
      icon: ListTodo,
      label: t.title,
      meta: TaskStatus.label(t.status),
      onSelect: () => {
        void (async () => {
          const branch = await branchRepo.getById(t.branchId);
          if (!branch) return;
          navigateTo(
            `/repository/${branch.repositoryId}?branch=${branch.id}&task=${t.id}`
          );
        })();
      },
    }));
  }, [navigateTo, tasks]);

  const branchResults = useMemo<CommandResult[]>(
    () =>
      branches.slice(0, 4).map((b) => ({
        id: `branch:${b.id}`,
        section: 'branches' as const,
        icon: GitBranch,
        label: b.name,
        meta: b.isMain ? 'main' : 'feature',
        onSelect: () => navigateTo(`/repository/${b.repositoryId}?branch=${b.id}`),
      })),
    [branches, navigateTo]
  );

  const repositoryResults = useMemo<CommandResult[]>(
    () =>
      repositories.slice(0, 4).map((r) => ({
        id: `repo:${r.id}`,
        section: 'repositories' as const,
        icon: Folder,
        label: r.name,
        meta: '仓库',
        onSelect: () => navigateTo(`/repository/${r.id}`),
      })),
    [repositories, navigateTo]
  );

  const filtered = useMemo<CommandResult[]>(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // No query: show only actions
      return actions;
    }
    return [
      ...actions.filter(
        (a) =>
          a.label.toLowerCase().includes(trimmed) ||
          (a.meta ?? '').toLowerCase().includes(trimmed)
      ),
      ...taskResults,
      ...branchResults,
      ...repositoryResults,
    ];
  }, [actions, branchResults, repositoryResults, taskResults, query]);

  // Group filtered results by section
  const grouped = useMemo(() => {
    const groups: Record<CommandResult['section'], CommandResult[]> = {
      actions: [],
      tasks: [],
      branches: [],
      repositories: [],
    };
    filtered.forEach((r) => groups[r.section].push(r));
    return groups;
  }, [filtered]);

  const flat = useMemo(() => filtered, [filtered]);
  const selectedIndex = useCommandPaletteStore((s) => s.selectedIndex);
  const setSelectedIndex = useCommandPaletteStore((s) => s.setSelectedIndex);

  const handleSelect = (result: CommandResult): void => {
    result.onSelect();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(Math.min(flat.length - 1, selectedIndex + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = flat[selectedIndex];
        if (target) handleSelect(target);
      } else if (e.key === 'Escape') {
        closePalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, selectedIndex, setSelectedIndex, closePalette]);

  // Global hotkey: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) closePalette();
        else useCommandPaletteStore.getState().openPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closePalette]);

  let runningIndex = -1;
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => (o ? useCommandPaletteStore.getState().openPalette() : closePalette())}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="cmdk-overlay">
          <DialogPrimitive.Content
            className="cmdk-shell"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
            aria-label="Command palette"
          >
            <div className="cmdk-input-wrap">
              <Search className="h-4 w-4 text-ink-subtle" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索任务、分支、仓库，或执行动作…"
                className="cmdk-input"
                spellCheck={false}
                autoComplete="off"
              />
              <span className="topbar-search-kbd">ESC</span>
            </div>
            <div className="cmdk-results">
              {flat.length === 0 ? (
                <div className="cmdk-empty">
                  没有匹配项。试试搜索任务标题、分支名或仓库名。
                </div>
              ) : (
                (Object.keys(grouped) as Array<keyof typeof grouped>).map((section) => {
                  const items = grouped[section];
                  if (items.length === 0) return null;
                  return (
                    <div key={section}>
                      <div className="cmdk-section-title">{SECTION_TITLES[section]}</div>
                      {items.map((result) => {
                        runningIndex += 1;
                        const isSelected = runningIndex === selectedIndex;
                        const Icon = result.icon;
                        return (
                          <button
                            key={result.id}
                            type="button"
                            data-selected={isSelected}
                            className="cmdk-item"
                            onMouseEnter={() => setSelectedIndex(runningIndex)}
                            onClick={() => handleSelect(result)}
                          >
                            <Icon className="h-4 w-4 text-ink-subtle" aria-hidden />
                            <span>{result.label}</span>
                            <span className="cmdk-item-meta">{result.meta}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
            <div className="cmdk-footer">
              <span>
                <Plus className="mr-1 inline-block h-3 w-3" aria-hidden />新建
              </span>
              <span>↑↓ 选择</span>
              <span>⏎ 执行</span>
              <span>ESC 关闭</span>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
