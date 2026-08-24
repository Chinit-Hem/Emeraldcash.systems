"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
};

export function MobileDrawer({ open, onClose, children, labelledBy = "mobile-navigation-title" }: MobileDrawerProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[260] xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <button type="button" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-slate-950/35 backdrop-blur-[2px]" aria-label="Close navigation menu" />
            <motion.aside
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="relative h-dvh w-[min(280px,88vw)] overflow-hidden bg-white shadow-2xl outline-none dark:bg-slate-950"
            >
              <div className="absolute right-3 top-3 z-10">
                <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close navigation menu">
                  <X className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
              {children}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
