"use client";

import React, { forwardRef } from "react";
import { cn, ui } from "@/shared/utils/ui";

interface GlassFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  as?: "input" | "select" | "textarea";
  children?: React.ReactNode; // For select options
}

export const GlassField = forwardRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, GlassFieldProps>(
  ({ label, error, required, helperText, as = "input", children, className = "", id, ...props }, ref) => {
    const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const errorId = error ? `${fieldId}-error` : undefined;
    const helperId = helperText ? `${fieldId}-helper` : undefined;

    const inputStyles = cn(
      ui.input.base,
      "min-h-11 min-w-0 text-base sm:text-sm",
      error && ui.input.error,
      className
    );

    return (
      <div className="w-full min-w-0">
        <label
          htmlFor={fieldId}
          className={cn(ui.text.label, "mb-1.5 block")}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {as === "select" ? (
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            id={fieldId}
            className={`${inputStyles} appearance-none cursor-pointer`}
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        ) : as === "textarea" ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={fieldId}
            className={`${inputStyles} h-auto min-h-24 py-3 resize-y`}
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            {...(props as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}

          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={fieldId}
            className={inputStyles}
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {error && (
          <p id={errorId} className={cn(ui.text.danger, "mt-1.5 flex items-start gap-1 text-sm")}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="min-w-0 break-words">{error}</span>
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className={cn(ui.text.helper, "mt-1.5 break-words text-sm")}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

GlassField.displayName = "GlassField";
