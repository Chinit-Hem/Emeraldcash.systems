"use client";

import React from "react";
import { cn, ui } from "@/shared/utils/ui";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}


export function GlassButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}: GlassButtonProps) {
  const sizes: Record<NonNullable<GlassButtonProps["size"]>, string> = {
    sm: ui.button.size.sm,
    md: ui.button.size.md,
    lg: ui.button.size.lg,
  };

  const variants: Record<NonNullable<GlassButtonProps["variant"]>, string> = {
    primary: ui.button.primary,
    secondary: ui.button.secondary,
    danger: ui.button.danger,
    ghost: ui.button.ghost,
    outline: ui.button.outline,
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={cn(ui.button.base, sizes[size], variants[variant], widthClass, "touch-target", className)}
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
