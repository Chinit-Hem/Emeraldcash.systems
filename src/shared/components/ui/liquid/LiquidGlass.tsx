"use client";

import { cn } from "@/shared/utils/ui";
import type { ReactNode } from "react";

type LiquidGlassProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
};

/**
 * LiquidGlass - A reusable wrapper component for "Liquid Glass / Frosted Glass" effect
 * 
 * This component applies a premium frosted glass effect ONLY in dark mode.
 * Light mode remains completely unchanged with solid backgrounds.
 * 
 * Design Specifications (Dark Mode Only):
 * - bg-slate-900/40 (Semi-transparent dark background)
 * - backdrop-blur-xl (Heavy blur effect)
 * - border border-white/10 (Subtle glowing border)
 * - shadow-2xl (Soft deep shadow)
 * 
 * Usage:
 * <LiquidGlass className="p-6 rounded-xl">
 *   <YourContent />
 * </LiquidGlass>
 * 
 * For cards with hover effect:
 * <LiquidGlass className="p-6 rounded-xl" hover>
 *   <YourContent />
 * </LiquidGlass>
 */
export function LiquidGlass({
  children,
  className,
  hover = false,
  glow = false,
}: LiquidGlassProps) {
  const baseClasses = cn(
    // Light mode: transparent (no effect, relies on parent bg-white)
    "bg-transparent",
    // Dark mode: Liquid glass effect
    "dark:bg-slate-900/40",
    "dark:backdrop-blur-xl",
    "dark:border",
    "dark:border-white/10",
    "dark:shadow-2xl",
    // Fast click feedback
    "active:scale-[0.99] transition-transform duration-75",
    // Optional hover effect for dark mode
    hover && "dark:hover:bg-slate-800/50 dark:hover:border-white/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]",
    // Optional glow effect for dark mode
    glow && "dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.15)]",
    className
  );

  return <div className={baseClasses}>{children}</div>;
}

/**
 * LiquidGlassCard - Pre-configured card variant with padding and rounded corners
 */
export function LiquidGlassCard({
  children,
  className,
  hover = true,
}: LiquidGlassProps) {
  return (
    <LiquidGlass
      className={cn(
        "p-5 sm:p-6",
        "rounded-2xl",
        className
      )}
      hover={hover}
    >
      {children}
    </LiquidGlass>
  );
}

/**
 * LiquidGlassPanel - For larger containers like sidebars or modals
 */
export function LiquidGlassPanel({
  children,
  className,
}: Omit<LiquidGlassProps, "hover" | "glow">) {
  return (
    <LiquidGlass
      className={cn(
        "p-6",
        "rounded-3xl",
        "dark:bg-slate-900/60",
        "dark:backdrop-blur-2xl",
        className
      )}
    >
      {children}
    </LiquidGlass>
  );
}

/**
 * LiquidGlassNavbar - For navigation bars with sticky positioning
 * 
 * Usage:
 * <LiquidGlassNavbar>
 *   <NavigationContent />
 * </LiquidGlassNavbar>
 */
export function LiquidGlassNavbar({
  children,
  className,
}: Omit<LiquidGlassProps, "hover" | "glow">) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50",
        "px-4 py-3",
        // Light mode
        "bg-white/80",
        "backdrop-blur-md",
        "border-b",
        "border-gray-200",
        // Dark mode: Liquid glass
        "dark:bg-slate-900/70",
        "dark:backdrop-blur-xl",
        "dark:border-white/10",
        className
      )}
    >
      {children}
    </header>
  );
}

/**
 * LiquidGlassMetric - For dashboard KPI cards with accent border
 * 
 * Usage:
 * <LiquidGlassMetric accent="green">
 *   <KpiContent />
 * </LiquidGlassMetric>
 */
export function LiquidGlassMetric({
  children,
  className,
  accent = "green",
}: Omit<LiquidGlassProps, "hover" | "glow"> & { accent?: "green" | "blue" | "orange" | "red" | "gray" }) {
  const accentColors = {
    green: "dark:border-t-emerald-500/50",
    blue: "dark:border-t-blue-500/50",
    orange: "dark:border-t-orange-500/50",
    red: "dark:border-t-red-500/50",
    gray: "dark:border-t-slate-500/50",
  };

  return (
    <LiquidGlass
      className={cn(
        "p-5",
        "rounded-2xl",
        "dark:border-t-4",
        accentColors[accent],
        "dark:transition-all",
        "dark:duration-300",
        "dark:hover:bg-slate-800/50",
        "dark:hover:-translate-y-1",
        className
      )}
      hover={false}
    >
      {children}
    </LiquidGlass>
  );
}

/**
 * LiquidGlassChart - For chart containers
 * 
 * Usage:
 * <LiquidGlassChart>
 *   <ChartContent />
 * </LiquidGlassChart>
 */
export function LiquidGlassChart({
  children,
  className,
}: Omit<LiquidGlassProps, "hover" | "glow">) {
  return (
    <LiquidGlass
      className={cn(
        "rounded-2xl",
        "overflow-hidden",
        className
      )}
      hover={false}
    >
      {children}
    </LiquidGlass>
  );
}

/**
 * LiquidGlassModal - For modal dialogs with stronger blur
 * 
 * Usage:
 * <LiquidGlassModal>
 *   <ModalContent />
 * </LiquidGlassModal>
 */
export function LiquidGlassModal({
  children,
  className,
}: Omit<LiquidGlassProps, "hover" | "glow">) {
  return (
    <LiquidGlass
      className={cn(
        "p-6",
        "rounded-3xl",
        "dark:bg-slate-900/80",
        "dark:backdrop-blur-2xl",
        "dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]",
        className
      )}
      hover={false}
    >
      {children}
    </LiquidGlass>
  );
}

// Re-export all components as default export for convenience
const LiquidGlassComponents = {
  LiquidGlass,
  LiquidGlassCard,
  LiquidGlassPanel,
  LiquidGlassNavbar,
  LiquidGlassMetric,
  LiquidGlassChart,
  LiquidGlassModal,
};

export default LiquidGlassComponents;
