import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
  }

  handleRetry = () => {
    // Clear any cached state and reload
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isModuleError = this.state.error?.message?.includes('dynamically imported module');

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {isModuleError ? 'Loading Error' : 'Something went wrong'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isModuleError
                ? 'The page failed to load. This is usually a temporary caching issue.'
                : 'An unexpected error occurred. Please try again.'}
            </p>
            <Button onClick={this.handleRetry} size="lg">
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
