"use client";

import React from "react";
import { cn, ui } from "@/shared/utils/ui";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined";
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = "",
  variant = "default",
  hover = false,
  onClick,
}: GlassCardProps) {
  const baseStyles = "relative overflow-hidden transition-all duration-300 ease-out";

const variants: Record<NonNullable<GlassCardProps["variant"]>, string> = {
    default: "bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl rounded-3xl p-6",
    elevated: cn("bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-3xl p-6", "shadow-[var(--ec-shadow-strong)]"),
    outlined: cn("bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-2 border-white/30 dark:border-gray-700/40 shadow-lg rounded-3xl p-6", "border-[var(--ec-glass-stroke-strong)]"),
  };

  const hoverStyles = hover
    ? "cursor-pointer hover:-translate-y-0.5 hover:border-white/30 dark:hover:border-gray-600/50 hover:shadow-2xl"
    : "";

  return (
    <div
      className={cn(baseStyles, variants[variant], hoverStyles, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Compact card for mobile lists
export function GlassCardCompact({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-200",
        ui.surface.cardSoft,
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
      onClick={onClick}
    >
      <div className="relative z-10 p-4">{children}</div>
    </div>
  );
}
