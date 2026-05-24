/**
 * Neumorphism Button Component
 * 
 * Button component following Neumorphism (Soft UI) design principles:
 * - Soft convex shadows for default state
 * - Inset shadows for pressed/hover state
 * - Consistent color schemes
 * 
 * @module ui/NeuButton
 */

"use client";

import React from "react";
import { cn } from "@/shared/utils/ui";

// ============================================================================
// Types & Interfaces (OOAD: Abstraction)
// ============================================================================

interface NeuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// ============================================================================
// Base Button Component (OOAD: Encapsulation)
// ============================================================================

export function NeuButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}: NeuButtonProps) {
  // Size definitions
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-sm",
    lg: "h-12 px-8 text-base",
  };

  // Neumorphism shadow styles for each variant
  const variants = {
    primary: cn(
      "bg-emerald-500 text-white border border-emerald-500 shadow-sm",
      "hover:bg-emerald-600 hover:border-emerald-600",
      "active:bg-emerald-700 active:border-emerald-700"
    ),
    secondary: cn(
      "bg-white text-slate-700 border border-slate-200 shadow-sm",
      "hover:bg-slate-50",
      "active:bg-slate-100",
      "dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:active:bg-slate-700"
    ),
    danger: cn(
      "bg-red-500 text-white border border-red-500 shadow-sm",
      "hover:bg-red-600 hover:border-red-600",
      "active:bg-red-700 active:border-red-700"
    ),
    ghost: cn(
      "bg-white text-slate-600 border border-slate-200 shadow-sm",
      "hover:bg-slate-50 hover:text-slate-700",
      "active:bg-slate-100",
      "dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:active:bg-slate-700",
      "w-11 h-11 p-0 rounded-full"
    ),
    outline: cn(
      "bg-white text-slate-700 border border-slate-300 shadow-sm",
      "hover:bg-slate-50",
      "active:bg-slate-100",
      "dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-800 dark:active:bg-slate-700"
    ),
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none",
        sizes[size],
        variants[variant],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ============================================================================
// Icon Button Variant (OOAD: Polymorphism)
// ============================================================================

export function NeuIconButton({
  icon,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  icon: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-12 h-12",
  };

  return (
    <NeuButton
      variant={variant}
      size={size}
      className={cn(sizeClasses[size], "p-0 rounded-full", className)}
      {...props}
    >
      {icon}
    </NeuButton>
  );
}
