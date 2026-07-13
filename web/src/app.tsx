import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';

const routerBasename = import.meta.env.VITE_APP_BASENAME || '/';
import { ThemeProvider } from './core/theme/theme-provider';
import { ToastProvider } from './presentation/components/common/toast-provider';
import { LandingAuthLayout } from './presentation/screens/auth/landing-auth-layout';
import { TodayWorkspaceScreen } from './presentation/screens/workspace/today-workspace-screen';
import { RepositoryOverviewScreen } from './presentation/screens/repository/repository-overview-screen';
import { RepositoryTasksScreen } from './presentation/screens/repository/repository-tasks-screen';
import { InsightsScreen } from './presentation/screens/insights/insights-screen';
import { SettingsScreen } from './presentation/screens/settings/settings-screen';

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
              <Route path="login" element={null} />
              <Route path="signup" element={null} />
            </Route>

            {/* V3 app screens (each provides its own shell) */}
            <Route path="workspace" element={<TodayWorkspaceScreen />} />
            <Route path="repository/:id" element={<RepositoryOverviewScreen />} />
            <Route path="repository/:id/tasks" element={<RepositoryTasksScreen />} />
            <Route path="insights" element={<InsightsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />

            {/* Compatibility redirects from old app-shell routes */}
            <Route path="search" element={<Navigate to="/workspace" replace />} />
            <Route path="heatmap" element={<Navigate to="/insights?tab=heatmap" replace />} />
            <Route path="graph" element={<Navigate to="/insights?tab=graph" replace />} />
            <Route path="repository/:id/commits" element={<Navigate to="/insights?tab=activity" replace />} />
            <Route path="repository/:id/graph" element={<Navigate to="/insights?tab=graph" replace />} />
            <Route path="repository/:id/heatmap" element={<Navigate to="/insights?tab=heatmap" replace />} />
            <Route path="repository/:id/search" element={<Navigate to="/workspace" replace />} />
            <Route path="repository/:id/settings" element={<Navigate to="/settings?scope=repository" replace />} />
            <Route path="repository/:id/task/new" element={<RedirectToRepositoryTasks />} />
            <Route path="repository/:id/task/:taskId/edit" element={<RedirectToRepositoryTasks />} />
            <Route path="task/:id" element={<Navigate to="/workspace" replace />} />
            <Route path="task/:id/edit" element={<Navigate to="/workspace" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
