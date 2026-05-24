"use client";

import { isIOSSafariBrowser } from "@/shared/utils/platform";
import type { ReactNode } from "react";
import { useMounted } from "@/shared/hooks/useMounted";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
};

export default function ChartCard({ title, subtitle, right, children }: ChartCardProps) {
  const isIOSSafari = useMounted() && isIOSSafariBrowser();

  // iOS-safe: Use solid backgrounds
  if (isIOSSafari) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden active:scale-[0.99] transition-transform duration-75">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
              {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    );
  }

  // Desktop: Full Liquid Glass effect
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900/40 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl active:scale-[0.99] transition-transform duration-75">
      {/* Gloss effect overlay (dark mode only) */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/10 to-transparent pointer-events-none hidden dark:block" />
      
      <div className="relative z-10 px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
            {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      <div className="relative z-10 p-5">{children}</div>
    </div>
  );
}
