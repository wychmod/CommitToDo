import { Link, useLocation, Outlet } from 'react-router-dom';
import { useIsDesktop } from '../../../core/hooks/use-is-desktop';
import { AppIcon, AppIconName } from '../../icons/app-icons';
import { SafeArea } from './safe-area';

interface NavItem {
  to: string;
  icon: AppIconName;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: AppIconName.repository, label: '仓库' },
  { to: '/search', icon: AppIconName.search, label: '搜索' },
  { to: '/heatmap', icon: AppIconName.heatmap, label: '热力图' },
  { to: '/graph', icon: AppIconName.graph, label: '图形' },
  { to: '/settings', icon: AppIconName.settings, label: '设置' },
];

function SideNav(): JSX.Element {
  const { pathname } = useLocation();
  return (
    <nav className="fixed left-0 top-0 z-40 flex h-screen w-[200px] flex-col border-r border-hairline bg-canvas">
      <div className="flex h-14 items-center gap-xs px-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary-gradient-from to-primary-gradient-to">
          <AppIcon
            name={AppIconName.gitBranch}
            className="h-5 w-5 text-white"
          />
        </div>
        <span className="text-headline font-semibold text-ink">Commit</span>
      </div>
      <div className="flex flex-1 flex-col gap-xs px-sm py-sm">
        {navItems.map((item) => {
          const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex items-center gap-xs rounded-md px-sm py-xs text-body transition-colors ${
                isActive
                  ? 'bg-surface-1 text-ink'
                  : 'text-ink-muted hover:bg-surface-1 hover:text-ink'
              }`}
            >
              {isActive ? (
                <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              ) : null}
              <AppIcon name={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function BottomNav(): JSX.Element {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 z-40 h-12 w-full border-t border-hairline bg-canvas pb-[var(--safe-area-bottom)]">
      <div className="flex h-full items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex h-12 w-full flex-col items-center justify-center gap-micro ${
                isActive ? 'text-primary' : 'text-ink-subtle'
              }`}
            >
              <AppIcon name={item.icon} className="h-5 w-5" />
              <span className="text-mono-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppLayout(): JSX.Element {
  const isDesktop = useIsDesktop();

  return (
    <SafeArea>
      <div className="flex h-screen w-full bg-canvas">
        {isDesktop ? (
          <>
            <SideNav />
            <main className="ml-[200px] flex flex-1 flex-col overflow-auto">
              <div className="mx-auto w-full max-w-[1280px] p-md">
                <Outlet />
              </div>
            </main>
          </>
        ) : (
          <div className="flex h-full w-full flex-col">
            <main className="flex-1 overflow-auto pb-12">
              <div className="p-sm">
                <Outlet />
              </div>
            </main>
            <BottomNav />
          </div>
        )}
      </div>
    </SafeArea>
  );
}
