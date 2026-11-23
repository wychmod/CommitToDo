import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { AllTodosPage } from '@/pages/all-todos-page';
import { BadgeWallPage } from '@/pages/badge-wall-page';
import { BranchDetailPage } from '@/pages/branch-detail-page';
import { BranchesPage } from '@/pages/branches-page';
import { DataPage } from '@/pages/data-page';
import { HelpPage } from '@/pages/help-page';
import { HistoryPage } from '@/pages/history-page';
import { HomePage } from '@/pages/home-page';
import { LoginPage } from '@/pages/login-page';
import { MePage } from '@/pages/me-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { PrivacyPage } from '@/pages/privacy-page';
import { RecoverPage } from '@/pages/recover-page';
import { SamplePage } from '@/pages/sample-page';
import { SettingsPage } from '@/pages/settings-page';
import { SignupPage } from '@/pages/signup-page';
import { SyncConflictsPage } from '@/pages/sync-conflicts-page';
import { SyncDevicesPage } from '@/pages/sync-devices-page';
import { TemplatesPage } from '@/pages/templates-page';
import { TermsPage } from '@/pages/terms-page';
import { TodayPage } from '@/pages/today-page';
import { YearPage } from '@/pages/year-page';

/**
 * 路由表（docs/UI-PAGES.md）：
 * P00–P08 在应用外壳内，P09–P11 为独立认证页。
 * 全局层（快速添加、待办详情、提交详情、搜索、确认框、首次引导）由 OverlayHost 承载。
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route element={<AppShell />}>
          <Route path="today" element={<TodayPage />} />
          <Route path="today/all" element={<AllTodosPage />} />
          <Route path="sample" element={<SamplePage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="branches/templates" element={<TemplatesPage />} />
          <Route path="branches/:branchId" element={<BranchDetailPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:year" element={<YearPage />} />
          <Route path="me" element={<MePage />} />
          <Route path="me/badges" element={<BadgeWallPage />} />
          <Route path="me/help" element={<HelpPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/sync/devices" element={<SyncDevicesPage />} />
          <Route path="settings/sync/conflicts" element={<SyncConflictsPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="auth/login" element={<LoginPage />} />
        <Route path="auth/signup" element={<SignupPage />} />
        <Route path="auth/recover" element={<RecoverPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
      </Routes>
    </BrowserRouter>
  );
}
