import React from 'react';

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
      <div className="min-h-screen bg-[#EDF7F3] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#D6F0E8] shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[#0D4035]">Something went wrong</h2>
          <p className="text-sm text-[#64748B]">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 rounded-xl border border-[#D6F0E8] text-sm font-medium text-[#0D4035] hover:bg-[#EDF7F3] transition-colors"
            >
              Go back
            </button>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-4 py-2 rounded-xl bg-[#1A6B5C] text-sm font-medium text-white hover:bg-[#145748] transition-colors"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
