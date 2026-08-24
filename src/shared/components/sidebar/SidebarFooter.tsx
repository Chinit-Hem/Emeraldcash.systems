"use client";

import type { User } from "@/shared/types/types";
import { LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/ui";
import { SidebarTooltip } from "./SidebarTooltip";
import { SidebarUser } from "./SidebarUser";

type SidebarFooterProps = {
  user: User;
  collapsed?: boolean;
  onLogout: () => void;
};

export function SidebarFooter({ user, collapsed = false, onLogout }: SidebarFooterProps) {
  const logoutButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onLogout}
      className={cn(
        "h-9 w-full justify-start gap-2 rounded-lg px-2.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-300",
        collapsed && "justify-center px-0"
      )}
      aria-label="Log out"
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={collapsed ? "sr-only" : ""}>Log out</span>
    </Button>
  );

  return (
    <footer className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
      <SidebarUser user={user} collapsed={collapsed} />
      {collapsed ? <SidebarTooltip label="Log out">{logoutButton}</SidebarTooltip> : logoutButton}
    </footer>
  );
}
