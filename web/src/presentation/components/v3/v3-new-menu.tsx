import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { FolderPlus, Plus, GitBranch, Upload } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/core/utils/formatters';
import { V3Button } from './v3-button';

export interface V3NewMenuProps {
  currentRepositoryId?: string;
  className?: string;
}

interface MenuItemSpec {
  id: string;
  label: string;
  icon: typeof Plus;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * Primary "+ 新建" dropdown for the V3 app shell.
 *
 * Adapts its default action to the current repository context: inside a repo
 * it offers new task/branch, otherwise it falls back to creating a repository.
 */
export function V3NewMenu({
  currentRepositoryId,
  className,
}: V3NewMenuProps): JSX.Element {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const items: MenuItemSpec[] = React.useMemo(() => {
    const closeAndNavigate = (path: string): void => {
      setOpen(false);
      navigate(path);
    };

    return [
      {
        id: 'new-task',
        label: '新建任务',
        icon: Plus,
        disabled: !currentRepositoryId,
        onSelect: () => {
          if (currentRepositoryId) {
            closeAndNavigate(`/repository/${currentRepositoryId}/task/new`);
          }
        },
      },
      {
        id: 'new-branch',
        label: '新建分支',
        icon: GitBranch,
        disabled: !currentRepositoryId,
        onSelect: () => {
          // Branches are created through a dialog on the repository pages.
          setOpen(false);
        },
      },
      {
        id: 'new-repository',
        label: '新建仓库',
        icon: FolderPlus,
        onSelect: () => closeAndNavigate('/workspace?create=1'),
      },
      {
        id: 'import-data',
        label: '导入数据',
        icon: Upload,
        onSelect: () => closeAndNavigate('/settings?scope=app'),
      },
    ];
  }, [currentRepositoryId, navigate]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <V3Button className={className}>
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>新建</span>
        </V3Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[200px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-1 shadow-[var(--v3-shadow-panel)]"
        >
          <ul className="flex flex-col gap-0.5" role="menu">
            {items.map((item) => (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[var(--v3-radius-sm)] px-2.5 py-2 text-left text-[14px] transition-[background-color,color] duration-(--v3-fast) ease-out',
                    item.disabled
                      ? 'cursor-not-allowed text-[var(--v3-text-disabled)]'
                      : 'text-[var(--v3-text)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)]'
                  )}
                >
                  <item.icon
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className={item.disabled ? 'text-[var(--v3-text-disabled)]' : 'text-[var(--v3-text-secondary)]'}
                  />
                  <span className="flex-1">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
