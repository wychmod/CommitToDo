import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const routerBasename = import.meta.env.VITE_APP_BASENAME || '/';
import { ThemeProvider } from './core/theme/theme-provider';
import { AppLayout } from './presentation/components/layout/app-layout';
import { ToastProvider } from './presentation/components/common/toast-provider';
import { LandingPage } from './presentation/screens/landing/landing-page';
import { HomeScreen } from './presentation/screens/home-screen';
import { RepositoryScreen } from './presentation/screens/repository-screen';
import { TaskDetailScreen } from './presentation/screens/task-detail-screen';
import { TaskFormScreen } from './presentation/screens/task-form-screen';
import { SearchScreen } from './presentation/screens/search-screen';
import { HeatmapScreen } from './presentation/screens/heatmap-screen';
import { GitGraphScreen } from './presentation/screens/git-graph-screen';
import { SettingsScreen } from './presentation/screens/settings-screen';
import { CommitsScreen } from './presentation/screens/commits-screen';
import { RepoGraphScreen } from './presentation/screens/repo-graph-screen';
import { RepoHeatmapScreen } from './presentation/screens/repo-heatmap-screen';
import { RepoSearchScreen } from './presentation/screens/repo-search-screen';
import { RepoSettingsScreen } from './presentation/screens/repo-settings-screen';

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            {/* Landing / brand stage */}
            <Route path="/" element={<LandingPage />} />

            {/* Application shell */}
            <Route element={<AppLayout />}>
              {/* Workspace overview */}
              <Route path="workspace" element={<HomeScreen />} />

              {/* Global tools */}
              <Route path="search" element={<SearchScreen />} />
              <Route path="heatmap" element={<HeatmapScreen />} />
              <Route path="graph" element={<GitGraphScreen />} />
              <Route path="settings" element={<SettingsScreen />} />

              {/* Repository-scoped routes */}
              <Route path="repository/:id" element={<RepositoryScreen />} />
              <Route
                path="repository/:id/commits"
                element={<CommitsScreen />}
              />
              <Route
                path="repository/:id/graph"
                element={<RepoGraphScreen />}
              />
              <Route
                path="repository/:id/heatmap"
                element={<RepoHeatmapScreen />}
              />
              <Route
                path="repository/:id/search"
                element={<RepoSearchScreen />}
              />
              <Route
                path="repository/:id/settings"
                element={<RepoSettingsScreen />}
              />
              <Route
                path="repository/:id/task/new"
                element={<TaskFormScreen />}
              />
              <Route
                path="repository/:id/task/:taskId/edit"
                element={<TaskFormScreen />}
              />

              {/* Legacy / direct links — these redirect into the right shell. */}
              <Route path="task/:id" element={<TaskDetailScreen />} />
              <Route
                path="task/:id/edit"
                element={<Navigate to="/workspace" replace />}
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
