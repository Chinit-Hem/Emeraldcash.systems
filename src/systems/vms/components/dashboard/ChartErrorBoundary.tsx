"use client";

import React, { type ReactNode, useState } from 'react';

interface ChartErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  height?: number;
}

interface ChartErrorState {
  hasError: boolean;
  error?: string;
}

export default function ChartErrorBoundary({
  children,
  title = `Chart Error`,
  height = 320
}: ChartErrorBoundaryProps) {
  const [state, setState] = useState<ChartErrorState>({ hasError: false });

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`[ChartErrorBoundary] ${title}:`, error, errorInfo);
    
    // Try formDebugger integration
    if (typeof window !== 'undefined') {
      const formDebuggerObj = (window as unknown as Record<string, unknown>).formDebugger as { captureError?: (error: Error, info: Record<string, unknown>) => void } | undefined;
      if (formDebuggerObj?.captureError) {
        formDebuggerObj.captureError(error, { chart: title, componentStack: errorInfo.componentStack });
      }
    }
    
    setState({ hasError: true, error: error.message });
  };

  if (state.hasError) {
    return (
      <div 
        className={`w-full flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-red-50/80 to-orange-50/80 border-2 border-dashed border-red-200 p-8 text-center shadow-lg`}
        style={{ height: `${height}px` }}
      >
        <svg className={`w-12 h-12 text-red-500 mb-4 mx-auto`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <h3 className={`text-sm font-semibold text-red-800 mb-1`}>{title} unavailable</h3>
        <p className={`text-xs text-red-600 mb-4 max-w-[200px]`}>{state.error || 'Chart failed to load'}</p>
        <button
          onClick={() => window.location.reload()}
          className={`px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg shadow-md transition-all`}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ReactErrorBoundary 
      onError={handleError}
      fallbackRender={() => (
        <div 
          className={`w-full flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 p-8 text-center shadow-lg`}
          style={{ height: `${height}px` }}
        >
          <div className={`w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mb-3`}>
            <div className={`w-6 h-6 border-2 border-emerald-400 border-t-emerald-500 rounded-full animate-spin`} />
          </div>
          <p className={`text-sm font-medium text-slate-500`}>Loading ${title.toLowerCase()}...</p>
        </div>
      )}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Native class-based ErrorBoundary for charts
class ReactErrorBoundary extends React.Component<{
  children: ReactNode;
  onError: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallbackRender: () => ReactNode;
}, {
  hasError: boolean;
}> {
  constructor(props: {
    children: ReactNode;
    onError: (error: Error, errorInfo: React.ErrorInfo) => void;
    fallbackRender: () => ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallbackRender();
    }
    return this.props.children;
  }
}

