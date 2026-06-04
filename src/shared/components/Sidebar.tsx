"use client";

import type { User } from "@/shared/types/types";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { useTranslation } from "@/shared/utils/i18n";
import { OptimizedLink } from "@/shared/components/OptimizedLink";
import { hasAppPermission } from "@/shared/utils/permissions";
import { useVehicleStats } from "@/systems/vms/hooks/useVehiclesNeon";
import {
  clearStoredVehicleListState,
  rememberVehicleListScrollSnapshot,
  VEHICLE_LIST_ALL_HREF,
  VEHICLE_LIST_URL_CHANGE_EVENT,
  type VehicleListScrollSnapshot
} from "@/systems/vms/utils/vehicleListState";
import { TukTukIcon } from "@/shared/components/icons/TukTukIcon";
import { cn } from "@/shared/utils/ui";
import {
  ArrowLeftRight,
  Bike,
  BookOpen,
  Boxes,
  Calculator,
  Car,
  Clock,
  History,
  Package,
  PlayCircle,
  Users,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

function normalizeCategory(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

// Helper to check if category is TukTuk (handles "Tuk Tuk", "TukTuk", "tuktuk", etc.)
function isTukTukCategory(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "tuk tuk" || normalized === "tuktuk" || normalized === "tuk-tuk" || normalized.includes("tuk");
}

// Icon Components
function IconDashboard({ className }: { className?: string }) {
  return <Calculator className={className || "w-5 h-5"} />;
}

function IconLms({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function IconSms({ className }: { className?: string }) {
  return <Boxes className={className || "w-5 h-5"} />;
}

function IconStock({ className }: { className?: string }) {
  return <Boxes className={className || "w-5 h-5"} />;
}

function IconCar({ className }: { className?: string }) {
  // Uses Lucide Car icon from dashboard
  return <Car className={className || "w-5 h-5"} />;
}

function IconMotorcycle({ className }: { className?: string }) {
  // Uses Lucide Bike icon from dashboard
  return <Bike className={className || "w-5 h-5"} />;
}

function IconTukTuk({ className }: { className?: string }) {
  return <TukTukIcon className={className || "w-5 h-5"} />;
}

function IconFleet({ className }: { className?: string }) {
  return <Package className={className || "w-5 h-5"} />;
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function getVehicleListScrollSnapshot(): VehicleListScrollSnapshot {
  const scrollContainer =
    typeof document === "undefined"
      ? null
      : document.querySelector<HTMLElement>('[data-app-scroll-container="true"]');

  return {
    scrollX: scrollContainer?.scrollLeft ?? window.scrollX,
    scrollY: scrollContainer?.scrollTop ?? window.scrollY,
  };
}

type SidebarMode = "desktop" | "drawer";
type ActiveSystem = "vms" | "lms" | "sms";

interface SidebarProps {
  user: User;
  onNavigate?: () => void;
  /**
   * When true, enable expensive work (counts fetch + route prefetch).
   * NOTE: mobile drawer should use mode="drawer" for maximum speed.
   */
  isVisible?: boolean;
  /**
   * Used to distinguish desktop sidebar vs mobile drawer (hamburger).
   * Drawer mode should be extremely fast: minimal/zero prefetch and no stats polling.
   */
  mode?: SidebarMode;
}

// NavItem component with flat styling and instant navigation
interface NavItemProps {
  href?: string;
  icon: React.ComponentType<{className?: string}>;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  priority?: "high" | "normal" | "low";
  compact?: boolean;
}


function NavItem({ 
  href,
  icon: Icon, 
  label, 
  active, 
  onClick, 
  count,
  priority = "normal",
  compact = false
}: NavItemProps) {

  return (
    <OptimizedLink
      href={href || "#"}
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-center group",
        compact ? "gap-[clamp(0.65rem,1.7dvh,1rem)]" : "gap-4"
      )}
      priority={priority}
    >

      <div className={cn(
        "flex items-center justify-center transition-all duration-200 ease-out",
        compact
          ? "h-[clamp(2.15rem,6.2dvh,3rem)] w-[clamp(2.15rem,6.2dvh,3rem)] rounded-[clamp(0.75rem,1.8dvh,1rem)]"
          : "h-12 w-12 rounded-2xl",
        active
          ? "bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 shadow-sm text-emerald-600 dark:text-emerald-300"
          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-emerald-600 dark:hover:text-emerald-300"
      )}>
        <Icon className={compact ? "h-[clamp(1rem,2.8dvh,1.5rem)] w-[clamp(1rem,2.8dvh,1.5rem)]" : "h-6 w-6"} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <span className={cn(
          "block truncate whitespace-nowrap font-medium transition-colors duration-200",
          compact ? "text-[clamp(0.78rem,2dvh,0.875rem)]" : "text-sm",
          active ? "text-emerald-600 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-300"
        )}>
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
    </OptimizedLink>
  );
}

// Quick Filter Button Component with instant navigation
interface QuickFilterButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  color: "emerald" | "blue" | "purple" | "orange" | "slate";
  isAddButton?: boolean;
  compact?: boolean;
}

function QuickFilterButton({ 
  icon: Icon, 
  label, 
  count, 
  isActive, 
  onClick, 
  color,
  isAddButton,
  compact = false
}: QuickFilterButtonProps) {
  const colorStyles = {
    emerald: {
      active: "text-emerald-700 dark:text-emerald-300",
      inactive: "text-slate-700 dark:text-slate-300",
      activeBg: "bg-emerald-50 dark:bg-emerald-500/15",
      activeBorder: "border-emerald-200 dark:border-emerald-500/40",
      countBg: "bg-emerald-500 text-white",
    },
    blue: {
      active: "text-blue-700 dark:text-blue-300",
      inactive: "text-slate-700 dark:text-slate-300",
      activeBg: "bg-blue-50 dark:bg-blue-500/15",
      activeBorder: "border-blue-200 dark:border-blue-500/40",
      countBg: "bg-blue-500 text-white",
    },
    purple: {
      active: "text-purple-700 dark:text-purple-300",
      inactive: "text-slate-700 dark:text-slate-300",
      activeBg: "bg-purple-50 dark:bg-purple-500/15",
      activeBorder: "border-purple-200 dark:border-purple-500/40",
      countBg: "bg-purple-500 text-white",
    },
    orange: {
      active: "text-orange-700 dark:text-orange-300",
      inactive: "text-slate-700 dark:text-slate-300",
      activeBg: "bg-orange-50 dark:bg-orange-500/15",
      activeBorder: "border-orange-200 dark:border-orange-500/40",
      countBg: "bg-orange-500 text-white",
    },
    slate: {
      active: "text-slate-700 dark:text-slate-200",
      inactive: "text-slate-500 dark:text-slate-400",
      activeBg: "bg-slate-100 dark:bg-slate-700/70",
      activeBorder: "border-slate-300 dark:border-slate-600",
      countBg: "bg-slate-500 text-white",
    },
  };

  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center justify-between overflow-hidden border shadow-sm transition-colors duration-200",
        compact
          ? "min-h-[clamp(2.75rem,7.7dvh,4.25rem)] rounded-[clamp(1rem,2.4dvh,1rem)] p-[clamp(0.45rem,1.4dvh,0.75rem)]"
          : "rounded-2xl p-3",
        isActive
          ? `${styles.activeBg} ${styles.activeBorder}`
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60"
      )}
    >
      <div className={cn(
        "relative z-10 flex min-w-0 items-center",
        compact ? "gap-[clamp(0.55rem,1.6dvh,0.75rem)]" : "gap-3"
      )}>
        <div className={cn(
          "flex shrink-0 items-center justify-center transition-all duration-300",
          compact
            ? "h-[clamp(2rem,5.8dvh,2.5rem)] w-[clamp(2rem,5.8dvh,2.5rem)] rounded-[clamp(0.75rem,1.8dvh,0.75rem)]"
            : "h-10 w-10 rounded-xl",
          isActive
            ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
            : "bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:bg-white dark:group-hover:bg-slate-800"
        )}>
          {isAddButton ? (
            <span className={cn(
              "font-bold",
              compact ? "text-[clamp(0.95rem,2.6dvh,1.125rem)]" : "text-lg",
              isActive ? styles.active : styles.inactive
            )}>+</span>
          ) : (
            <Icon className={cn(
              "transition-colors duration-300",
              compact ? "h-[clamp(1rem,2.6dvh,1.25rem)] w-[clamp(1rem,2.6dvh,1.25rem)]" : "h-5 w-5",
              isActive ? styles.active : styles.inactive
            )} />
          )}
        </div>
        
        <span className={cn(
          "min-w-0 truncate whitespace-nowrap font-medium transition-colors duration-300",
          compact ? "text-[clamp(0.78rem,2dvh,0.875rem)]" : "text-sm",
          isActive ? styles.active : styles.inactive
        )}>
          {label}
        </span>
      </div>

        {count !== undefined && count > 0 && (
          <span className={cn(
            "relative z-10 shrink-0 rounded-full font-bold shadow-sm",
            styles.countBg,
            compact ? "px-[clamp(0.4rem,1.4dvh,0.5rem)] py-0.5 text-[clamp(0.55rem,1.45dvh,0.625rem)]" : "px-2 py-0.5 text-[10px]"
          )}>
            {count.toLocaleString()}
          </span>
        )}
      </button>
    );
  }


