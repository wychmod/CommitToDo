import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '@/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** 顶层错误边界：渲染出错时给出可恢复的出口，不上报、不吞掉。 */
export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert">
        <h1>{t('error.title')}</h1>
        <button type="button" onClick={() => window.location.reload()}>
          {t('error.retry')}
        </button>
      </div>
    );
  }
}
