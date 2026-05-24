"use client";

import React, { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

export default class LmsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[LMS ErrorBoundary] Caught error:", error);
    console.error("[LMS ErrorBoundary] Component stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      // Build detailed error message for debugging on iPhone
      const errorDetails = {
        message: error?.message || "Unknown error",
        name: error?.name || "Error",
        stack: error?.stack || "No stack trace",
        componentStack: errorInfo?.componentStack || "No component stack",
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      };

      const errorJson = JSON.stringify(errorDetails, null, 2);

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-200 dark:border-red-800 overflow-hidden">
              {/* Header */}
              <div className="bg-red-500 p-4">
                <h1 className="text-white font-bold text-lg flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  LMS Dashboard Error
                </h1>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  The training portal encountered an error. Please try again or contact support.
                </p>

                {/* Error Message Box */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-700 dark:text-red-400 font-mono text-xs break-all">
                    {error?.message || "Unknown error"}
                  </p>
                </div>

                {/* Debug Info (Collapsible) */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 dark:text-gray-400 font-medium py-2">
                    Tap to view technical details
                  </summary>
                  <div className="mt-2">
                    <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                      {errorJson}
                    </pre>
                    <button
                      onClick={() => {
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(errorJson);
                          alert("Error details copied! Paste in message to developer.");
                        }
                      }}
                      className="mt-2 w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                    >
                      Copy Error Details
                    </button>
                  </div>
                </details>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={this.handleRetry}
                    className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg font-semibold text-sm"
                  >
                    Reload Page
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              Error ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
