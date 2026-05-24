/**
 * Alert Component - Feedback System
 * 
 * Reusable alert components for error, success, warning, and info messages.
 * Eliminates duplication of alert styling across the application.
 * 
 * @module ui/feedback/Alert
 */

"use client";

import { ColorPalette, type ColorName } from "@/shared/utils/design-system/colors";
import { cn } from "@/shared/utils/ui";
import React from "react";

interface AlertProps {
  children?: React.ReactNode;
  variant?: ColorName | "success" | "error" | "warning" | "info";
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

/**
 * Alert - Unified feedback component
 * 
 * Usage:
 *   <Alert variant="error" title="Error">Message</Alert>
 *   <Alert variant="success">Success message</Alert>
 */
export function Alert({
  children,
  variant = "info",
  title,
  icon,
  className,
  onClose,
}: AlertProps) {
  // Map semantic variants to color names
  const colorMap: Record<string, ColorName> = {
    success: "emerald",
    error: "red",
    warning: "orange",
    info: "blue",
  };

  const colorName = colorMap[variant] || (variant as ColorName);
  const colors = ColorPalette.get(colorName);

  return (
    <div
      className={cn(
        "rounded-xl p-4 border",
        colors.bg,
        colors.border,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className={cn("flex-shrink-0 mt-0.5", colors.icon)}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={cn("font-semibold mb-1", colors.text)}>
              {title}
            </h3>
          )}
          <div className={cn("text-sm", colors.textSoft)}>{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              "flex-shrink-0 -mr-1 -mt-1 p-1 rounded-lg transition-colors",
              "hover:bg-black/5 dark:hover:bg-white/10",
              colors.text
            )}
            aria-label="Close alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ErrorAlert - Pre-configured error message
 */
export function ErrorAlert({
  children,
  title = "Error",
  className,
}: Omit<AlertProps, "variant">) {
  return (
    <Alert
      variant="error"
      title={title}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      className={className}
    >
      {children}
    </Alert>
  );
}

/**
 * SuccessAlert - Pre-configured success message
 */
export function SuccessAlert({
  children,
  title,
  className,
}: Omit<AlertProps, "variant">) {
  return (
    <Alert
      variant="success"
      title={title}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      }
      className={className}
    >
      {children}
    </Alert>
  );
}

/**
 * WarningAlert - Pre-configured warning message
 */
export function WarningAlert({
  children,
  title,
  className,
}: Omit<AlertProps, "variant">) {
  return (
    <Alert
      variant="warning"
      title={title}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      }
      className={className}
    >
      {children}
    </Alert>
  );
}

/**
 * InfoAlert - Pre-configured info message
 */
export function InfoAlert({
  children,
  title,
  className,
}: Omit<AlertProps, "variant">) {
  return (
    <Alert
      variant="info"
      title={title}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      className={className}
    >
      {children}
    </Alert>
  );
}

/**
 * InlineAlert - Compact alert for inline use
 */
export function InlineAlert({
  children,
  variant = "error",
  className,
}: AlertProps) {
  const colors = ColorPalette.get(variant as ColorName);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
        colors.bg,
        colors.text,
        className
      )}
    >
      {children}
    </span>
  );
}
