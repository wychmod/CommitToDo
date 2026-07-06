import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Folder, FolderOpen, Plus, Search, Star } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useNavigate } from 'react-router-dom';

import { useHomeStore } from '../../stores/home-store';
import { Repository } from '../../../domain/entities/repository';
import { cn } from '../../../core/utils/formatters';

export interface RepositorySwitcherProps {
  /**
   * Highlight the currently active repository — used when the user is inside
   * `/repository/:id` and the topbar should show what context they're in.
   */
  activeRepositoryId?: string;
  className?: string;
}

export function RepositorySwitcher({
  activeRepositoryId,
  className,
}: RepositorySwitcherProps): JSX.Element {
  const repositories = useHomeStore((s) => s.repositories);
  const load = useHomeStore((s) => s.load);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  const filtered = useMemo<Repository[]>(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return repositories;
    return repositories.filter((r) => r.name.toLowerCase().includes(trimmed));
  }, [repositories, query]);

  const active =
    repositories.find((r) => r.id === activeRepositoryId) ??
    repositories[0] ??
    null;

  const handleSelect = (repo: Repository): void => {
    setOpen(false);
    setQuery('');
    navigate(`/repository/${repo.id}`);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'topbar-action',
            'pl-3 pr-2 max-w-[220px] truncate',
            'data-[state=open]:bg-surface data-[state=open]:border-border',
            className
          )}
          aria-label="切换仓库"
          data-state={open ? 'open' : 'closed'}
        >
          {active ? (
            <>
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: active.color }}
                aria-hidden
              />
              <span className="truncate text-ink">{active.name}</span>
            </>
          ) : (
            <>
              <Folder className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate text-ink-muted">选择仓库</span>
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[320px] rounded-md border border-border-strong bg-canvas-elevated p-1 shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-border-quiet px-3 py-2">
            <Search className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索仓库…"
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
              spellCheck={false}
            />
          </div>

          <div className="max-h-[260px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-ink-muted">
                {repositories.length === 0
                  ? '尚无仓库 — 先在工作台创建一个'
                  : '没有匹配的仓库'}
              </p>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-surface"
                >
                  <span
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: r.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate font-medium">{r.name}</span>
                  {r.id === activeRepositoryId ? (
                    <Star className="h-3.5 w-3.5 text-warning" aria-hidden />
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="my-1 h-px bg-border-quiet" aria-hidden />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/workspace?create=1');
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-primary transition-colors hover:bg-surface"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span>新建仓库</span>
          </button>
          {active ? (
            <button
              type="button"
              onClick={() => handleSelect(active)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              <span>打开当前仓库</span>
            </button>
          ) : null}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
