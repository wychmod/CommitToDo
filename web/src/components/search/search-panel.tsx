import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentTzOffset, systemClock } from '@/core/clock';
import { formatMilestoneDate } from '@/core/rules/milestone-date';
import { matchesSearchPrefix, normalizeSearchQuery } from '@/core/rules/search-match';
import { groupSearchCandidates } from '@/core/rules/search-sort-limit';
import {
  collectSearchCandidates,
  type SearchCandidate,
  type SearchKind,
} from '@/core/rules/search-visibility';
import { useSearchData } from '@/data/hooks';
import { t, type MessageKey } from '@/i18n';
import { useSearchStore, SEARCH_TRIGGER_ID } from '@/stores/search.store';
import { useShellStore } from '@/stores/shell.store';
import styles from './search-panel.module.css';

const GROUP_KEYS: Record<SearchKind, MessageKey> = {
  branch: 'search.group.branch',
  task: 'search.group.task',
  commit: 'search.group.commit',
  milestone: 'search.group.milestone',
};

const EXAMPLE_KEYS: ReadonlyArray<{ kind: SearchKind; value: MessageKey }> = [
  { kind: 'branch', value: 'search.examples.branch' },
  { kind: 'task', value: 'search.examples.task' },
  { kind: 'commit', value: 'search.examples.commit' },
  { kind: 'milestone', value: 'search.examples.milestone' },
];

function rowKey(item: SearchCandidate): string {
  return `${item.kind}:${item.id}`;
}

function metaText(item: SearchCandidate, tzOffsetMinutes: number): string {
  if (item.kind === 'branch') {
    if (item.archived) return t('search.status.archived');
    return t(`search.status.${item.status}` as MessageKey);
  }
  if (item.kind === 'task') return item.dueDate ?? t('today.task.noDue');
  if (item.kind === 'commit') return item.date;
  return formatMilestoneDate(item.achievedAt, item.datePrecision, tzOffsetMinutes);
}

/**
 * 全局搜索弹层（P09 / V1-04 OP-01–OP-05）。
 *
 * 桌面居中、390 全屏；输入即匹配，↑/↓ 在结果间移动，Esc 关闭后焦点回到顶栏入口。
 * 搜索只读本机真实数据，示例树与撤销提交不进入结果。
 */
