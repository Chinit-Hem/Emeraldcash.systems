"use client";

/**
 * Root Error Boundary
 * 
 * Catches errors in the root layout and all child components.
 * Provides user-friendly error display with recovery options.
 * 
 * @module app/error
 */

import { globalLogger } from "@/lib/logger";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const router = useRouter();
  useEffect(() => {
    // Log error to monitoring service
    globalLogger.error("Root error boundary caught error", error, {
      digest: error.digest,
      component: "RootErrorBoundary",
    });

    // Optional: Send to external error tracking service
    // Example: Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-red-950">
      <div className="w-full max-w-lg">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-red-100 dark:ring-red-900/30 p-8 text-center">
          {/* Error Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-red-600 dark:text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Something went wrong
          </h1>

          {/* User-friendly message */}
          <p className="text-gray-600 dark:text-gray-400 mb-2 text-base leading-relaxed">
            We apologize for the inconvenience. An unexpected error has occurred.
          </p>

          {/* Error ID for support */}
          {error.digest && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 font-mono bg-gray-100 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg inline-block">
              Error ID: {error.digest}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-target"
            >
              Try Again
            </button>
            
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-[0.98] touch-target"
            >
              Go Home
            </button>
          </div>

          {/* Support message */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
            If the problem persists, please contact support with the error ID above.
          </p>
        </div>
      </div>
    </div>
  );
}
