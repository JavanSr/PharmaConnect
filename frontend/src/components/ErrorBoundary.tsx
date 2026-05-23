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
