import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import { AppErrorBoundary } from './ui/error-boundary';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
