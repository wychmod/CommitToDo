import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from '@/session/session-context';
import { AppShell } from '@/components/app-shell';
import { PublicHeader } from '@/components/public-header';
import { BootSkeleton } from '@/components/skeleton';
import { ErrorPanel } from '@/components/error-panel';
import { LoginPage } from '@/pages/login-page';
import { DeniedPage } from '@/pages/denied-page';
import { OverviewPage } from '@/pages/overview-page';
import { TablesPage } from '@/pages/tables-page';
import { TableDetailPage } from '@/pages/table-detail-page';
import { AuditPage } from '@/pages/audit-page';
import { copy } from '@/i18n';

function Gate() {
  const { state, error, requestId, retry } = useSession();

  if (state === 'loading') {
    return (
      <div className="admin-public">
        <PublicHeader />
        <BootSkeleton />
      </div>
    );
  }

  if (state === 'signed_out' || state === 'config_error') {
    return <LoginPage />;
  }

  if (state === 'forbidden' || state === 'unverified' || state === 'identity_error') {
    return <DeniedPage />;
  }

  if (state !== 'ready') {
    return (
      <div className="admin-public">
        <PublicHeader />
        <main className="admin-main admin-main--narrow">
          <ErrorPanel
            title={copy.common.errorTitle}
            message={error}
            requestId={requestId}
            onRetry={() => void retry()}
          />
        </main>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="tables/:collection" element={<TableDetailPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </BrowserRouter>
  );
}
