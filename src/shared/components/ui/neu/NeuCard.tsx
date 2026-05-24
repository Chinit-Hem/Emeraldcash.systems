/**
 * Neumorphism Card Component
 * 
 * Base card component following Neumorphism (Soft UI) design principles:
 * - Soft shadows (both light and dark)
 * - Subtle gradients
 * - Inset/pressed states
 * 
 * @module ui/NeuCard
 */

"use client";

import React from "react";
import { cn } from "@/shared/utils/ui";

// ============================================================================
// Types & Interfaces (OOAD: Abstraction)
// ============================================================================

interface NeuCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "flat" | "pressed" | "convex";
  size?: "sm" | "md" | "lg";
  hover?: boolean;
  onClick?: () => void;
}

interface NeuCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

interface NeuCardSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  divider?: boolean;
}

// ============================================================================
// Base Card Component (OOAD: Encapsulation)
// ============================================================================

export function NeuCard({
  children,
  className = "",
  variant = "flat",
  size = "md",
  hover = false,
  onClick,
}: NeuCardProps) {
  // Flat style definitions
  const shadows = {
    flat: "bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-700",
    pressed: "bg-slate-50 border border-slate-200 shadow-sm dark:bg-slate-800/70 dark:border-slate-700",
    convex: "bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-700",
  };

  const sizes = {
    sm: "p-4 rounded-xl",
    md: "p-6 rounded-2xl",
    lg: "p-8 rounded-3xl",
  };

  const hoverStyles = hover ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 active:bg-slate-100 dark:active:bg-slate-700 transition-colors duration-150" : "";

  return (
    <div
      className={cn(
        "relative overflow-hidden transition-colors duration-150",
        shadows[variant],
        sizes[size],
        hoverStyles,
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ============================================================================
// Card Header Component (OOAD: Composition)
// ============================================================================

export function NeuCardHeader({
  title,
  subtitle,
  icon,
  action,
  className = "",
}: NeuCardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ============================================================================
// Card Section Component (OOAD: Composition)
// ============================================================================

export function NeuCardSection({
  children,
  className = "",
  title,
  divider = false,
}: NeuCardSectionProps) {
  return (
    <div className={cn("space-y-4", divider && "pt-4 border-t border-slate-200/50 dark:border-slate-700", className)}>
      {title && (
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Specialized Card Variants (OOAD: Inheritance/Polymorphism)
// ============================================================================

export function NeuStatCard({
  title,
  value,
  subtitle,
  icon,
  color = "emerald",
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "purple" | "orange" | "red";
  className?: string;
}) {
  const colorStyles = {
    emerald: "text-emerald-600 dark:text-emerald-300",
    blue: "text-blue-600 dark:text-blue-300",
    purple: "text-purple-600 dark:text-purple-300",
    orange: "text-orange-600 dark:text-orange-300",
    red: "text-red-600 dark:text-red-300",
  };

  return (
    <NeuCard className={className} hover>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn("w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center", colorStyles[color])}>
          {icon}
        </div>
      </div>
    </NeuCard>
  );
}

export function NeuCategoryCard({
  name,
  description,
  icon,
  count,
  completionRate,
  color = "emerald",
  onClick,
  isComplete,
}: {
  name: string;
  description?: string;
  icon: React.ReactNode;
  count: number;
  completionRate: number;
  color?: "emerald" | "blue" | "purple" | "orange";
  onClick: () => void;
  isComplete?: boolean;
}) {
  const colorStyles = {
    emerald: "text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15",
    blue: "text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15",
    purple: "text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/15",
    orange: "text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/15",
  };

  return (
    <NeuCard hover onClick={onClick} className={isComplete ? "ring-2 ring-emerald-500/50" : ""}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorStyles[color])}>
          {icon}
        </div>
        {isComplete ? (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{name}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{description}</p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{count} lessons</span>
          <span className={cn("font-medium", completionRate >= 50 ? colorStyles[color].split(" ")[0] : "text-slate-500 dark:text-slate-400")}>
            {completionRate}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", colorStyles[color].split(" ")[0].replace("text-", "bg-"))}
            style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
          />
        </div>
      </div>
    </NeuCard>
  );
}

// ============================================================================
// NeuButton Component (OOAD: Reusable Action Component)
// ============================================================================

interface NeuButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function NeuButton({
  children,
  type = "button",
  variant = "primary",
  onClick,
  disabled = false,
  isLoading = false,
  className = "",
}: NeuButtonProps) {
  const baseStyles = "px-6 py-2.5 rounded-xl font-medium transition-colors duration-150 flex items-center justify-center border shadow-sm";
  
  const variants = {
    primary: cn(
      baseStyles,
      "bg-emerald-500 border-emerald-500 text-white",
      "hover:bg-emerald-600 hover:border-emerald-600",
      "active:bg-emerald-700 active:border-emerald-700",
      disabled && "opacity-50 cursor-not-allowed"
    ),
    secondary: cn(
      baseStyles,
      "bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200",
      "hover:bg-slate-50",
      "active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700",
      disabled && "opacity-50 cursor-not-allowed"
    ),
    danger: cn(
      baseStyles,
      "bg-red-500 border-red-500 text-white",
      "hover:bg-red-600 hover:border-red-600",
      "active:bg-red-700 active:border-red-700",
      disabled && "opacity-50 cursor-not-allowed"
    ),
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(variants[variant], className)}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
