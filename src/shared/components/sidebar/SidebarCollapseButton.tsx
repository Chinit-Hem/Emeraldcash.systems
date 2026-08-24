"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/ui";

type SidebarCollapseButtonProps = {
  collapsed: boolean;
  onClick: () => void;
  className?: string;
};

export function SidebarCollapseButton({ collapsed, onClick, className }: SidebarCollapseButtonProps) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      aria-expanded={!collapsed}
      title={`${label} (Ctrl+B)`}
      className={cn(
        "h-9 w-9 shrink-0 rounded-lg border border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        className
      )}
    >
      <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
    </Button>
  );
}
