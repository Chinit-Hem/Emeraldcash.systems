"use client";

/**
 * App Section Error Boundary
 * 
 * Catches errors within the (app) route group.
 * Provides app-specific error handling with navigation options.
 * 
 * @module app/(app)/error
 */

import { useEffect } from "react";
import { globalLogger } from "@/lib/logger";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    // Log error
    globalLogger.error("App section error boundary caught error", error, {
      digest: error.digest,
      component: "AppErrorBoundary",
      section: "(app)",
    });
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 p-6 text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-amber-600 dark:text-amber-400"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          {/* Error Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Application Error
          </h2>

          {/* User-friendly message */}
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Something went wrong in this section. You can try again or navigate elsewhere.
          </p>

          {/* Error ID */}
          {error.digest && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded">
              ID: {error.digest}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={reset}
              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Dashboard
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
