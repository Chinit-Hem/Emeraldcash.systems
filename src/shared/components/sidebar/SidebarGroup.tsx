"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { FocusEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/ui";
import { SidebarItem } from "./SidebarItem";
import type { SidebarNavigationGroup } from "./types";

type SidebarGroupProps = {
  group: SidebarNavigationGroup;
  expanded: boolean;
  collapsed?: boolean;
  onToggle: () => void;
  onRequestExpand?: () => void;
  onNavigate?: (href: string) => void;
};

export function SidebarGroup({
  group,
  expanded,
  collapsed = false,
  onToggle,
  onRequestExpand,
  onNavigate,
}: SidebarGroupProps) {
  const isActive = group.items.some((item) => item.active);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setFlyoutPosition(null);
  }, []);

  const handleHeaderClick = () => {
    if (collapsed) {
      onRequestExpand?.();
      return;
    }
    onToggle();
  };

  const updateFlyoutPosition = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const flyout = flyoutRef.current?.getBoundingClientRect();
    if (!anchor || !flyout) return;

    const edgePadding = 8;
    const gap = 12;
    const maxLeft = Math.max(edgePadding, window.innerWidth - flyout.width - edgePadding);
    const maxTop = Math.max(edgePadding, window.innerHeight - flyout.height - edgePadding);

    setFlyoutPosition({
      left: Math.min(anchor.right + gap, maxLeft),
      top: Math.min(Math.max(anchor.top, edgePadding), maxTop),
    });
  }, []);

  useEffect(() => {
    if (!collapsed || !isFlyoutOpen) return;

    let frame: number | null = window.requestAnimationFrame(updateFlyoutPosition);
    const schedulePositionUpdate = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateFlyoutPosition);
    };

    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [collapsed, isFlyoutOpen, updateFlyoutPosition]);

  useEffect(() => {
    if (!collapsed || !isFlyoutOpen) return;

    const frame = window.requestAnimationFrame(() => {
      const flyout = flyoutRef.current;
      if (!flyout) return;

      const activeItem = flyout.querySelector<HTMLElement>('[aria-current="page"]');
      if (!activeItem) {
        flyout.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      const panelRect = flyout.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const targetTop = flyout.scrollTop + itemRect.top - panelRect.top - (panelRect.height - itemRect.height) / 2;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      flyout.scrollTo({
        top: Math.max(0, targetTop),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [collapsed, isFlyoutOpen]);

  useEffect(() => {
    if (!collapsed) closeFlyout();
  }, [closeFlyout, collapsed]);

  const handleFlyoutBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeFlyout();
    }
  };

  const renderItems = (items: typeof group.items, nested = false) => items.map((item) => (
    <div key={item.id}>
      <SidebarItem item={item} onNavigate={onNavigate} />
      {!nested && item.active && item.children?.length ? (
        <div className="ml-8 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700">
          {renderItems(item.children, true)}
        </div>
      ) : null}
    </div>
  ));

  const header = (
    <button
      type="button"
      onClick={handleHeaderClick}
      aria-expanded={collapsed ? isFlyoutOpen : expanded}
      aria-haspopup={collapsed ? "menu" : undefined}
      aria-controls={collapsed ? `sidebar-flyout-${group.id}` : undefined}
      aria-label={collapsed ? group.label : undefined}
      className={cn(
        "group/sidebar-group flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[0.68rem] font-bold uppercase tracking-[0.13em] text-slate-400 outline-none transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200",
        collapsed && "min-h-14 justify-center px-0",
        isActive && "text-emerald-600 dark:text-emerald-300"
      )}
    >
      <group.icon className={cn("h-4 w-4 shrink-0", collapsed && "h-6 w-6")} strokeWidth={isActive ? 2.25 : 1.9} aria-hidden="true" />
      <span className={cn("flex-1 truncate", collapsed && "sr-only")}>{group.label}</span>
      {!collapsed ? (
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", expanded && "rotate-180")}
          aria-hidden="true"
        />
      ) : null}
    </button>
  );

  return (
    <section
      ref={anchorRef}
      aria-label={group.label}
      className={cn("relative min-w-0", collapsed && "group/sidebar-flyout")}
      onMouseEnter={collapsed ? () => setIsFlyoutOpen(true) : undefined}
      onMouseLeave={collapsed ? closeFlyout : undefined}
      onFocus={collapsed ? () => setIsFlyoutOpen(true) : undefined}
      onBlur={collapsed ? handleFlyoutBlur : undefined}
    >
      {header}
      <AnimatePresence>
        {collapsed && isFlyoutOpen ? (
          <>
            <span aria-hidden="true" className="absolute left-full top-0 h-full w-3" />
            <motion.div
              ref={flyoutRef}
              id={`sidebar-flyout-${group.id}`}
              role="menu"
              aria-label={`${group.label} navigation`}
              initial={{ opacity: 0, x: -6, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={flyoutPosition ? { left: flyoutPosition.left, top: flyoutPosition.top } : { visibility: "hidden" }}
              className="fixed z-[240] max-h-[calc(100dvh-1rem)] w-64 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl shadow-slate-950/15 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
            >
              <div className="mb-2 border-b border-slate-100 px-2 pb-2 dark:border-slate-800">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-emerald-600 dark:text-emerald-300">{group.label}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose a workspace area</p>
              </div>
              <div className="space-y-0.5">
                {renderItems(group.items)}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {!collapsed && expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-2 mt-1 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
              {renderItems(group.items)}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