export function SearchPanel() {
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const openTaskDetail = useShellStore((state) => state.openTaskDetail);
  const openCommitDetail = useShellStore((state) => state.openCommitDetail);
  const openMilestoneDetail = useShellStore((state) => state.openMilestoneDetail);
  const includeArchived = useSearchStore((state) => state.includeArchived);
  const setIncludeArchived = useSearchStore((state) => state.setIncludeArchived);
  const data = useSearchData();
  const navigate = useNavigate();

  const [raw, setRaw] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const restoreFocus = useRef(false);

  const query = normalizeSearchQuery(raw);
  const tz = currentTzOffset(systemClock.now());

  const candidates = useMemo(
    () =>
      collectSearchCandidates(
        {
          branches: data.branches,
          tasks: data.tasks,
          commits: data.commits,
          milestones: data.milestones,
        },
        { includeArchived },
      ),
    [data.branches, data.tasks, data.commits, data.milestones, includeArchived],
  );
  const groups = useMemo(
    () =>
      groupSearchCandidates(candidates.filter((item) => matchesSearchPrefix(item.title, query))),
    [candidates, query],
  );
  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
    setMenuKey(null);
  }, [query]);

  // 关闭后把焦点还给顶栏搜索入口；结果跳转不抢焦点。
  useEffect(
    () => () => {
      if (restoreFocus.current) {
        document.getElementById(SEARCH_TRIGGER_ID)?.focus();
      }
    },
    [],
  );

  const closeAndRestore = () => {
    restoreFocus.current = true;
    closeOverlay();
  };

  const openItem = (item: SearchCandidate) => {
    if (item.kind === 'branch') {
      closeOverlay();
      navigate(`/branches/${item.id}`);
      return;
    }
    if (item.kind === 'task') {
      openTaskDetail(item.id);
      return;
    }
    if (item.kind === 'commit') {
      openCommitDetail(item.id);
      return;
    }
    openMilestoneDetail(item.id);
  };

  const locateInHistory = (item: SearchCandidate) => {
    if (item.kind !== 'commit' && item.kind !== 'milestone') return;
    closeOverlay();
    navigate(`/history?${item.kind}=${item.id}`);
  };

  const move = (delta: number) => {
    if (flatItems.length === 0) return;
    const current = activeIndex < 0 ? (delta > 0 ? -1 : flatItems.length) : activeIndex;
    const next = Math.min(flatItems.length - 1, Math.max(0, current + delta));
    const target = flatItems[next];
    if (!target) return;
    setActiveIndex(next);
    rowRefs.current.get(rowKey(target))?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeAndRestore();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onPointerDown={closeAndRestore}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('search.title')}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{t('search.title')}</h2>
          <button type="button" className={styles.close} onClick={closeAndRestore}>
            {t('shell.close')}
          </button>
        </header>

        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          value={raw}
          aria-label={t('search.label')}
          placeholder={t('search.placeholder')}
          onChange={(event) => setRaw(event.target.value)}
        />

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          <span>{t('search.includeArchived')}</span>
        </label>

        <div className={styles.results}>
          {data.status === 'error' ? (
            <div className={styles.error} role="alert">
              <p>{t('search.loadFailed')}</p>
              <button type="button" className={styles.retry} onClick={data.retry}>
                {t('error.retry')}
              </button>
            </div>
          ) : null}

          {data.status === 'loading' && flatItems.length === 0 ? (
            <p className={styles.status}>{t('search.loading')}</p>
          ) : null}

          {query.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.status}>{t('search.hint')}</p>
              <ul className={styles.examples}>
                {EXAMPLE_KEYS.map((example) => (
                  <li key={example.kind} className={styles.example}>
                    <span className={styles.exampleKind}>{t(GROUP_KEYS[example.kind])}</span>
                    <span>{t(example.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {query.length > 0 && data.status === 'ready' && groups.length === 0 ? (
            <p className={styles.status}>
              {t('search.emptyPrefix')}
              {query}
              {t('search.emptySuffix')}
            </p>
          ) : null}

          {query.length > 0
            ? groups.map((group) => (
                <section
                  key={group.kind}
                  className={styles.group}
                  aria-labelledby={`search-group-${group.kind}`}
                >
                  <h3 id={`search-group-${group.kind}`} className={styles.groupTitle}>
                    {t(GROUP_KEYS[group.kind])}
                  </h3>
                  <ul className={styles.list}>
                    {group.items.map((item) => {
                      const key = rowKey(item);
                      const index = flatItems.indexOf(item);
                      const canLocate = item.kind === 'commit' || item.kind === 'milestone';
                      return (
                        <li key={key} className={styles.item}>
                          <button
                            type="button"
                            className={styles.row}
                            ref={(element) => {
                              if (element) rowRefs.current.set(key, element);
                              else rowRefs.current.delete(key);
                            }}
                            onFocus={() => setActiveIndex(index)}
                            onClick={() => openItem(item)}
                          >
                            <span className={styles.kind}>{t(GROUP_KEYS[item.kind])}</span>
                            <span className={styles.rowTitle}>{item.title}</span>
                            <span className={styles.path}>
                              {item.path || t('search.rootPath')}
                              {item.kind === 'commit' && item.sourceTitle ? (
                                <span className={styles.source}>
                                  {t('search.sourcePrefix')}
                                  {item.sourceTitle}
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.meta}>{metaText(item, tz)}</span>
                          </button>

                          {canLocate ? (
                            <>
                              <button
                                type="button"
                                className={styles.locate}
                                onClick={() => locateInHistory(item)}
                              >
                                {t('search.locate')}
                              </button>
                              <button
                                type="button"
                                className={styles.more}
                                aria-expanded={menuKey === key}
                                onClick={() => setMenuKey(menuKey === key ? null : key)}
                              >
                                {t('search.more')}
                              </button>
                              {menuKey === key ? (
                                <button
                                  type="button"
                                  className={styles.menuLocate}
                                  onClick={() => locateInHistory(item)}
                                >
                                  {t('search.locate')}
                                </button>
                              ) : null}
                            </>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  {group.hidden > 0 ? (
                    <p className={styles.hiddenHint}>
                      {t('search.hiddenPrefix')}
                      {group.hidden}
                      {t('search.hiddenSuffix')}
                    </p>
                  ) : null}
                </section>
              ))
            : null}
        </div>
      </section>
    </div>
  );
}
