import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './core/theme/theme-provider';
import { AppLayout } from './presentation/components/layout/app-layout';
import { ToastProvider } from './presentation/components/common/toast-provider';
import { NotificationScheduler } from './presentation/components/common/notification-scheduler';
import { HomeScreen } from './presentation/screens/home-screen';
import { RepositoryScreen } from './presentation/screens/repository-screen';
import { TaskDetailScreen } from './presentation/screens/task-detail-screen';
import { TaskFormScreen } from './presentation/screens/task-form-screen';
import { SearchScreen } from './presentation/screens/search-screen';
import { HeatmapScreen } from './presentation/screens/heatmap-screen';
import { GitGraphScreen } from './presentation/screens/git-graph-screen';
import { SettingsScreen } from './presentation/screens/settings-screen';

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NotificationScheduler />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomeScreen />} />
              <Route path="search" element={<SearchScreen />} />
              <Route path="heatmap" element={<HeatmapScreen />} />
              <Route path="graph" element={<GitGraphScreen />} />
              <Route path="settings" element={<SettingsScreen />} />
              <Route path="repository/:id" element={<RepositoryScreen />} />
              <Route path="repository/:id/task/new" element={<TaskFormScreen />} />
              <Route path="task/:id" element={<TaskDetailScreen />} />
              <Route path="task/:id/edit" element={<TaskFormScreen />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
