import * as React from 'react';

import { cn } from '@/core/utils/formatters';

/**
 * Login / signup semantic tabs for the auth dialog.
 *
 * Flat tabs (no pill container): the active tab gets primary text + a 2px
 * underline. Implements the ARIA tabs pattern with roving tabindex - only the
 * selected tab is in the tab order, ArrowLeft/ArrowRight move between tabs,
 * Enter/Space (native button behavior) activates. Disabled (during an
 * operation) blocks switching.
 */
export interface AuthTabsProps {
  value: 'login' | 'signup';
  disabled?: boolean;
  onChange(value: 'login' | 'signup'): void;
}

const TABS = [
  { key: 'login', label: '登录' },
  { key: 'signup', label: '注册' },
] as const;

export function AuthTabs({
  value,
  disabled,
  onChange,
}: AuthTabsProps): JSX.Element {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = TABS.findIndex((t) => t.key === value);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (disabled) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (selectedIndex + dir + TABS.length) % TABS.length;
    onChange(TABS[next].key);
    // Button DOM nodes are stable (keyed), so the next ref already exists.
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="认证方式"
      className="flex gap-6 border-b border-[var(--v3-divider)]"
      onKeyDown={handleKeyDown}
    >
      {TABS.map((tab, index) => {
        const selected = tab.key === value;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => {
              if (!disabled && !selected) onChange(tab.key);
            }}
            className={cn(
              'relative h-[42px] text-[14px] font-medium transition-colors duration-(--v3-fast)',
              selected
                ? 'text-[var(--v3-primary)]'
                : 'text-[var(--v3-text-muted)] hover:text-[var(--v3-text-secondary)]',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {tab.label}
            {selected ? (
              <span
                className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--v3-primary)]"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
