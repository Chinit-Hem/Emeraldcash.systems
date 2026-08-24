"use client";

import type { User } from "@/shared/types/types";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/shared/utils/ui";
import { SidebarTooltip } from "./SidebarTooltip";

type SidebarUserProps = {
  user: User;
  collapsed?: boolean;
};

export function SidebarUser({ user, collapsed = false }: SidebarUserProps) {
  const displayName = user.full_name || user.username;
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <div className={cn("flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/70", collapsed && "justify-center border-transparent bg-transparent p-0")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" aria-hidden="true">
        {initials || "EC"}
      </div>
      <div className={cn("min-w-0", collapsed && "sr-only")}>
        <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{displayName}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{user.role}</span>
        </p>
      </div>
    </div>
  );

  return collapsed ? <SidebarTooltip label={`${displayName} · ${user.role}`}>{content}</SidebarTooltip> : content;
}
