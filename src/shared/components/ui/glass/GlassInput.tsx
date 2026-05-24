"use client";

import React, { useState } from "react";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import { cn, ui } from "@/shared/utils/ui";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function GlassInput({
  label,
  error,
  icon,
  rightElement,
  className = "",
  type = "text",
  ...props
}: GlassInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full">
      {label && (
        <label className={cn(ui.text.label, "mb-1.5 block")}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">

        {icon && (
          <div className="pointer-events-none absolute left-3.5 text-[var(--text-secondary)]">
            {icon}
          </div>
        )}
        <input
          type={inputType}
          className={cn(
            ui.input.base,
            icon && ui.input.withIcon,
            (isPassword || rightElement) && ui.input.withRightElement,
            error && ui.input.error,
            className
          )}
          {...props}
        />
        {isPassword && (
          <GlassButton
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            variant="ghost"
            className="absolute right-2 !h-8 !w-8 !rounded-lg !p-0"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </GlassButton>
        )}
        {!isPassword && rightElement && (
          <div className="absolute right-3">{rightElement}</div>
        )}
      </div>
      {error && (
        <p className={cn(ui.text.danger, "mt-1.5 flex items-center gap-1")}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
