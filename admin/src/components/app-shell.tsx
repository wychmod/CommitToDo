import { NavLink, Outlet } from 'react-router-dom';
import { BrandLockup } from '@/components/brand';
import { useSession } from '@/session/session-context';
import { copy } from '@/i18n';

const TABS = [
  { to: '/', label: copy.app.navOverview, end: true },
  { to: '/tables', label: copy.app.navTables, end: false },
  { to: '/audit', label: copy.app.navAudit, end: false },
];

export function AppShell() {
  const { email, signOut } = useSession();

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__bar">
          <BrandLockup />
          <nav className="admin-shell__nav" aria-label={copy.app.navLabel}>
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => (isActive ? 'admin-tab admin-tab--active' : 'admin-tab')}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="admin-shell__account">
            <span className="admin-shell__email" title={email}>
              {email}
            </span>
            <button type="button" className="admin-btn admin-btn--quiet" onClick={() => void signOut()}>
              {copy.app.signOut}
            </button>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
