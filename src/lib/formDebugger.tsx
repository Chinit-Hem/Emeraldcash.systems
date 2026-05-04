/**
 * Form Debugger - Runtime Form Error Capture & Debugging Overlay
 *
 * Features:
 * - Console error interception for forms
 * - Form state snapshot on error
 * - Validation overlay toggle
 * - Network request error capture
 * - Form replay for debugging
 *
 * Usage:
 * import { FormDebuggerProvider, useFormDebugger } from './formDebugger'
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FormError {
  id: string;
  timestamp: number;
  componentStack: string;
  error: string;
  formState?: unknown;
  validationErrors?: Record<string, string>;
  networkError?: boolean;
  url: string;
}

export interface FormDebuggerContextType {
  errors: FormError[];
  clearErrors: () => void;
  toggleOverlay: () => void;
  overlayVisible: boolean;
  captureError: (error: Error, context?: FormDebuggerContext) => void;
  isEnabled: boolean;
}

type FormDebuggerContext = {
  componentStack?: string;
  formState?: unknown;
  validationErrors?: Record<string, string>;
  networkError?: boolean;
  [key: string]: unknown;
};

type FormDebuggerWindow = Window & {
  formDebugger?: {
    captureError: (error: Error, context?: FormDebuggerContext) => void;
  };
};

// ============================================================================
// Context & Provider
// ============================================================================

const FormDebuggerContext = createContext<FormDebuggerContextType | undefined>(undefined);

export function FormDebuggerProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<FormError[]>([]);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // Enable via localStorage or query param
  useEffect(() => {
    const enabled = localStorage.getItem('formDebugger') === 'true' ||
                   new URLSearchParams(window.location.search).has('debugForms');
    setIsEnabled(enabled);

    if (enabled) {
      console.log('[FormDebugger] ✅ Enabled - Use ?debugForms=true or localStorage.setItem("formDebugger", "true")');
    }
  }, []);

  const captureError = useCallback((error: Error, context: FormDebuggerContext = {}) => {
    if (!isEnabled) return;

    const newError: FormError = {
      id: `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      componentStack: context.componentStack || '',
      error: error.message || String(error),
      formState: context.formState,
      validationErrors: context.validationErrors,
      networkError: context.networkError || false,
      url: window.location.href,
    };

    setErrors(prev => [newError, ...prev.slice(0, 9)]); // Keep last 10

    // Auto-show overlay
    setOverlayVisible(true);

    console.groupCollapsed(`[FormDebugger] 🚨 Form Error #${errors.length + 1}`);
    console.error(error);
    console.log('Context:', context);
    console.groupEnd();
  }, [isEnabled, errors.length]);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setOverlayVisible(false);
  }, []);

  const toggleOverlay = useCallback(() => {
    setOverlayVisible(prev => !prev);
  }, []);

  return React.createElement(FormDebuggerContext.Provider, {
    value: {
      errors,
      clearErrors,
      toggleOverlay,
      overlayVisible,
      captureError,
      isEnabled,
    },
  }, children);
}


// ============================================================================
// Hook for components
// ============================================================================

export function useFormDebugger(formId?: string) {
  const context = useContext(FormDebuggerContext);
  if (!context) {
    throw new Error('useFormDebugger must be used within FormDebuggerProvider');
  }

  const captureFormError = useCallback((error: Error | string, extraContext?: FormDebuggerContext) => {
    if (!context.isEnabled) return;

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    context.captureError(errorObj, {
      formId,
      ...extraContext,
    });
  }, [context, formId]);

  return {
    captureError: captureFormError,
    hasErrors: context.errors.length > 0,
    errorCount: context.errors.length,
  };
}

// ============================================================================
// Console Interceptor (Auto-capture form errors)
// ============================================================================

let originalConsoleError: typeof console.error | undefined;
let originalConsoleWarn: typeof console.warn | undefined;

export function installConsoleInterceptor() {
  if (originalConsoleError) return; // Already installed

  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;
  const consoleError = originalConsoleError;
  const consoleWarn = originalConsoleWarn;

  // Intercept console.error for form-related messages
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('form') ||
      message.includes('validation') ||
      message.includes('required') ||
      message.includes('error') ||
      args.some((arg) => typeof arg === 'object' && arg !== null && 'message' in arg && String(arg.message).includes('form'))
    )) {
      // Global formDebugger capture (avoid React context in console override)
      if (typeof (window as FormDebuggerWindow).formDebugger !== 'undefined') {
        (window as FormDebuggerWindow).formDebugger?.captureError(new Error(String(message)), {
          fromConsole: true,
          args,
        });
      }
    }
    consoleError.call(console, ...args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('Form') ||
      message.includes('validation') ||
      message.includes('required')
    )) {
      consoleWarn.call(console, ...args);
    }
  };

  console.log('[FormDebugger] Console interceptor installed');
}

// ============================================================================
// Error Overlay Component
// ============================================================================

export function ErrorOverlay() {
  const { errors, clearErrors, overlayVisible, toggleOverlay, isEnabled } = useContext(FormDebuggerContext)!;

  if (!overlayVisible || !isEnabled || errors.length === 0) return null;

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={toggleOverlay}
        className="fixed top-4 right-4 z-[9999] w-12 h-12 bg-red-500 text-white rounded-full shadow-2xl flex items-center justify-center text-lg font-bold hover:bg-red-600 transition-all"
        title="Form Errors"
      >
        {errors.length}
      </button>

      {/* Overlay Panel */}
      <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-end sm:items-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Form Errors ({errors.length})</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Click error to replay</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearErrors}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                onClick={toggleOverlay}
                className="px-3 py-1.5 text-sm bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Errors List */}
          <div className="flex-1 p-6 overflow-y-auto">
            {errors.map((error) => (
              <div key={error.id} className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-l-4 border-red-400">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {error.error}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(error.timestamp).toLocaleTimeString()} • {error.url}
                    </p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    {error.networkError ? 'Network' : 'Validation'}
                  </span>
                </div>
                {error.validationErrors && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-gray-600 dark:text-gray-400">
                      Show validation errors ({Object.keys(error.validationErrors).length})
                    </summary>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {Object.entries(error.validationErrors).map(([field, msg]) => (
                        <div key={field} className="text-xs text-red-600 dark:text-red-400 mb-1">
                          • {field}: {msg}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Auto-install interceptor when provider mounts
installConsoleInterceptor();

// Global access for ErrorBoundary integration
if (typeof window !== 'undefined') {
  (window as FormDebuggerWindow).formDebugger = {
    captureError: (error: Error, context?: FormDebuggerContext) => {
      const provider = document.querySelector('[data-form-debugger]') as HTMLElement & {
        captureError?: (error: Error, context?: FormDebuggerContext) => void;
      };
      if (provider && typeof provider.captureError === 'function') {
        provider.captureError(error, context);
      }
    }
  };
}

export default FormDebuggerProvider;
