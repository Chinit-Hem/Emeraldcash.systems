"use client";

import React, { useEffect, useCallback } from "react";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
      if (e.key === "Enter" && !isLoading) {
        onConfirm();
      }
    },
    [onCancel, onConfirm, isLoading]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-red-500"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      ),
      confirmVariant: "danger" as const,
    },
    warning: {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-amber-500"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      ),
      confirmVariant: "primary" as const,
    },
    info: {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-blue-500"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      ),
      confirmVariant: "primary" as const,
    },
  };

  const { icon, confirmVariant } = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <GlassCard
          variant="elevated"
          className="w-full max-w-md animate-in fade-in zoom-in duration-200"
        >

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
              {icon}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <GlassButton
              variant={confirmVariant}
              fullWidth
              isLoading={isLoading}
              onClick={onConfirm}
              className="order-1 sm:order-2"
            >
              {confirmLabel}
            </GlassButton>
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={onCancel}
              disabled={isLoading}
              className="order-2 sm:order-1"
            >
              {cancelLabel}
            </GlassButton>
          </div>
        </div>
        </GlassCard>
      </div>
    </div>

  );
}
