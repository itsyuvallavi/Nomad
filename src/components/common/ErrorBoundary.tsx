'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorCount: number;
}

/**
 * Error Boundary component for graceful error handling in React components
 *
 * Features:
 * - Catches JavaScript errors in child components
 * - Displays user-friendly error messages
 * - Provides recovery mechanisms (reset, navigate home)
 * - Logs errors for debugging
 * - Supports different error levels (page, section, component)
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error tracking service (if configured)
    this.logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (
      hasError &&
      resetKeys &&
      this.previousResetKeys.length > 0 &&
      !this.arraysEqual(resetKeys, this.previousResetKeys)
    ) {
      this.resetErrorBoundary();
    }

    // Reset on any props change if resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }

    this.previousResetKeys = resetKeys || [];
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private arraysEqual(a: Array<string | number>, b: Array<string | number>): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In production, this would send to an error tracking service
    // For now, just log to console with structured format
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      level: this.props.level || 'component',
      errorCount: this.state.errorCount
    };

    console.log('Error Report:', JSON.stringify(errorReport, null, 2));
  }

  private resetErrorBoundary = () => {
    // Clear any pending reset timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    // Reset the error state
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCount: 0
    });
  };

  private handleReset = () => {
    // If error count is high, suggest page reload
    if (this.state.errorCount > 3) {
      if (window.confirm('Multiple errors detected. Would you like to reload the page?')) {
        window.location.reload();
      }
    } else {
      this.resetErrorBoundary();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorFallback() {
    const { error, errorInfo, errorCount } = this.state;
    const { level = 'component', fallback } = this.props;

    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Different error displays based on level
    if (level === 'page') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert className="border-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                We encountered an unexpected error. This has been logged and will be investigated.
              </AlertDescription>
            </Alert>

            <div className="bg-card rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {error?.message || 'An unexpected error occurred'}
              </p>

              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Technical Details
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words bg-muted p-2 rounded">
                    {error?.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="default" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>

            {errorCount > 2 && (
              <p className="text-xs text-center text-muted-foreground">
                Multiple errors detected. Consider refreshing the page.
              </p>
            )}
          </div>
        </div>
      );
    }

    if (level === 'section') {
      return (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">This section couldn't be loaded</p>
              <p className="text-sm text-muted-foreground">
                {error?.message || 'An error occurred while loading this content'}
              </p>
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Component level error (minimal UI)
    return (
      <div className="p-3 bg-muted/50 rounded border border-border">
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Component failed to load</span>
          <Button
            onClick={this.handleReset}
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Isolate the error to prevent cascading failures
      if (this.props.isolate) {
        return (
          <div className="contents">
            {this.renderErrorFallback()}
          </div>
        );
      }
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
};

/**
 * Export boundary specifically for export operations
 */
export const ExportErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="component"
    fallback={
      <div className="p-2 text-sm text-muted-foreground">
        Export feature temporarily unavailable
      </div>
    }
    onError={(error) => {
      console.error('Export operation failed:', error);
    }}
  >
    {children}
  </ErrorBoundary>
);