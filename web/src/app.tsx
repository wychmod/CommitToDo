import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { HomePage } from '@/pages/home-page';
import { LoadingShell } from '@/ui/loading-shell';

/**
 * 路由表（docs/UI-PAGES.md）：
 * P00–P08 在应用外壳内，P09–P11 为独立认证页。
 * 全局层（快速添加、待办详情、提交详情、搜索、确认框、首次引导）由 OverlayHost 承载。
 *
 * 首页（P00）静态导入：首屏必须立刻可用，不为其它页面承担体积。
 * 其余页面按路由懒加载，把主包拆成「外壳 + 各页」；
 * 认证、法务、设置这类低频页不会进首屏。
 */

const AllTodosPage = lazy(() =>
  import('@/pages/all-todos-page').then((module) => ({ default: module.AllTodosPage })),
);
const BadgeWallPage = lazy(() =>
  import('@/pages/badge-wall-page').then((module) => ({ default: module.BadgeWallPage })),
);
const BranchDetailPage = lazy(() =>
  import('@/pages/branch-detail-page').then((module) => ({ default: module.BranchDetailPage })),
);
const BranchesPage = lazy(() =>
  import('@/pages/branches-page').then((module) => ({ default: module.BranchesPage })),
);
const DataPage = lazy(() =>
  import('@/pages/data-page').then((module) => ({ default: module.DataPage })),
);
const HelpPage = lazy(() =>
  import('@/pages/help-page').then((module) => ({ default: module.HelpPage })),
);
const HistoryPage = lazy(() =>
  import('@/pages/history-page').then((module) => ({ default: module.HistoryPage })),
);
const LoginPage = lazy(() =>
  import('@/pages/login-page').then((module) => ({ default: module.LoginPage })),
);
const MePage = lazy(() => import('@/pages/me-page').then((module) => ({ default: module.MePage })));
const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((module) => ({ default: module.NotFoundPage })),
);
const PrivacyPage = lazy(() =>
  import('@/pages/privacy-page').then((module) => ({ default: module.PrivacyPage })),
);
const RecoverPage = lazy(() =>
  import('@/pages/recover-page').then((module) => ({ default: module.RecoverPage })),
);
const SamplePage = lazy(() =>
  import('@/pages/sample-page').then((module) => ({ default: module.SamplePage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings-page').then((module) => ({ default: module.SettingsPage })),
);
const SignupPage = lazy(() =>
  import('@/pages/signup-page').then((module) => ({ default: module.SignupPage })),
);
const SyncConflictsPage = lazy(() =>
  import('@/pages/sync-conflicts-page').then((module) => ({
    default: module.SyncConflictsPage,
  })),
);
const SyncDevicesPage = lazy(() =>
  import('@/pages/sync-devices-page').then((module) => ({ default: module.SyncDevicesPage })),
);
const TemplatesPage = lazy(() =>
  import('@/pages/templates-page').then((module) => ({ default: module.TemplatesPage })),
);
const TermsPage = lazy(() =>
  import('@/pages/terms-page').then((module) => ({ default: module.TermsPage })),
);
const TodayPage = lazy(() =>
  import('@/pages/today-page').then((module) => ({ default: module.TodayPage })),
);
const YearPage = lazy(() =>
  import('@/pages/year-page').then((module) => ({ default: module.YearPage })),
);

/** 懒加载页的统一兜底：外壳保留，主区显示加载态。 */
function lazyPage(node: ReactNode) {
  return <Suspense fallback={<LoadingShell />}>{node}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route element={<AppShell />}>
          <Route path="today" element={lazyPage(<TodayPage />)} />
          <Route path="today/all" element={lazyPage(<AllTodosPage />)} />
          <Route path="sample" element={lazyPage(<SamplePage />)} />
          <Route path="branches" element={lazyPage(<BranchesPage />)} />
          <Route path="branches/templates" element={lazyPage(<TemplatesPage />)} />
          <Route path="branches/:branchId" element={lazyPage(<BranchDetailPage />)} />
          <Route path="history" element={lazyPage(<HistoryPage />)} />
          <Route path="history/:year" element={lazyPage(<YearPage />)} />
          <Route path="me" element={lazyPage(<MePage />)} />
          <Route path="me/badges" element={lazyPage(<BadgeWallPage />)} />
          <Route path="me/help" element={lazyPage(<HelpPage />)} />
          <Route path="settings" element={lazyPage(<SettingsPage />)} />
          <Route path="settings/sync/devices" element={lazyPage(<SyncDevicesPage />)} />
          <Route path="settings/sync/conflicts" element={lazyPage(<SyncConflictsPage />)} />
          <Route path="data" element={lazyPage(<DataPage />)} />
          <Route path="*" element={lazyPage(<NotFoundPage />)} />
        </Route>

        <Route path="auth/login" element={lazyPage(<LoginPage />)} />
        <Route path="auth/signup" element={lazyPage(<SignupPage />)} />
        <Route path="auth/recover" element={lazyPage(<RecoverPage />)} />
        <Route path="terms" element={lazyPage(<TermsPage />)} />
        <Route path="privacy" element={lazyPage(<PrivacyPage />)} />
      </Routes>
    </BrowserRouter>
  );
}
