import { NavLink, Outlet } from 'react-router-dom';
import { OverlayHost } from '@/components/overlays/overlay-host';
import { t, type MessageKey } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import styles from './app-shell.module.css';

const NAV_ITEMS: Array<{ to: string; key: MessageKey }> = [
  { to: '/today', key: 'nav.today' },
  { to: '/branches', key: 'nav.branches' },
  { to: '/history', key: 'nav.history' },
  { to: '/me', key: 'nav.me' },
  { to: '/settings', key: 'nav.settings' },
  { to: '/data', key: 'nav.data' },
];

/** 应用外壳：侧栏、顶栏与全局浮层。不含任何业务逻辑。 */
export function AppShell() {
  const openOverlay = useShellStore((state) => state.openOverlay);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <NavLink to="/" className={styles.brand}>
          {t('app.name')}
        </NavLink>
        <nav className={styles.nav} aria-label={t('app.name')}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? styles.navActive : styles.navItem)}
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <span className={styles.localTag}>{t('app.localTag')}</span>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button type="button" className={styles.action} onClick={() => openOverlay('quick-add')}>
            {t('shell.quickAdd')}
          </button>
          <button type="button" className={styles.action} onClick={() => openOverlay('search')}>
            {t('shell.search')}
          </button>
          <button type="button" className={styles.action} onClick={() => openOverlay('onboarding')}>
            {t('shell.onboarding')}
          </button>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <OverlayHost />
    </div>
  );
}
