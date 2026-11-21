import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { OverlayHost } from '@/components/overlays/overlay-host';
import { navSectionFor, type NavSection } from '@/core/rules/nav-selection';
import { isBadgeBackfillSkipped } from '@/components/badges/backfill-guard';
import { runDailyAutoBackup } from '@/data/daily-auto-backup';
import { ensureRootBranch } from '@/data/ensure-root-branch';
import { grantBadge } from '@/data/grant-badge';
import { useStorageReady } from '@/data/hooks';
import { t, type MessageKey } from '@/i18n';
import { SEARCH_TRIGGER_ID } from '@/stores/search.store';
import { useShellStore } from '@/stores/shell.store';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import styles from './app-shell.module.css';

const NAV_ITEMS: ReadonlyArray<{ section: NavSection; to: string; key: MessageKey }> = [
  { section: 'today', to: '/today', key: 'nav.today' },
  { section: 'branches', to: '/branches', key: 'nav.branches' },
  { section: 'history', to: '/history', key: 'nav.history' },
  { section: 'me', to: '/me', key: 'nav.me' },
];

function scrollKeyFor(pathname: string, search: string): string {
  return `scroll:${pathname}${search}`;
}

/**
 * 应用外壳（P01–P08 公共部分）。
 *
 * 桌面为顶栏 + 左导航，窄屏为顶栏 + 底部导航；四个一级入口同序，
 * 二级页继承所属入口的选中态。外壳不含业务逻辑，也不直接读写领域数据。
 */
export function AppShell() {
  const location = useLocation();
  const openOverlay = useShellStore((state) => state.openOverlay);
  const { status, retry } = useStorageReady();
  const section = navSectionFor(location.pathname);
  const scrollKey = scrollKeyFor(location.pathname, location.search);

  // 首次进入工作区时确保根分支「我」存在（M02 OP-01）；用例本身幂等，重复调用安全。
  // 随后写当日自动快照（V1-06 OP-01），失败不阻断进入；再补查漏发的徽章（M11 OP-03），
  // 导入后的本次会话跳过（OP-08）。
  useEffect(() => {
    if (status !== 'ready') return;
    const skipBackfill = isBadgeBackfillSkipped();
    void ensureRootBranch().then(async () => {
      await runDailyAutoBackup();
      if (!skipBackfill) void grantBadge();
    });
  }, [status]);

  useEffect(() => {
    const save = () => {
      try {
        window.sessionStorage.setItem(scrollKey, String(window.scrollY));
      } catch {
        // 会话状态丢失只影响滚动恢复，不影响业务。
      }
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [scrollKey]);

  useEffect(() => {
    let top = 0;
    try {
      top = Number(window.sessionStorage.getItem(scrollKey) ?? 0) || 0;
    } catch {
      top = 0;
    }
    window.scrollTo(0, top);
  }, [scrollKey]);

  // 全局快捷键：Ctrl/Cmd + K 打开搜索（V1-04 OP-01）。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      openOverlay('search');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openOverlay]);

  const renderNav = () =>
    NAV_ITEMS.map((item) => (
      <Link
        key={item.section}
        to={item.to}
        className={item.section === section ? styles.navActive : styles.navItem}
        aria-current={item.section === section ? 'page' : undefined}
      >
        {t(item.key)}
      </Link>
    ));

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand}>
          {t('app.name')}
        </Link>
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={() => openOverlay('quick-add')}>
            {t('shell.quickAdd')}
          </button>
          <button
            type="button"
            id={SEARCH_TRIGGER_ID}
            className={styles.action}
            aria-keyshortcuts="Control+K Meta+K"
            onClick={() => openOverlay('search')}
          >
            {t('shell.search')}
          </button>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <nav className={styles.nav} aria-label={t('shell.primaryNav')}>
          {renderNav()}
        </nav>
        <span className={styles.localTag}>{t('app.localTag')}</span>
      </aside>

      <main className={styles.content}>
        {status === 'error' ? (
          <div className={styles.storageError}>
            <EmptyState
              messageKey="shell.storageUnavailable"
              action={
                <button type="button" className={styles.retry} onClick={retry}>
                  {t('error.retry')}
                </button>
              }
            />
          </div>
        ) : status === 'checking' ? (
          <div className={styles.storageError}>
            <LoadingShell />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <nav className={styles.bottomNav} aria-label={t('shell.primaryNav')}>
        {renderNav()}
      </nav>

      <OverlayHost />
    </div>
  );
}
