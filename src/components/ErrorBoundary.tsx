'use client';

import React from 'react';

// ============================================================================
// Fire-and-forget error reporting — never throws, never blocks rendering
// ============================================================================

function reportError(error: Error, componentStack: string) {
  console.error('[ErrorBoundary]', error, componentStack);

  try {
    fetch('/api/log/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        componentStack: componentStack.slice(0, 2000),
        url: location.href,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {}); // Silently ignore if endpoint doesn't exist
  } catch {}
}

// ============================================================================
// ErrorBoundary
// ============================================================================

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportError(error, errorInfo.componentStack || '');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-start justify-center pt-12">
          <div className="text-center max-w-sm">
            <div className="w-10 h-10 rounded-full bg-red-bg flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-red-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">渲染出错了</p>
            <p className="text-[11px] text-text-muted mb-4 leading-relaxed break-all">
              {this.state.error?.message || '未知错误'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={this.handleReset}
                className="text-[12px] text-accent-primary hover:text-accent-hover font-medium px-3 py-1.5 rounded border border-accent-primary/20 hover:bg-accent-lighter transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-[12px] text-text-muted hover:text-text-secondary font-medium px-3 py-1.5 rounded border border-border-light hover:bg-bg-secondary transition-colors"
              >
                刷新页面
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-4">
              切换至其他日期或报告可自动恢复
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
