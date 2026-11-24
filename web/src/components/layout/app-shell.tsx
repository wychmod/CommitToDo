import { useEffect, useRef, type ComponentType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { OverlayHost } from '@/components/overlays/overlay-host';
import { localClockTime, localDate } from '@/core/clock';
import { navSectionFor, type NavSection } from '@/core/rules/nav-selection';
import { isBadgeBackfillSkipped } from '@/components/badges/backfill-guard';
import { reportAnonymousStats } from '@/data/anonymous-stats';
import { verifyCloudSession } from '@/data/cloud/auth';
import { runDailyAutoBackup } from '@/data/daily-auto-backup';
import { ensureRootBranch } from '@/data/ensure-root-branch';
import { grantBadge } from '@/data/grant-badge';
import { useSettingsState, useStorageReady } from '@/data/hooks';
import { useSyncRunner } from '@/data/sync-hooks';
import { updateSettings } from '@/data/update-settings';
import { t, type MessageKey } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { SEARCH_TRIGGER_ID } from '@/stores/search.store';
import { useShellStore } from '@/stores/shell.store';
import { EmptyState } from '@/ui/empty-state';
import {
  DeviceIcon,
  HomeBranchIcon,
  HomeHistoryIcon,
  HomeTodayIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from '@/ui/icons';
import { LoadingShell } from '@/ui/loading-shell';
import styles from './app-shell.module.css';

const NAV_ITEMS: ReadonlyArray<{
  section: NavSection;
  to: string;
  key: MessageKey;
  Icon: ComponentType<{ size?: 18 }>;
}> = [
  { section: 'today', to: '/today', key: 'nav.today', Icon: HomeTodayIcon },
  { section: 'branches', to: '/branches', key: 'nav.branches', Icon: HomeBranchIcon },
  { section: 'history', to: '/history', key: 'nav.history', Icon: HomeHistoryIcon },
  { section: 'me', to: '/me', key: 'nav.me', Icon: UserIcon },
];

function scrollKeyFor(pathname: string, search: string): string {
  return `scroll:${pathname}${search}`;
}

/** 顶栏面包屑：一级入口 + 当前子页，按路由逐段收集。 */
function crumbsFor(pathname: string): MessageKey[] {
  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  const [root, second, third] = segments;
  switch (root) {
    case 'today':
      return second === 'all' ? ['nav.today', 'today.all.title'] : ['nav.today'];
    case 'branches':
      if (second === 'templates') return ['nav.branches', 'template.title'];
      return second ? ['nav.branches', 'page.branchDetail.title'] : ['nav.branches'];
    case 'history':
      return second ? ['nav.history', 'page.year.title'] : ['nav.history'];
    case 'me':
      if (second === 'badges') return ['nav.me', 'badge.wall.title'];
      if (second === 'help') return ['nav.me', 'page.help.title'];
      return ['nav.me'];
    case 'settings':
      if (second === 'sync' && third === 'devices') {
        return ['nav.me', 'nav.settings', 'page.syncDevices.title'];
      }
      if (second === 'sync' && third === 'conflicts') {
        return ['nav.me', 'nav.settings', 'page.syncConflicts.title'];
      }
      return ['nav.me', 'nav.settings'];
    case 'data':
      return ['nav.me', 'nav.data'];
    default:
      return ['page.notFound.title'];
  }
}

function backupLabel(at: number | null): string {
  if (at === null) return t('shell.localData');
  const date = localDate(at).slice(5).replace('-', '.');
  return `${t('shell.backupAtPrefix')}${date} ${localClockTime(at)}`;
}

/**
 * 应用外壳（P01–P08 公共部分）。
 *
 * 桌面为顶栏 + 左导航，窄屏为顶栏 + 底部导航；四个一级入口同序，
 * 二级页继承所属入口的选中态。外壳不含业务逻辑，也不直接读写领域数据。
 */
export function AppShell() {
  const location = useLocation();
  const isSample = location.pathname.replace(/\/+$/, '') === '/sample';
  const openOverlay = useShellStore((state) => state.openOverlay);
  const { status, retry } = useStorageReady();
  const { settings } = useSettingsState();
  const section = navSectionFor(location.pathname);
  const crumbs = crumbsFor(location.pathname);
  const scrollKey = scrollKeyFor(location.pathname, location.search);
  const principalId = useAuthStore((state) => state.principalId);
  const clearSession = useAuthStore((state) => state.clearSession);
  // 只在启动时校验一次：登录当下刚拿到的会话不重复校验，避免与 SDK 持久化竞态。
  const bootPrincipalId = useRef(principalId);

  // 登录后在线自动补推 outbox（V2-02 OP-02/OP-07），失败按退避重试。
  useSyncRunner(principalId);

  // 启动时异步校验云端会话（V2-01 §5）：确定失效才清本机会话，
  // 离线或未配置云环境时保持本机态，不阻塞首屏。
  useEffect(() => {
    if (!bootPrincipalId.current) return;
    let active = true;
    void verifyCloudSession().then((state) => {
      if (active && state === 'none') clearSession();
    });
    return () => {
      active = false;
    };
  }, [clearSession]);

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
    if (status !== 'ready' || !principalId) return;
    // 次日首次进入工作区上报前一日计数；失败静默，不影响任何操作（V2-02 OP-08）。
    void reportAnonymousStats(principalId);
  }, [status, principalId]);

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
    if (isSample) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      openOverlay('search');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSample, openOverlay]);

  const renderNav = () =>
    NAV_ITEMS.map((item) => {
      const Icon = item.Icon;
      return (
        <Link
          key={item.section}
          to={item.to}
          className={item.section === section ? styles.navActive : styles.navItem}
          aria-current={item.section === section ? 'page' : undefined}
        >
          <Icon size={18} />
          <span>{t(item.key)}</span>
        </Link>
      );
    });

  const toggleTheme = () => {
    void updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className={styles.shell} data-sample={isSample}>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            C
          </span>
          {t('app.name')}
        </Link>

        <nav className={styles.breadcrumbs} aria-label={t('shell.breadcrumbs')}>
          <span>{t('shell.workspaceName')}</span>
          {crumbs.map((key, index) => (
            <span key={key} className={styles.crumb}>
              <span aria-hidden="true">/</span>
              <span className={index === crumbs.length - 1 ? styles.crumbCurrent : undefined}>
                {t(key)}
              </span>
            </span>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <button
            type="button"
            id={SEARCH_TRIGGER_ID}
            className={styles.iconButton}
            aria-label={t('shell.search')}
            aria-keyshortcuts="Control+K Meta+K"
            onClick={() => openOverlay('search')}
          >
            <SearchIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={settings.theme === 'dark' ? t('shell.theme.dark') : t('shell.theme.light')}
            onClick={toggleTheme}
          >
            {settings.theme === 'dark' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
          </button>
          <button
            type="button"
            className={styles.quickAdd}
            onClick={() => openOverlay('quick-add')}
          >
            <PlusIcon size={16} />
            {t('shell.quickAdd')}
          </button>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <div className={styles.workspaceName}>
          <span className={styles.workspaceIcon}>
            <DeviceIcon size={18} />
          </span>
          <div>
            <strong>{t('shell.sidebarWorkspace')}</strong>
            <span>{t('app.localTag')}</span>
          </div>
        </div>
        <nav className={styles.nav} aria-label={t('shell.primaryNav')}>
          {renderNav()}
        </nav>
        <div className={styles.sidebarStatus}>
          <span>
            <i className={styles.localDot} aria-hidden="true" />
            {t('shell.localData')}
          </span>
          <span>{backupLabel(settings.lastAutoBackupAt)}</span>
        </div>
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
