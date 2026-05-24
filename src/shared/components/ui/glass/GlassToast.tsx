"use client";

import React, { useCallback, useEffect, useState } from "react";




export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface GlassToastProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function GlassToast({ toasts, onRemove }: GlassToastProps) {
  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none sm:top-4 sm:right-4 sm:left-auto sm:max-w-sm">
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  key?: React.Key;
}


function ToastItemComponent({ toast, onRemove }: ToastItemProps) {

  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const colors = {
    success: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    error: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-700 dark:text-red-400",
    warning: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
    info: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
  };

  return (
    <div
      className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-2xl
        bg-gradient-to-br ${colors[toast.type]}
        backdrop-blur-xl
        border shadow-lg
        transform transition-all duration-300 ease-out
        ${isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
        animate-slide-in-right
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors"
        aria-label="Close notification"
      >

        <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

    </div>
  );
}

// Hook for using toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg: string, duration?: number) => addToast(msg, "success", duration), [addToast]);
  const error = useCallback((msg: string, duration?: number) => addToast(msg, "error", duration), [addToast]);
  const warning = useCallback((msg: string, duration?: number) => addToast(msg, "warning", duration), [addToast]);
  const info = useCallback((msg: string, duration?: number) => addToast(msg, "info", duration), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}


// Standalone toast component for simple usage
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {children}
      <GlassToast toasts={toasts} onRemove={removeToast} />
    </>
  );
}
