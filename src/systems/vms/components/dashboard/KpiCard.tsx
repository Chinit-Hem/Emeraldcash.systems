"use client";

import { isIOSSafariBrowser } from "@/shared/utils/platform";
import { useMounted } from "@/shared/hooks/useMounted";

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  subtitle?: string;
  accent?: "green" | "blue" | "orange" | "red" | "gray";
  onClick?: () => void;
};

function accentClasses(accent: NonNullable<KpiCardProps["accent"]>, isIOSSafari: boolean) {
  if (isIOSSafari) {
    // iOS: Simple border colors without glass effects
    if (accent === "blue") return "border-t-2 border-emerald-500";
    if (accent === "orange") return "border-t-2 border-orange-500";
    if (accent === "red") return "border-t-2 border-red-500";
    if (accent === "gray") return "border-t-2 border-gray-400";
    return "border-t-2 border-emerald-500";
  }

  // Desktop: Liquid Glass effect with accent colors
  const accentMap = {
    green: "dark:border-t-emerald-400/50",
    blue: "dark:border-t-blue-400/50",
    orange: "dark:border-t-orange-400/50",
    red: "dark:border-t-red-400/50",
    gray: "dark:border-t-slate-400/50",
  };

  return accentMap[accent] || accentMap.green;
}

export default function KpiCard({ label, value, sublabel, subtitle, accent = "green", onClick }: KpiCardProps) {
  const isIOSSafari = useMounted() && isIOSSafariBrowser();

  // iOS-safe card classes (solid backgrounds, no blur)
  if (isIOSSafari) {
    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm ${accentClasses(accent, true)} ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform duration-75" : "cursor-default"}`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">
          {value}
        </div>
        {sublabel ? (
          <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {sublabel}
          </div>
        ) : null}
        {subtitle ? (
          <div className="mt-1 text-xs italic text-slate-500/80 dark:text-slate-400/80">
            {subtitle}
          </div>
        ) : null}
      </div>
    );
  }

  // Desktop: Full Liquid Glass effect
  return (
    <div
      className={`
        relative overflow-hidden
        p-5 rounded-2xl
        cursor-pointer
        bg-white border border-slate-200 shadow-sm
        dark:bg-slate-900/40 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
        dark:hover:bg-slate-800/50 dark:hover:border-white/20
        active:scale-[0.98] dark:active:scale-[0.98]
        transition-transform duration-75
        border-t-4 border-t-emerald-500/60 ${accentClasses(accent, false)}
      `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Gloss effect overlay (dark mode only) */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none hidden dark:block" />

      {/* Content */}
      <div className="relative z-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">
          {value}
        </div>
        {sublabel ? (
          <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {sublabel}
          </div>
        ) : null}
        {subtitle ? (
          <div className="mt-1 text-xs italic text-slate-500/80 dark:text-slate-400/80">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
