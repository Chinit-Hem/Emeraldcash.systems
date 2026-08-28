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

function getItemTheme(id: string) {
  if (id === "vehicle-tuktuks") {
    return {
      item: "hover:bg-rose-50/90 hover:text-rose-800 focus-visible:ring-rose-500/60 dark:hover:bg-rose-500/10 dark:hover:text-rose-200",
      icon: "group-hover/sidebar-item:text-rose-600 dark:group-hover/sidebar-item:text-rose-300",
      active: "bg-rose-50/90 font-semibold text-rose-800 shadow-[0_6px_18px_rgba(244,63,94,0.12)] hover:bg-rose-50 focus-visible:ring-rose-500/60 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/15",
      activeIcon: "text-rose-600 dark:text-rose-300",
      indicator: "bg-rose-500",
    };
  }
  if (id === "vehicle-motorcycles" || id === "learning-center" || id.startsWith("lms-")) {
    return {
      item: "hover:bg-violet-50/90 hover:text-violet-800 focus-visible:ring-violet-500/60 dark:hover:bg-violet-500/10 dark:hover:text-violet-200",
      icon: "group-hover/sidebar-item:text-violet-600 dark:group-hover/sidebar-item:text-violet-300",
      active: "bg-violet-50/90 font-semibold text-violet-800 shadow-[0_6px_18px_rgba(139,92,246,0.12)] hover:bg-violet-50 focus-visible:ring-violet-500/60 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/15",
      activeIcon: "text-violet-600 dark:text-violet-300",
      indicator: "bg-violet-500",
    };
  }
  if (id === "asset-inventory" || id.startsWith("sms-")) {
    return {
      item: "hover:bg-orange-50/90 hover:text-orange-800 focus-visible:ring-orange-500/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-200",
      icon: "group-hover/sidebar-item:text-orange-600 dark:group-hover/sidebar-item:text-orange-300",
      active: "bg-orange-50/90 font-semibold text-orange-800 shadow-[0_6px_18px_rgba(249,115,22,0.12)] hover:bg-orange-50 focus-visible:ring-orange-500/60 dark:bg-orange-500/15 dark:text-orange-300 dark:hover:bg-orange-500/15",
      activeIcon: "text-orange-600 dark:text-orange-300",
      indicator: "bg-orange-500",
    };
  }
  if (id === "human-resources" || id.startsWith("hr-")) {
    return {
      item: "hover:bg-rose-50/90 hover:text-rose-800 focus-visible:ring-rose-500/60 dark:hover:bg-rose-500/10 dark:hover:text-rose-200",
      icon: "group-hover/sidebar-item:text-rose-600 dark:group-hover/sidebar-item:text-rose-300",
      active: "bg-rose-50/90 font-semibold text-rose-800 shadow-[0_6px_18px_rgba(244,63,94,0.12)] hover:bg-rose-50 focus-visible:ring-rose-500/60 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/15",
      activeIcon: "text-rose-600 dark:text-rose-300",
      indicator: "bg-rose-500",
    };
  }
  if (id === "loan-management" || id.startsWith("loan-")) {
    return {
      item: "hover:bg-emerald-50/90 hover:text-emerald-800 focus-visible:ring-emerald-500/60 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200",
      icon: "group-hover/sidebar-item:text-emerald-600 dark:group-hover/sidebar-item:text-emerald-300",
      active: "bg-emerald-50/90 font-semibold text-emerald-800 shadow-[0_6px_18px_rgba(16,185,129,0.12)] hover:bg-emerald-50 focus-visible:ring-emerald-500/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15",
      activeIcon: "text-emerald-600 dark:text-emerald-300",
      indicator: "bg-emerald-500",
    };
  }
  if (id === "vehicle-management" || id.startsWith("vehicle-")) {
    return {
      item: "hover:bg-sky-50/90 hover:text-sky-800 focus-visible:ring-sky-500/60 dark:hover:bg-sky-500/10 dark:hover:text-sky-200",
      icon: "group-hover/sidebar-item:text-sky-600 dark:group-hover/sidebar-item:text-sky-300",
      active: "bg-sky-50/90 font-semibold text-sky-800 shadow-[0_6px_18px_rgba(14,165,233,0.12)] hover:bg-sky-50 focus-visible:ring-sky-500/60 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/15",
      activeIcon: "text-sky-600 dark:text-sky-300",
      indicator: "bg-sky-500",
    };
  }
  return {
    item: "hover:bg-emerald-50/90 hover:text-emerald-800 focus-visible:ring-emerald-500/60 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200",
    icon: "group-hover/sidebar-item:text-emerald-600 dark:group-hover/sidebar-item:text-emerald-300",
    active: "bg-emerald-50/90 font-semibold text-emerald-800 shadow-[0_6px_18px_rgba(16,185,129,0.12)] hover:bg-emerald-50 focus-visible:ring-emerald-500/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15",
    activeIcon: "text-emerald-600 dark:text-emerald-300",
    indicator: "bg-emerald-500",
  };
}

export function SidebarItem({
  item,
  collapsed = false,
  hasChildren = false,
  childrenExpanded = false,
  onClick,
  onNavigate,
}: SidebarItemProps) {
  const theme = getItemTheme(item.id);
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
        "group/sidebar-item relative flex min-h-10 w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-[0.9rem] font-medium text-slate-600 outline-none transition-colors duration-150 focus-visible:ring-2 dark:text-slate-300",
        !item.active && theme.item,
        collapsed && "min-h-14 justify-center rounded-2xl px-0",
        item.active && theme.active
      )}
      data-sidebar-href={item.href}
    >
      {item.active ? (
        <motion.span
          layoutId="sidebar-active-indicator"
          aria-hidden="true"
          className={cn("absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full", theme.indicator)}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        />
      ) : null}
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors dark:text-slate-400",
          !item.active && theme.icon,
          item.active && theme.activeIcon,
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
