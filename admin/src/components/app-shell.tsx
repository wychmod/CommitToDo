import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '@/session/session-context';
import { copy } from '@/i18n';

export function AppShell() {
  const { email, signOut } = useSession();
  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <strong>{copy.app.title}</strong>
          <span>{copy.app.subtitle}</span>
        </div>
        <nav className="admin-shell__nav">
          <NavLink to="/" end>
            {copy.app.navOverview}
          </NavLink>
          <NavLink to="/tables">{copy.app.navTables}</NavLink>
          <NavLink to="/audit">{copy.app.navAudit}</NavLink>
        </nav>
        <div className="admin-shell__account">
          <span title={email}>{email}</span>
          <button type="button" className="admin-button admin-button--ghost" onClick={() => void signOut()}>
            {copy.app.signOut}
          </button>
        </div>
      </header>
      <main className="admin-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
