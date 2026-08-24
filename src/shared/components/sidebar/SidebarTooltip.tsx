"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/utils/ui";

type SidebarTooltipProps = {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function SidebarTooltip({ label, children, disabled = false, className }: SidebarTooltipProps) {
  if (disabled) return <>{children}</>;

  return (
    <div className={cn("group/sidebar-tooltip relative flex min-w-0", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-[300] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover/sidebar-tooltip:opacity-100 group-focus-within/sidebar-tooltip:opacity-100 motion-reduce:transition-none"
      >
        {label}
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-950"
        />
      </span>
    </div>
  );
}
