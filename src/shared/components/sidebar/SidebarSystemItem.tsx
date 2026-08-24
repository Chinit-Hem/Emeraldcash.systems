"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { FocusEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SidebarItem } from "./SidebarItem";
import type { SidebarNavigationItem } from "./types";

type SidebarSystemItemProps = {
  item: SidebarNavigationItem;
  collapsed?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onNavigate?: (href: string) => void;
};

export function SidebarSystemItem({ item, collapsed = false, expanded, onToggle, onNavigate }: SidebarSystemItemProps) {
  const children = item.children ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [isInlineExpanded, setIsInlineExpanded] = useState(Boolean(item.active));
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cancelClose();
    setIsOpen(false);
    setPosition(null);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(close, 160);
  }, [cancelClose, close]);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const flyout = flyoutRef.current?.getBoundingClientRect();
    if (!anchor || !flyout) return;

    const edgePadding = 8;
    const gap = 10;
    const maxLeft = Math.max(edgePadding, window.innerWidth - flyout.width - edgePadding);
    const maxTop = Math.max(edgePadding, window.innerHeight - flyout.height - edgePadding);

    setPosition({
      left: Math.min(anchor.right + gap, maxLeft),
      top: Math.min(Math.max(anchor.top, edgePadding), maxTop),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(updatePosition);
    const handleViewportChange = () => window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (expanded === undefined && item.active) setIsInlineExpanded(true);
  }, [expanded, item.active]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      scheduleClose();
    }
  };

  const toggleInlineMenu = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsInlineExpanded((current) => !current);
    }
    return false;
  };

  const inlineExpanded = expanded ?? isInlineExpanded;

  if (children.length === 0) {
    return <SidebarItem item={item} collapsed={collapsed} onNavigate={onNavigate} />;
  }

  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setIsOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setIsOpen(true);
      }}
      onBlur={handleBlur}
    >
      <SidebarItem
        item={item}
        collapsed={collapsed}
        hasChildren
        childrenExpanded={!collapsed && inlineExpanded}
        onClick={collapsed ? undefined : toggleInlineMenu}
        onNavigate={onNavigate}
      />

      {!collapsed && inlineExpanded ? (
        <div className="ml-8 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700">
          {children.map((child) => (
            <SidebarItem key={child.id} item={child} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}

      <AnimatePresence>
        {collapsed && isOpen ? (
          <motion.div
            ref={flyoutRef}
            role="menu"
            aria-label={`${item.label} navigation`}
            initial={{ opacity: 0, x: -6, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={position ? { left: position.left, top: position.top } : { visibility: "hidden" }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="fixed z-[250] w-64 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl shadow-slate-950/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
          >
            <div className="mb-2 border-b border-slate-100 px-2 pb-2 dark:border-slate-800">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-emerald-600 dark:text-emerald-300">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose a workspace area</p>
            </div>
            <div className="space-y-0.5">
              {children.map((child) => (
                <SidebarItem key={child.id} item={child} onNavigate={onNavigate} />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