export default function Sidebar({
  user,
  onNavigate,
  isVisible = true,
  mode = "desktop",
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const frameworkSearchText = searchParams?.toString() ?? "";
  const [nativeSearchText, setNativeSearchText] = useState<string | null>(null);
  const activeSearchParams = useMemo(
    () => new URLSearchParams(nativeSearchText ?? frameworkSearchText),
    [frameworkSearchText, nativeSearchText]
  );
  const isIOS =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Drawer mode must be extremely fast: no polling/network work on open.
  // Desktop keeps the previous behavior.
  const isDrawer = mode === "drawer";
  const { stats } = useVehicleStats(isVisible && !isDrawer && !isIOS ? 300000 : 0);

  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const systemsLabel = language === "km" ? "ប្រព័ន្ធ" : "Systems";
  const shortcutsLabel = language === "km" ? "ផ្លូវកាត់" : "Shortcuts";
  const systemLabels = {
    vms: language === "km" ? "VMS - វាយតម្លៃយានយន្ត" : "VMS - Vehicle Valuation",
    lms: language === "km" ? "LMS - មជ្ឈមណ្ឌលសិក្សា" : "LMS - Learning Center",
    sms: language === "km" ? "SMS - បញ្ជីទ្រព្យសម្បត្តិ" : "SMS - Asset Inventory",
  };
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const canViewVehicles = hasAppPermission(user.role, "vehicles:view");
  const canCreateVehicles = hasAppPermission(user.role, "vehicles:create");
  const canViewLms = hasAppPermission(user.role, "lms:view");
  const canManageLms = hasAppPermission(user.role, "lms:manage");
  const canViewSms = hasAppPermission(user.role, "sms:view");
  const canCreateSms = hasAppPermission(user.role, "sms:create");
  const canTransferSms = hasAppPermission(user.role, "sms:transfer");
  const activeCategory = pathname === "/vehicles" ? activeSearchParams.get("category") || "" : "";

  // Route active states
  const isDashboardActive = pathname === "/" || pathname === "/dashboard";
  const isLmsActive = pathname.startsWith("/lms");
  const isAdminLmsActive = pathname.startsWith("/admin/lms");
  const isSmsActive = pathname.startsWith("/sms");
  const activeSystem: ActiveSystem = isLmsActive || isAdminLmsActive ? "lms" : isSmsActive ? "sms" : "vms";
  const isVehiclesActive = pathname === "/vehicles" && (!activeCategory || normalizeCategory(activeCategory) === "all");
  const isCarsActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "cars";

  // Some pages use category labels in different casing (Cars/Car). Treat both as active.
  const isCarsPage = pathname === "/vehicles" && (normalizeCategory(activeCategory) === "cars" || normalizeCategory(activeCategory) === "car");
  const isMotorcyclesActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "motorcycles";
  const isTukTuksActive = pathname === "/vehicles" && (normalizeCategory(activeCategory) === "tuktuks" || isTukTukCategory(activeCategory));
  const isStockActive = pathname.startsWith("/stock");
  const isSettingsActive = pathname === "/settings";
  const isSmsMovementActive = pathname === "/sms/transfer" || pathname === "/sms/return";

  useEffect(() => {
    setPendingHref(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    setNativeSearchText(null);
  }, [frameworkSearchText]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncSearchFromHref = (href: string) => {
      const nextUrl = new URL(href, window.location.origin);
      if (nextUrl.pathname === "/vehicles") {
        setNativeSearchText(nextUrl.search.slice(1));
      }
    };

    const handleVehicleListUrlChange = (event: Event) => {
      const detail = (event as CustomEvent<{ href?: string }>).detail;
      syncSearchFromHref(detail?.href ?? `${window.location.pathname}${window.location.search}`);
    };

    const handlePopState = () => {
      syncSearchFromHref(`${window.location.pathname}${window.location.search}`);
    };

    window.addEventListener(VEHICLE_LIST_URL_CHANGE_EVENT, handleVehicleListUrlChange);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(VEHICLE_LIST_URL_CHANGE_EVENT, handleVehicleListUrlChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const sidebarRoutes = useMemo(
    () => {
      const routes: string[] = ["/settings"];

      if (canViewVehicles) {
        routes.push(
          "/",
          VEHICLE_LIST_ALL_HREF,
          "/vehicles?category=cars",
          "/vehicles?category=motorcycles",
          "/vehicles?category=tuktuks"
        );
      }

      if (canViewLms) {
        routes.push("/lms");
      }

      if (canManageLms) {
        routes.push("/lms/admin/categories", "/lms/admin/lessons", "/lms/admin/staff");
      }

      if (canViewSms) {
        routes.push("/sms", "/sms/assets", "/sms/history");
      }

      if (canTransferSms) {
        routes.push("/sms/transfer", "/sms/pending");
      }

      return routes;
    },
    [canManageLms, canTransferSms, canViewLms, canViewSms, canViewVehicles]
  );

  // Safe prefetch with fallback for iOS Safari
  // Drawer mode must be fast: disable any prefetch work when mode="drawer".
  useEffect(() => {
    if (!isVisible) return;
    if (mode === "drawer") return;

    const isIOS =
      typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

    // iOS Safari crash/reload loop observed with aggressive prefetching.
    if (isIOS) return;

    const prefetchRoutes = () => {
      sidebarRoutes.forEach((href, index) => {
        globalThis.setTimeout(() => router.prefetch(href), index * 60);
      });
    };

    const t = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        try {
          window.requestIdleCallback(prefetchRoutes, { timeout: 1500 });
        } catch {
          globalThis.setTimeout(prefetchRoutes, 500);
        }
      } else {
        globalThis.setTimeout(prefetchRoutes, 500);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [router, sidebarRoutes, isVisible, mode]);

  const handleNavigate = useCallback((href: string) => {
    // Do not block navigation based on pathname/search param equality.
    // In this app, quick-filter navigation frequently updates only query params,
    // and blocking based on a potentially stale comparison can prevent state from clearing/setting.
    if (href === "/vehicles" || href === VEHICLE_LIST_ALL_HREF) {
      clearStoredVehicleListState();
    }

    setPendingHref(href);

    onNavigate?.();

    try {
      startTransition(() => {
        if (pathname === "/vehicles" && href.startsWith("/vehicles")) {
          const nextUrl = new URL(href, window.location.origin);
          const nextHref = `${nextUrl.pathname}${nextUrl.search}`;
          const currentHref = `${window.location.pathname}${window.location.search}`;
          const scrollSnapshot = getVehicleListScrollSnapshot();

          rememberVehicleListScrollSnapshot(currentHref, scrollSnapshot);
          rememberVehicleListScrollSnapshot(nextHref, scrollSnapshot);
          window.history.pushState(window.history.state, "", nextHref);
          window.dispatchEvent(
            new CustomEvent(VEHICLE_LIST_URL_CHANGE_EVENT, {
              detail: { href: nextHref, scrollSnapshot },
            })
          );
        } else {
          router.push(href);
        }
        // Clear immediately so another Quick Filter click never gets blocked.
        setPendingHref(null);
      });
    } catch (navError) {
      console.error('[Sidebar] Navigation error:', navError);
      setPendingHref(null);
      window.location.href = href;
    }
  }, [onNavigate, router, pathname]);

  const handleLinkClick = useCallback((href: string) => {
    setPendingHref(href);
    onNavigate?.();
  }, [onNavigate]);

  const isPendingActive = useCallback((href: string) => pendingHref === href, [pendingHref]);

  // Get counts (may be 0 while drawer isn't visible yet)
  const allVehiclesCount = stats?.total ?? 0;
  const carsCount = stats?.byCategory?.Cars ?? 0;
  const motorcyclesCount = stats?.byCategory?.Motorcycles ?? 0;
  const tukTuksCount = stats?.byCategory?.TukTuks ?? 0;


  return (
    <aside
      className={cn(
        "relative z-[50] flex flex-col border-r border-slate-200 bg-slate-100 shadow-sm print:hidden dark:border-slate-800 dark:bg-slate-900",
        isDrawer ? "h-dvh max-h-dvh w-full max-w-[85vw] overflow-hidden" : "h-screen w-[280px] overflow-y-auto"
      )}
    >
      {/* Header */}
      <div className={isDrawer ? "px-5 pb-[clamp(0.25rem,1dvh,1rem)] pt-[clamp(0.55rem,1.8dvh,1.5rem)]" : "p-6 pb-4"}>
        <div className={cn("flex items-center", isDrawer ? "gap-[clamp(0.65rem,1.7dvh,1rem)]" : "gap-4")}>
          <div className={cn(
            "flex shrink-0 items-center justify-center border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-white",
            isDrawer
              ? "h-[clamp(2.25rem,6.4dvh,3.5rem)] w-[clamp(2.25rem,6.4dvh,3.5rem)] rounded-[clamp(0.8rem,2dvh,1rem)]"
              : "h-14 w-14 rounded-2xl"
          )}>
            <Image
              src="/logo.png"
              alt="Emerald Cash"
              width={40}
              height={40}
              className={isDrawer ? "h-[clamp(1.55rem,4.6dvh,2.5rem)] w-[clamp(1.55rem,4.6dvh,2.5rem)] object-contain" : "h-10 w-10 object-contain"}
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className={cn(
              "truncate font-bold leading-tight text-slate-800 dark:text-slate-100",
              isDrawer ? "text-[clamp(0.95rem,2.3dvh,1.125rem)]" : "text-lg"
            )}>Emerald Cash</h1>
            <span className={cn(
              "inline-flex rounded-full bg-emerald-500 px-2 py-0.5 font-medium leading-none text-white",
              isDrawer ? "text-[clamp(0.6rem,1.55dvh,0.75rem)]" : "text-xs"
            )}>{systemsLabel}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          isDrawer
            ? "gap-[clamp(0.45rem,1.25dvh,1rem)] overflow-y-auto overscroll-contain px-5 py-[clamp(0.2rem,0.8dvh,1rem)]"
            : "gap-6 px-6 py-4"
        )}
        aria-label="Main navigation"
      >
        {/* Systems */}
        <div className={cn("flex flex-col", isDrawer ? "gap-[clamp(0.25rem,0.9dvh,1rem)]" : "gap-4")}>
          <h2 className={cn(
            "px-2 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400",
            isDrawer ? "mb-[clamp(0.1rem,0.45dvh,0.5rem)] text-[clamp(0.58rem,1.45dvh,0.75rem)]" : "text-xs"
          )}>
            {systemsLabel}
          </h2>
          {canViewVehicles && (
            <NavItem
              href="/"
              icon={IconDashboard}
              label={systemLabels.vms}
              active={isDashboardActive || isPendingActive("/")}
              onClick={() => handleLinkClick("/")}
              priority="high"
              compact={isDrawer}
            />
          )}
          {canViewLms && (
            <NavItem
              href="/lms"
              icon={IconLms}
              label={systemLabels.lms}
              active={isLmsActive || isAdminLmsActive || isPendingActive("/lms")}
              onClick={() => handleLinkClick("/lms")}
              priority="high"
              compact={isDrawer}
            />
          )}

          {canViewSms && (
            <NavItem
              href="/sms"
              icon={IconSms}
              label={systemLabels.sms}
              active={isSmsActive || isPendingActive("/sms")}
              onClick={() => handleLinkClick("/sms")}
              priority="high"
              compact={isDrawer}
            />
          )}



        </div>

        {/* Context Shortcuts */}
        <div className={isDrawer ? "px-[clamp(0.15rem,1dvh,1rem)] py-[clamp(0.25rem,1.1dvh,1.5rem)]" : "px-4 py-6"}>
          <h2 className={cn(
            "px-2 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400",
            isDrawer ? "mb-[clamp(0.25rem,0.9dvh,1rem)] text-[clamp(0.58rem,1.45dvh,0.75rem)]" : "mb-4 text-xs"
          )}>
            {shortcutsLabel}
          </h2>
          
          <div className={cn("flex flex-col", isDrawer ? "gap-[clamp(0.35rem,1.15dvh,0.75rem)]" : "gap-3")}>
            {activeSystem === "vms" && canViewVehicles && (
              <>
                <QuickFilterButton
                  icon={IconFleet}
                  label={t.vehicles}
                  count={allVehiclesCount}
                  isActive={isVehiclesActive || isPendingActive("/vehicles") || isPendingActive(VEHICLE_LIST_ALL_HREF)}
                  onClick={() => handleNavigate(VEHICLE_LIST_ALL_HREF)}
                  color="emerald"
                  compact={isDrawer}
                />
                <QuickFilterButton
                  icon={IconCar}
                  label={language === 'km' ? 'រថយន្ត' : 'Cars'}
                  count={carsCount}
                  isActive={isCarsActive || isPendingActive("/vehicles?category=cars")}
                  onClick={() => handleNavigate("/vehicles?category=cars")}
                  color="blue"
                  compact={isDrawer}
                />
                <QuickFilterButton
                  icon={IconMotorcycle}
                  label={language === 'km' ? 'ម៉ូតូ' : 'Motorcycles'}
                  count={motorcyclesCount}
                  isActive={isMotorcyclesActive || isPendingActive("/vehicles?category=motorcycles")}
                  onClick={() => handleNavigate("/vehicles?category=motorcycles")}
                  color="purple"
                  compact={isDrawer}
                />
                <QuickFilterButton
                  icon={IconTukTuk}
                  label={language === 'km' ? 'កង់បី' : 'TukTuks'}
                  count={tukTuksCount}
                  isActive={isTukTuksActive || isPendingActive("/vehicles?category=tuktuks")}
                  onClick={() => handleNavigate("/vehicles?category=tuktuks")}
                  color="orange"
                  compact={isDrawer}
                />
                {canCreateVehicles && (
                  <button
                    onClick={() => {
                      if (pathname !== "/vehicles") {
                        handleNavigate(VEHICLE_LIST_ALL_HREF);
                        window.setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('openAddVehicleModal'));
                        }, 120);
                      } else {
                        window.dispatchEvent(new CustomEvent('openAddVehicleModal'));
                        onNavigate?.();
                      }
                    }}
                    className={cn(
                      "group relative flex w-full items-center justify-between overflow-hidden border border-slate-200 bg-white shadow-sm transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60",
                      isDrawer
                        ? "min-h-[clamp(2.75rem,7.7dvh,4.25rem)] rounded-[clamp(1rem,2.4dvh,1rem)] p-[clamp(0.45rem,1.4dvh,0.75rem)]"
                        : "rounded-2xl p-3"
                    )}
                  >
                    <div className={cn(
                      "relative z-10 flex min-w-0 items-center",
                      isDrawer ? "gap-[clamp(0.55rem,1.6dvh,0.75rem)]" : "gap-3"
                    )}>
                      <div className={cn(
                        "flex shrink-0 items-center justify-center border border-slate-200 bg-slate-50 shadow-sm group-hover:bg-white dark:border-slate-700 dark:bg-slate-700/60 dark:group-hover:bg-slate-800",
                        isDrawer
                          ? "h-[clamp(2rem,5.8dvh,2.5rem)] w-[clamp(2rem,5.8dvh,2.5rem)] rounded-[clamp(0.75rem,1.8dvh,0.75rem)]"
                          : "h-10 w-10 rounded-xl"
                      )}>
                        <span className={cn(
                          "font-bold text-slate-700 dark:text-slate-200",
                          isDrawer ? "text-[clamp(0.95rem,2.6dvh,1.125rem)]" : "text-lg"
                        )}>+</span>
                      </div>
                      <span className={cn(
                        "min-w-0 truncate whitespace-nowrap font-medium text-slate-700 dark:text-slate-300",
                        isDrawer ? "text-[clamp(0.78rem,2dvh,0.875rem)]" : "text-sm"
                      )}>
                        {language === 'km' ? 'បន្ថែមយានយន្ត' : 'Add Vehicle'}
                      </span>
                    </div>
                  </button>
                )}
              </>
            )}

            {activeSystem === "lms" && canViewLms && (
              <>
                <QuickFilterButton
                  icon={BookOpen}
                  label={language === 'km' ? 'ការសិក្សារបស់ខ្ញុំ' : 'My Learning'}
                  isActive={pathname === "/lms" || isPendingActive("/lms")}
                  onClick={() => handleNavigate("/lms")}
                  color="emerald"
                  compact={isDrawer}
                />
                {canManageLms && (
                  <>
                    <QuickFilterButton
                      icon={PlayCircle}
                      label={language === 'km' ? 'គ្រប់គ្រងមាតិកា' : 'Content Manager'}
                      isActive={pathname === "/lms/admin/categories" || pathname === "/lms/admin/lessons" || isPendingActive("/lms/admin/categories") || isPendingActive("/lms/admin/lessons")}
                      onClick={() => handleNavigate("/lms/admin/categories")}
                      color="purple"
                      compact={isDrawer}
                    />
                    <QuickFilterButton
                      icon={Users}
                      label={language === 'km' ? 'តាមដានបុគ្គលិក' : 'Staff Tracking'}
                      isActive={pathname === "/lms/admin/staff" || isPendingActive("/lms/admin/staff")}
                      onClick={() => handleNavigate("/lms/admin/staff")}
                      color="purple"
                      compact={isDrawer}
                    />
                  </>
                )}
              </>
            )}

            {activeSystem === "sms" && canViewSms && (
              <>
                <QuickFilterButton
                  icon={IconStock}
                  label={language === 'km' ? 'ទ្រព្យសម្បត្តិ' : 'Assets'}
                  isActive={pathname.startsWith("/sms/assets") || isPendingActive("/sms/assets")}
                  onClick={() => handleNavigate("/sms/assets")}
                  color="emerald"
                  compact={isDrawer}
                />
                {canTransferSms && (
                  <>
                    <QuickFilterButton
                      icon={ArrowLeftRight}
                      label={language === 'km' ? 'ផ្លាស់ទីទ្រព្យ' : 'Asset Movement'}
                      isActive={isSmsMovementActive || isPendingActive("/sms/transfer")}
                      onClick={() => handleNavigate("/sms/transfer")}
                      color="blue"
                      compact={isDrawer}
                    />
                    <QuickFilterButton
                      icon={Clock}
                      label={language === 'km' ? 'សំណើផ្ទេរ' : 'Transfer Requests'}
                      isActive={pathname === "/sms/pending" || isPendingActive("/sms/pending")}
                      onClick={() => handleNavigate("/sms/pending")}
                      color="purple"
                      compact={isDrawer}
                    />
                  </>
                )}
                <QuickFilterButton
                  icon={History}
                  label={language === 'km' ? 'ប្រវត្តិចលនា' : 'Movement History'}
                  isActive={pathname === "/sms/history" || isPendingActive("/sms/history")}
                  onClick={() => handleNavigate("/sms/history")}
                  color="orange"
                  compact={isDrawer}
                />
                {canCreateSms && (
                  <QuickFilterButton
                    icon={IconStock}
                    label={language === 'km' ? 'បង្កើតទ្រព្យថ្មី' : 'New Asset'}
                    isActive={pathname === "/sms/assets" && searchParams.get("action") === "new"}
                    onClick={() => handleNavigate("/sms/assets?action=new")}
                    color="slate"
                    isAddButton
                    compact={isDrawer}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="mt-auto">
          <NavItem
            href="/settings"
            icon={IconSettings}
            label={t.settings}
            active={isSettingsActive || isPendingActive("/settings")}
            onClick={() => handleLinkClick("/settings")}
            priority="high"
            compact={isDrawer}
          />

        </div>
      </nav> 

      {/* Footer */}
      <div className={isDrawer ? "px-5 pb-[clamp(0.45rem,1.4dvh,1.5rem)] pt-[clamp(0.15rem,0.7dvh,1rem)]" : "p-6 pt-4"}>
        <div className={cn(
          "truncate text-center text-slate-500 dark:text-slate-400",
          isDrawer ? "text-[clamp(0.55rem,1.35dvh,0.75rem)]" : "text-xs"
        )}>
          {language === 'km' ? '© ២០២៥ អេមើរ៉ល ឃែស' : '© 2025 Emerald Cash'}
        </div>
      </div>
    </aside>
  );
}
