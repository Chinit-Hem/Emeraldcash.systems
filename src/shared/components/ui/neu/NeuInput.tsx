/**
 * Neumorphism Input Component
 * 
 * Input component following Neumorphism (Soft UI) design principles:
 * - Inset shadows for pressed appearance
 * - Focus states with subtle glow
 * - Consistent with card/button styling
 * 
 * @module ui/NeuInput
 */

"use client";

import React from "react";
import { cn } from "@/shared/utils/ui";

// ============================================================================
// Types & Interfaces (OOAD: Abstraction)
// ============================================================================

interface NeuInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

interface NeuSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

interface NeuTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// ============================================================================
// Base Input Component (OOAD: Encapsulation)
// ============================================================================

export function NeuInput({
  label,
  error,
  helperText,
  icon,
  rightElement,
  className = "",
  disabled,
  ...props
}: NeuInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full h-12 px-4 bg-white rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-700",
            "text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
            "transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pl-12",
            rightElement && "pr-11",
            className
          )}
          disabled={disabled}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

// ============================================================================
// Select Component (OOAD: Polymorphism)
// ============================================================================

export function NeuSelect({
  label,
  error,
  helperText,
  options,
  className = "",
  disabled,
  ...props
}: NeuSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            "w-full h-11 px-4 bg-white rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-700",
            "text-slate-800 dark:text-slate-200",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
            "transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "appearance-none cursor-pointer",
            error && "ring-2 ring-red-500/20 dark:ring-red-500/25",
            className
          )}
          disabled={disabled}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

// ============================================================================
// Textarea Component (OOAD: Polymorphism)
// ============================================================================

export function NeuTextarea({
  label,
  error,
  helperText,
  className = "",
  disabled,
  rows = 4,
  ...props
}: NeuTextareaProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          "w-full px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-700",
          "text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
          "transition-colors duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "resize-none",
          error && "ring-2 ring-red-500/20 dark:ring-red-500/25",
          className
        )}
        disabled={disabled}
        rows={rows}
        {...props}
      />
      {error && <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
}
