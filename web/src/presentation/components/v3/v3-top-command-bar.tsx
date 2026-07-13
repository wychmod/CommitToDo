import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import {
  Bell,
  ChevronDown,
  Cloud,
  CloudOff,
  Folder,
  GitBranch,
  Layers,
  Moon,
  Plus,
  Search,
  Star,
  Sun,
  User,
} from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/core/utils/formatters';
import { Repository } from '@/domain/entities/repository';
import { useHomeStore } from '@/presentation/stores/home-store';
import { useSettingsStore } from '@/presentation/stores/settings-store';
import { useCommandPaletteStore } from '@/presentation/components/command-palette/command-palette.store';
import { V3IconButton } from './v3-icon-button';
import { V3NewMenu } from './v3-new-menu';

export interface V3TopCommandBarProps {
  currentRepositoryId?: string;
  className?: string;
}

type OnlineState = 'online' | 'offline';

/**
 * V3 top command bar.
 *
 * 68px fixed header that hosts brand, workspace/repository switchers, the
 * command palette entry, primary "new" action and utility menus.
 */
export function V3TopCommandBar({
  currentRepositoryId,
  className,
}: V3TopCommandBarProps): JSX.Element {
  const navigate = useNavigate();
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const repositories = useHomeStore((s) => s.repositories);
  const loadRepositories = useHomeStore((s) => s.load);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const [onlineState, setOnlineState] = React.useState<OnlineState>('online');
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    if (repositories.length === 0) void loadRepositories();
  }, [repositories.length, loadRepositories]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = (): void => setOnlineState('online');
    const handleOffline = (): void => setOnlineState('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!window.navigator.onLine) setOnlineState('offline');
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.platform));
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeRepository = React.useMemo(
    () => repositories.find((r) => r.id === currentRepositoryId) ?? null,
    [repositories, currentRepositoryId]
  );

  const kbdHint = isMac ? '⌘K' : 'Ctrl+K';
  const savedLabel = onlineState === 'offline' ? '离线' : '已保存';

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-[var(--v3-border-soft)] bg-[var(--v3-header)] px-4',
        className
      )}
      role="banner"
    >
      {/* Brand + workspace + repository */}
      <div className="flex items-center gap-3">
        <a
          href="/workspace"
          className="flex items-center gap-2.5 text-[var(--v3-text-strong)]"
          onClick={(e) => {
            e.preventDefault();
            navigate('/workspace');
          }}
          aria-label="返回工作台"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[var(--v3-radius-md)] bg-[var(--v3-text-strong)] text-[var(--v3-bg)]">
            <GitBranch size={18} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight tablet:inline">
            CommitToDo
          </span>
        </a>

        <span
          className="hidden h-6 w-px bg-[var(--v3-border)] tablet:inline"
          aria-hidden="true"
        />

        <WorkspaceSwitcher />
        <RepositorySwitcher
          repositories={repositories}
          activeRepository={activeRepository}
        />
      </div>

      {/* Search */}
      <button
        type="button"
        onClick={openPalette}
        className="mx-4 flex flex-1 max-w-[420px] items-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 py-2 text-[14px] text-[var(--v3-text-muted)] transition-[border-color,background-color] duration-(--v3-fast) hover:border-[var(--v3-border)] hover:bg-[var(--v3-control)]"
        aria-label="打开命令面板"
      >
        <Search size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="flex-1 text-left">搜索任务 / 仓库 / 命令…</span>
        <kbd className="rounded-[var(--v3-radius-sm)] bg-[var(--v3-control)] px-1.5 py-0.5 text-[12px] text-[var(--v3-text-muted)]">
          {kbdHint}
        </kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <V3NewMenu currentRepositoryId={currentRepositoryId} />

        <div className="flex items-center gap-1 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-2.5 py-1.5 text-[13px] text-[var(--v3-text-secondary)]">
          {onlineState === 'offline' ? (
            <CloudOff size={14} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Cloud size={14} strokeWidth={1.5} aria-hidden="true" />
          )}
          <span className="hidden mobile:inline">{savedLabel}</span>
        </div>

        <V3IconButton
          aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
          onClick={() => setDarkMode(!isDarkMode)}
        >
          {isDarkMode ? (
            <Sun size={16} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
          )}
        </V3IconButton>

        <V3IconButton aria-label="通知（即将支持）">
          <Bell size={16} strokeWidth={1.5} aria-hidden="true" />
        </V3IconButton>

        <UserMenu />
      </div>
    </header>
  );
}

