"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { cn } from "@/shared/utils/ui";
import { SidebarTooltip } from "./SidebarTooltip";
import type { SidebarNavigationItem } from "./types";

type SidebarItemProps = {
  item: SidebarNavigationItem;
  collapsed?: boolean;
  hasChildren?: boolean;
  childrenExpanded?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => boolean | void;
  onNavigate?: (href: string) => void;
};

export function SidebarItem({
  item,
  collapsed = false,
  hasChildren = false,
  childrenExpanded = false,
  onClick,
  onNavigate,
}: SidebarItemProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (onClick?.(event) === false) return;
    if (item.href === "#") event.preventDefault();
    onNavigate?.(item.href);
  };

  const link = (
    <Link
      href={item.href}
      onClick={handleClick}
      aria-current={item.active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group/sidebar-item relative flex min-h-10 w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-[0.9rem] font-medium text-slate-600 outline-none transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        collapsed && "min-h-14 justify-center rounded-2xl px-0",
        item.active && "bg-emerald-50/90 font-semibold text-emerald-800 shadow-[0_6px_18px_rgba(16,185,129,0.12)] hover:bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
      )}
      data-sidebar-href={item.href}
    >
      {item.active ? (
        <motion.span
          layoutId="sidebar-active-indicator"
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-emerald-500"
          transition={{ duration: 0.2, ease: "easeInOut" }}
        />
      ) : null}
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors group-hover/sidebar-item:text-emerald-600 dark:text-slate-400 dark:group-hover/sidebar-item:text-emerald-300",
          item.active && "text-emerald-600 dark:text-emerald-300",
          collapsed && "h-12 w-12"
        )}
      >
        <item.icon className={cn("h-[1.1rem] w-[1.1rem]", collapsed && "h-6 w-6")} strokeWidth={item.active ? 2.25 : 1.9} aria-hidden="true" />
      </span>
      <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>{item.label}</span>
      {hasChildren && !collapsed ? (
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", childrenExpanded && "rotate-180")} aria-hidden="true" />
      ) : null}
      {item.badge && !collapsed ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {item.badge}
        </span>
      ) : null}
      {item.href === "#" && !collapsed ? <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> : null}
    </Link>
  );

  return collapsed ? <SidebarTooltip label={item.label}>{link}</SidebarTooltip> : link;
}
