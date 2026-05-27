import React from 'react';
import { SystemStatusWindow } from '@/components/SystemStatusWindow';

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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SystemStatusWindow
        type="error"
        title="Something went wrong"
        message={this.state.error?.message || 'An unexpected error occurred.'}
        actionLabel="Reload app"
        onAction={() => {
          this.setState({ hasError: false, error: null });
          window.location.reload();
        }}
      />
    );
  }
}

/**
 * Per-route error boundary that wraps individual page Suspense blocks.
 *
 * Catches chunk-load failures (dynamic import rejected when the SW has no cache
 * for a chunk) and distinguishes between:
 *   - Offline + chunk error → "Page not available offline" (user can retry once online)
 *   - Any other error → "This page couldn't load" with a try-again button that
 *     resets the boundary without a full app reload.
 *
 * Place this AROUND <Suspense>, not inside it, so the error from a rejected
 * dynamic import propagates up to the boundary rather than being swallowed.
 */
export class PageErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack);
  }

  private isChunkError(): boolean {
    const msg = this.state.error?.message ?? '';
    const name = this.state.error?.name ?? '';
    return (
      name === 'ChunkLoadError' ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed')
    );
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isOffline = !navigator.onLine;

    if (this.isChunkError() && isOffline) {
      return (
        <SystemStatusWindow
          type="error"
          title="Page not available offline"
          message="This page hasn't been cached yet. Reconnect to the internet and reload to access it."
          actionLabel="Reload when online"
          onAction={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }

    return (
      <SystemStatusWindow
        type="error"
        title="This page couldn't load"
        message={this.state.error?.message || 'An unexpected error occurred on this page.'}
        actionLabel="Try again"
        onAction={() => this.setState({ hasError: false, error: null })}
      />
    );
  }
}
