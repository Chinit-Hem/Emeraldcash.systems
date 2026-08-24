"use client";

import { Clock3 } from "lucide-react";
import { SidebarSystemItem } from "./SidebarSystemItem";
import type { SidebarNavigationItem } from "./types";

type SidebarRecentProps = {
  items: SidebarNavigationItem[];
  collapsed?: boolean;
  expandedItemId?: string | null;
  onToggleItem?: (id: string) => void;
  onNavigate?: (href: string) => void;
};

export function SidebarRecent({ items, collapsed = false, expandedItemId, onToggleItem, onNavigate }: SidebarRecentProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="sidebar-recent-heading" className="space-y-2">
      <div className={collapsed ? "sr-only" : "flex items-center gap-2 px-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-slate-400 dark:text-slate-500"}>
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        <h2 id="sidebar-recent-heading">Recent</h2>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarSystemItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            expanded={expandedItemId === item.id}
            onToggle={item.children?.length ? () => onToggleItem?.(item.id) : undefined}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}