function WorkspaceSwitcher(): JSX.Element {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="hidden items-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-2.5 py-1.5 text-[13px] text-[var(--v3-text)] transition-[background-color,border-color] duration-(--v3-fast) hover:bg-[var(--v3-control)] data-[state=open]:bg-[var(--v3-control)] tablet:inline-flex"
          aria-label="切换工作空间"
          data-state={open ? 'open' : 'closed'}
        >
          <Layers size={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="max-w-[120px] truncate">本地工作区</span>
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-2 shadow-[var(--v3-shadow-panel)]"
        >
          <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--v3-text-muted)]">
            当前工作空间
          </p>
          <p className="px-2 text-[14px] font-medium text-[var(--v3-text-strong)]">
            本地工作区
          </p>
          <p className="px-2 pt-0.5 text-[12px] text-[var(--v3-text-muted)]">
            IndexedDB / 离线优先 / 本地保存
          </p>
          <div className="my-2 h-px bg-[var(--v3-divider)]" aria-hidden="true" />
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-text-disabled)]"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>新建工作空间（即将支持）</span>
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

interface RepositorySwitcherProps {
  repositories: Repository[];
  activeRepository: Repository | null;
}

function RepositorySwitcher({
  repositories,
  activeRepository,
}: RepositorySwitcherProps): JSX.Element {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  const filtered = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return repositories;
    return repositories.filter((r) => r.name.toLowerCase().includes(trimmed));
  }, [repositories, query]);

  const handleSelect = (repositoryId: string): void => {
    setOpen(false);
    setQuery('');
    navigate(`/repository/${repositoryId}`);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="hidden items-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-2.5 py-1.5 text-[13px] text-[var(--v3-text)] transition-[background-color,border-color] duration-(--v3-fast) hover:bg-[var(--v3-control)] data-[state=open]:bg-[var(--v3-control)] tablet:inline-flex"
          aria-label="切换仓库"
          data-state={open ? 'open' : 'closed'}
        >
          {activeRepository ? (
            <>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[var(--v3-radius-sm)]"
                style={{ backgroundColor: activeRepository.color }}
                aria-hidden="true"
              />
              <span className="max-w-[140px] truncate">{activeRepository.name}</span>
            </>
          ) : (
            <>
              <Folder size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>选择仓库</span>
            </>
          )}
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[280px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-1 shadow-[var(--v3-shadow-panel)]"
        >
          <div className="flex items-center gap-2 border-b border-[var(--v3-divider)] px-3 py-2">
            <Search size={14} strokeWidth={1.5} aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索仓库…"
              className="flex-1 bg-transparent text-[14px] text-[var(--v3-text)] outline-none placeholder:text-[var(--v3-text-muted)]"
              spellCheck={false}
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-[var(--v3-text-muted)]">
                {repositories.length === 0
                  ? '尚无仓库 — 先在工作台创建一个'
                  : '没有匹配的仓库'}
              </p>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r.id)}
                  className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-text)] transition-colors hover:bg-[var(--v3-control)]"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-[var(--v3-radius-sm)]"
                    style={{ backgroundColor: r.color }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate font-medium">{r.name}</span>
                  {r.id === activeRepository?.id ? (
                    <Star size={14} strokeWidth={1.5} aria-hidden="true" className="text-[var(--v3-warning)]" />
                  ) : null}
                </button>
              ))
            )}
          </div>
          <div className="my-1 h-px bg-[var(--v3-divider)]" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/workspace?create=1');
            }}
            className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-primary)] transition-colors hover:bg-[var(--v3-control)]"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>新建仓库</span>
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function UserMenu(): JSX.Element {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="用户菜单"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] text-[var(--v3-text-secondary)] transition-[background-color,border-color,color] duration-(--v3-fast) hover:border-[var(--v3-border)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
        >
          <User size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[200px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-1 shadow-[var(--v3-shadow-panel)]"
        >
          <div className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--v3-text-muted)]">
              当前状态
            </p>
            <p className="mt-1 text-[14px] font-medium text-[var(--v3-text-strong)]">
              本地模式
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--v3-text-muted)]">
              数据保存在本机 IndexedDB
            </p>
          </div>
          <div className="my-1 h-px bg-[var(--v3-divider)]" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
            className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-text)] transition-colors hover:bg-[var(--v3-control)]"
          >
            <span>设置</span>
          </button>
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-text-disabled)]"
          >
            <span>退出本地模式（即将支持）</span>
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
