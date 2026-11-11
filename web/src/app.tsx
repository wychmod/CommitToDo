import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';

const routerBasename = import.meta.env.VITE_APP_BASENAME || '/';
import { ThemeProvider } from './core/theme/theme-provider';
import { ToastProvider } from './presentation/components/common/toast-provider';
import { AuthenticatedRoute } from './presentation/routes/authenticated-route';
import { PublicOnlyRoute } from './presentation/routes/public-only-route';
import { WorkspaceOwnershipGuard } from './presentation/routes/workspace-ownership-guard';
import { LandingAuthLayout } from './presentation/screens/auth/landing-auth-layout';
import { OAuthCallbackScreen } from './presentation/screens/auth/oauth-callback-screen';
import { LocalDataOwnershipScreen } from './presentation/screens/auth/local-data-ownership-screen';
import { TodayWorkspaceScreen } from './presentation/screens/workspace/today-workspace-screen';
import { RepositoryOverviewScreen } from './presentation/screens/repository/repository-overview-screen';
import { RepositoryTasksScreen } from './presentation/screens/repository/repository-tasks-screen';
import { InsightsScreen } from './presentation/screens/insights/insights-screen';
import { SettingsScreen } from './presentation/screens/settings/settings-screen';
import { AccountSecurityScreen } from './presentation/screens/settings/account-security-screen';

function RedirectToRepositoryTasks(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/repository/${id}/tasks`} replace />;
}

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            {/* Landing / brand stage - shared with /login and /signup so the
                Hero canvas and scroll stay mounted across auth routes. */}
            <Route path="/" element={<LandingAuthLayout />}>
              <Route index element={null} />
              <Route path="login" element={<PublicOnlyRoute><AuthRouteSlot /></PublicOnlyRoute>} />
              <Route path="signup" element={<PublicOnlyRoute><AuthRouteSlot /></PublicOnlyRoute>} />
            </Route>

            {/* OAuth callback and local-data ownership are public but
                state-dependent screens. */}
            <Route path="/auth/callback" element={<OAuthCallbackScreen />} />
            <Route path="/auth/local-data" element={<LocalDataOwnershipScreen />} />

            {/* V3 app screens (each provides its own shell) */}
            <Route
              path="workspace"
              element={
                <AuthenticatedRoute>
                  <WorkspaceOwnershipGuard>
                    <TodayWorkspaceScreen />
                  </WorkspaceOwnershipGuard>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="repository/:id"
              element={
                <AuthenticatedRoute>
                  <WorkspaceOwnershipGuard>
                    <RepositoryOverviewScreen />
                  </WorkspaceOwnershipGuard>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="repository/:id/tasks"
              element={
                <AuthenticatedRoute>
                  <WorkspaceOwnershipGuard>
                    <RepositoryTasksScreen />
                  </WorkspaceOwnershipGuard>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="insights"
              element={
                <AuthenticatedRoute>
                  <WorkspaceOwnershipGuard>
                    <InsightsScreen />
                  </WorkspaceOwnershipGuard>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <AuthenticatedRoute>
                  <WorkspaceOwnershipGuard>
                    <SettingsScreen />
                  </WorkspaceOwnershipGuard>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="settings/security"
              element={
                <AuthenticatedRoute>
                  <WorkspaceOwnershipGuard>
                    <AccountSecurityScreen />
                  </WorkspaceOwnershipGuard>
                </AuthenticatedRoute>
              }
            />

            {/* Compatibility redirects from old app-shell routes (auth-guarded) */}
            <Route path="search" element={<AuthenticatedRoute><Navigate to="/workspace" replace /></AuthenticatedRoute>} />
            <Route path="heatmap" element={<AuthenticatedRoute><Navigate to="/insights?tab=heatmap" replace /></AuthenticatedRoute>} />
            <Route path="graph" element={<AuthenticatedRoute><Navigate to="/insights?tab=graph" replace /></AuthenticatedRoute>} />
            <Route path="repository/:id/commits" element={<AuthenticatedRoute><Navigate to="/insights?tab=activity" replace /></AuthenticatedRoute>} />
            <Route path="repository/:id/graph" element={<AuthenticatedRoute><Navigate to="/insights?tab=graph" replace /></AuthenticatedRoute>} />
            <Route path="repository/:id/heatmap" element={<AuthenticatedRoute><Navigate to="/insights?tab=heatmap" replace /></AuthenticatedRoute>} />
            <Route path="repository/:id/search" element={<AuthenticatedRoute><Navigate to="/workspace" replace /></AuthenticatedRoute>} />
            <Route path="repository/:id/settings" element={<AuthenticatedRoute><Navigate to="/settings?scope=repository" replace /></AuthenticatedRoute>} />
            <Route path="repository/:id/task/new" element={<AuthenticatedRoute><RedirectToRepositoryTasks /></AuthenticatedRoute>} />
            <Route path="repository/:id/task/:taskId/edit" element={<AuthenticatedRoute><RedirectToRepositoryTasks /></AuthenticatedRoute>} />
            <Route path="task/:id" element={<AuthenticatedRoute><Navigate to="/workspace" replace /></AuthenticatedRoute>} />
            <Route path="task/:id/edit" element={<AuthenticatedRoute><Navigate to="/workspace" replace /></AuthenticatedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

function AuthRouteSlot(): JSX.Element {
  return <></>;
}

export default App;
