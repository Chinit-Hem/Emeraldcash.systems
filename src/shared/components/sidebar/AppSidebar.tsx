"use client";

import type { User } from "@/shared/types/types";
import { MotionConfig, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  BookOpen,
  Boxes,
  Bike,
  Car,
  ClipboardList,
  Clock3,
  FolderOpen,
  Home,
  History,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Package,
  RotateCcw,
  Settings,
  Send,
  ShieldCheck,
  Sun,
  Truck,
  Users,
  UserRound,
} from "lucide-react";
import { MoneyBagIcon } from "@/shared/components/icons/MoneyBagIcon";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/shared/hooks/theme-provider";
import { hasAppPermission } from "@/shared/utils/permissions";
import { cn } from "@/shared/utils/ui";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import Image from "next/image";
import { SidebarCollapseButton } from "./SidebarCollapseButton";
import { SidebarFavorites } from "./SidebarFavorites";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarRecent } from "./SidebarRecent";
import { SidebarSystemItem } from "./SidebarSystemItem";
import { SidebarTooltip } from "./SidebarTooltip";
import type { SidebarMode, SidebarNavigationItem } from "./types";

const SIDEBAR_RECENT_KEY = "emerald-cash.sidebar.recent.v1";
const FAVORITE_HREFS = ["/home", "/vms", "/lms", "/sms/dashboard", "/loan", "/hr"];

export type AppSidebarProps = {
  user: User;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  onLogout?: () => void;
  mode?: SidebarMode;
};

function isRouteActive(id: string, pathname: string, search: URLSearchParams) {
  if (id === "dashboard") return pathname === "/dashboard";
  if (id === "home") return pathname === "/" || pathname === "/home" || pathname === "/system-hub";
  if (id === "vehicle-management") return pathname === "/vms" || pathname.startsWith("/vms/") || pathname === "/vehicles" || pathname.startsWith("/vehicles/") || pathname.startsWith("/stock") || pathname.startsWith("/cleaned-vehicles");
  if (id === "vehicle-all") return pathname === "/vehicles" && !search.get("category");
  if (id === "vehicle-cars") return pathname === "/vehicles" && search.get("category")?.toLowerCase() === "cars";
  if (id === "vehicle-motorcycles") return pathname === "/vehicles" && search.get("category")?.toLowerCase() === "motorcycles";
  if (id === "vehicle-tuktuks") return pathname === "/vehicles" && search.get("category")?.toLowerCase() === "tuktuks";
  if (id === "learning-center") return pathname.startsWith("/lms") || pathname.startsWith("/admin/lms");
  if (id === "lms-categories") return pathname === "/lms/admin/categories";
  if (id === "lms-lessons") return pathname === "/lms/admin/lessons";
  if (id === "lms-staff") return pathname === "/lms/admin/staff" || pathname === "/lms/admin/unified-staff";
  if (id === "asset-inventory") return pathname.startsWith("/sms");
  if (id === "sms-assets") return pathname === "/sms" || pathname === "/sms/dashboard" || pathname === "/sms/assets" || pathname.startsWith("/sms/assets/");
  if (id === "sms-transfer") return pathname === "/sms/transfer";
  if (id === "sms-return") return pathname === "/sms/return";
  if (id === "sms-pending") return pathname === "/sms/pending";
  if (id === "sms-history") return pathname === "/sms/history";
  if (id === "loan-management") return pathname === "/loan" || pathname.startsWith("/loan/");
  if (id === "loan-portfolio") return pathname === "/loan" && !["borrowers", "contacts", "accounting", "operationReport", "journalItems"].includes(search.get("view") || "");
  if (id === "loan-borrowers") return pathname === "/loan" && search.get("view") === "borrowers";
  if (id === "loan-contacts") return pathname === "/loan" && search.get("view") === "contacts";
  if (id === "loan-accounting") return pathname === "/loan" && search.get("view") === "accounting";
  if (id === "loan-operation-report") return pathname === "/loan" && search.get("view") === "operationReport";
  if (id === "human-resources") return pathname === "/hr" || pathname.startsWith("/hr/");
  if (id === "monitoring") return pathname === "/system-health" || pathname === "/alerts" || pathname === "/audit-logs";
  if (id === "administration") return pathname.startsWith("/admin/") || pathname === "/settings";
  if (id === "system-health") return pathname === "/system-health";
  if (id === "notifications") return pathname === "/alerts";
  if (id === "audit-logs") return pathname === "/audit-logs";
  if (id === "users") return pathname === "/settings" && search.get("tab") === "users";
  if (id === "roles") return pathname === "/admin/roles";
  if (id === "permissions") return pathname === "/admin/permissions";
  if (id === "settings") return pathname === "/settings";
  return false;
}

type VehicleShortcutCounts = {
  total?: number;
  Cars?: number;
  Motorcycles?: number;
  TukTuks?: number;
};

function formatCount(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString() : undefined;
}

function useVehicleShortcutCounts(user: User) {
  const canViewVehicles = hasAppPermission(user.role, "vehicles:view");
  const [counts, setCounts] = useState<VehicleShortcutCounts>({});

  const refresh = useCallback(async () => {
    if (!canViewVehicles) {
      setCounts({});
      return;
    }

    try {
      const response = await fetch("/api/vehicles/stats", { credentials: "include", cache: "no-store" });
      if (!response.ok) return;

      const payload = await response.json() as {
        data?: { total?: number; byCategory?: Partial<VehicleShortcutCounts> };
      };
      const byCategory = payload.data?.byCategory ?? {};
      setCounts({
        total: typeof payload.data?.total === "number" ? payload.data.total : undefined,
        Cars: typeof byCategory.Cars === "number" ? byCategory.Cars : undefined,
        Motorcycles: typeof byCategory.Motorcycles === "number" ? byCategory.Motorcycles : undefined,
        TukTuks: typeof byCategory.TukTuks === "number" ? byCategory.TukTuks : undefined,
      });
    } catch {
      // The menu remains usable when statistics are temporarily unavailable.
    }
  }, [canViewVehicles]);

  useEffect(() => {
    void refresh();

    const handleVehicleUpdate = () => {
      void refresh();
    };
    window.addEventListener("vms-vehicles-updated", handleVehicleUpdate);
    return () => window.removeEventListener("vms-vehicles-updated", handleVehicleUpdate);
  }, [refresh]);

  return counts;
}

function readRecentHrefs() {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(SIDEBAR_RECENT_KEY) ?? "null");
    if (!Array.isArray(value) || !value.every((href) => typeof href === "string")) {
      return [];
    }

    return value.slice(0, 5);
  } catch {
    return [];
  }
}

function flattenNavigationItems(items: SidebarNavigationItem[]): SidebarNavigationItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavigationItems(item.children) : [])]);
}

export function getNavigationItems(
  user: User,
  pathname: string,
  search: URLSearchParams,
  language: string,
  vehicleCounts: VehicleShortcutCounts
): SidebarNavigationItem[] {
  const label = (en: string, km: string) => (language === "km" ? km : en);
  const item = (
    id: string,
    en: string,
    km: string,
    href: string,
    icon: SidebarNavigationItem["icon"],
    options: Pick<SidebarNavigationItem, "badge" | "children"> = {}
  ): SidebarNavigationItem => ({
    id,
    label: label(en, km),
    href,
    icon,
    active: isRouteActive(id, pathname, search),
    ...options,
  });

  const workspaceModules: SidebarNavigationItem[] = [
    item("home", "System Hub", "មជ្ឈមណ្ឌលប្រព័ន្ធ", "/home", Home, {
      children: [item("dashboard", "Overview", "ទិដ្ឋភាពទូទៅ", "/dashboard", LayoutDashboard)],
    }),
  ];
  if (hasAppPermission(user.role, "vehicles:view")) {
    workspaceModules.push(item("vehicle-management", "Vehicle Management", "គ្រប់គ្រងយានយន្ត", "/vms", Car, {
      children: [
        item("vehicle-all", "Vehicles", "យានយន្ត", "/vehicles", Package, { badge: formatCount(vehicleCounts.total) }),
        item("vehicle-cars", "Cars", "រថយន្ត", "/vehicles?category=cars", Car, { badge: formatCount(vehicleCounts.Cars) }),
        item("vehicle-motorcycles", "Motorcycles", "ម៉ូតូ", "/vehicles?category=motorcycles", Bike, { badge: formatCount(vehicleCounts.Motorcycles) }),
        item("vehicle-tuktuks", "TukTuks", "តុកតុក", "/vehicles?category=tuktuks", Truck, { badge: formatCount(vehicleCounts.TukTuks) }),
      ],
    }));
  }
  if (hasAppPermission(user.role, "lms:view")) {
    const lmsChildren: SidebarNavigationItem[] = [];
    if (hasAppPermission(user.role, "lms:manage")) {
      lmsChildren.push(
        item("lms-categories", "Categories", "ប្រភេទមេរៀន", "/lms/admin/categories", FolderOpen),
        item("lms-lessons", "Lessons", "មេរៀន", "/lms/admin/lessons", BookOpen),
        item("lms-staff", "Staff Progress", "វឌ្ឍនភាពបុគ្គលិក", "/lms/admin/staff", Users),
      );
    }
    workspaceModules.push(item("learning-center", "Learning Center", "មជ្ឈមណ្ឌលសិក្សា", "/lms", BookOpen, { children: lmsChildren }));
  }
  if (hasAppPermission(user.role, "sms:view")) {
    const smsChildren: SidebarNavigationItem[] = [
      item("sms-assets", "Assets", "ទ្រព្យសម្បត្តិ", "/sms/assets", Boxes),
    ];
    if (hasAppPermission(user.role, "sms:transfer")) {
      smsChildren.push(
        item("sms-transfer", "Send Asset", "ផ្ញើទ្រព្យសម្បត្តិ", "/sms/transfer", Send),
        item("sms-return", "Return Asset", "ប្រគល់ទ្រព្យសម្បត្តិ", "/sms/return", RotateCcw),
        item("sms-pending", "Pending Transfers", "ការផ្ទេររង់ចាំ", "/sms/pending", Clock3),
      );
    }
    smsChildren.push(item("sms-history", "Transfer History", "ប្រវត្តិការផ្ទេរ", "/sms/history", History));
    workspaceModules.push(item("asset-inventory", "Asset Inventory", "សារពើភ័ណ្ឌទ្រព្យសម្បត្តិ", "/sms/dashboard", Boxes, { children: smsChildren }));
  }
  if (hasAppPermission(user.role, "loans:view")) {
    workspaceModules.push(item("loan-management", "Loan Management", "គ្រប់គ្រងប្រាក់កម្ចី", "/loan", MoneyBagIcon, {
      children: [
        item("loan-portfolio", "Portfolio", "បញ្ជីប្រាក់កម្ចី", "/loan", LayoutDashboard),
        item("loan-borrowers", "Borrowers", "អតិថិជនខ្ចីប្រាក់", "/loan?view=borrowers", Users),
        item("loan-contacts", "Contacts", "ទំនាក់ទំនង", "/loan?view=contacts", UserRound),
        item("loan-accounting", "Accounting", "គណនេយ្យ", "/loan?view=accounting", Landmark),
        item("loan-operation-report", "Operation Report", "របាយការណ៍ប្រតិបត្តិការ", "/loan?view=operationReport", ClipboardList),
      ],
    }));
  } else {
    // Operation reporting is a company-wide workspace. Loan records remain
    // protected separately by the loan permissions and API authorization.
    workspaceModules.push(item("loan-operation-report", "Operation Report", "របាយការណ៍ប្រតិបត្តិការ", "/loan?view=operationReport", ClipboardList));
  }
  if (hasAppPermission(user.role, "settings:view")) {
    workspaceModules.push(item("human-resources", "Human Resources", "ធនធានមនុស្ស", "/hr", Users));
  }

  const administration: SidebarNavigationItem[] = [];
  if (hasAppPermission(user.role, "users:view")) administration.push(item("users", "Users", "អ្នកប្រើប្រាស់", "/settings?tab=users", Users));
  if (hasAppPermission(user.role, "roles:manage")) administration.push(item("roles", "Roles", "តួនាទី", "/admin/roles", UserRound));
  if (hasAppPermission(user.role, "roles:manage")) administration.push(item("permissions", "Permissions", "ការអនុញ្ញាត", "/admin/permissions", KeyRound));
  if (hasAppPermission(user.role, "settings:view")) administration.push(item("settings", "Settings", "ការកំណត់", "/settings", Settings));

  workspaceModules.push(
    item("monitoring", "Monitoring", "ការត្រួតពិនិត្យ", "/system-health", Activity, {
      children: [
        item("system-health", "System Health", "សុខភាពប្រព័ន្ធ", "/system-health", ShieldCheck),
        item("notifications", "Notifications", "ការជូនដំណឹង", "/alerts", LifeBuoy),
        item("audit-logs", "Audit Logs", "កំណត់ហេតុអធិការកិច្ច", "/audit-logs", ClipboardList),
      ],
    }),
  );
  if (administration.length > 0) {
    workspaceModules.push(item("administration", "Administration", "ការគ្រប់គ្រង", "/admin/users", ShieldCheck, { children: administration }));
  }

  return workspaceModules;
}

export function AppSidebar({ user, collapsed = false, onToggleCollapse, onNavigate, onLogout, mode = "desktop" }: AppSidebarProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDrawer = mode === "drawer";
  const isCollapsed = isDrawer ? false : collapsed;
  const vehicleCounts = useVehicleShortcutCounts(user);
  const workspaceModules = useMemo(
    () => getNavigationItems(user, pathname, searchParams, language, vehicleCounts),
    [language, pathname, searchParams, user, vehicleCounts]
  );
  const allItems = useMemo(() => flattenNavigationItems(workspaceModules), [workspaceModules]);
  const currentRoute = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const [recentHrefs, setRecentHrefs] = useState<string[]>(readRecentHrefs);
  const activeExpandableId = workspaceModules.find((item) => item.active && item.children?.length)?.id ?? null;
  const [expandedQuickItem, setExpandedQuickItem] = useState<string | null>(activeExpandableId);
  const [isCollapsedHeaderMenuVisible, setIsCollapsedHeaderMenuVisible] = useState(false);

  useEffect(() => {
    if (activeExpandableId) setExpandedQuickItem(activeExpandableId);
  }, [activeExpandableId]);

  useEffect(() => {
    const activeItem = allItems.find((item) => item.active && !item.children?.length) ?? allItems.find((item) => item.active);
    if (!activeItem) return;

    const next = [activeItem.href, ...recentHrefs.filter((href) => href !== activeItem.href)].slice(0, 5);
    const unchanged = next.length === recentHrefs.length && next.every((href, index) => href === recentHrefs[index]);
    if (unchanged) return;

    setRecentHrefs(next);
    try {
      window.localStorage.setItem(SIDEBAR_RECENT_KEY, JSON.stringify(next));
    } catch {
      // Storage may be disabled in private browsing; navigation remains usable.
    }
  }, [allItems, currentRoute, recentHrefs]);

  const topLevelItemByHref = useMemo(() => new Map(workspaceModules.map((item) => [item.href, item])), [workspaceModules]);
  const itemByHref = useMemo(() => new Map(allItems.map((item) => [item.href, item])), [allItems]);
  const favoriteItems = useMemo(
    () => FAVORITE_HREFS.map((href) => topLevelItemByHref.get(href)).filter((item): item is SidebarNavigationItem => Boolean(item)),
    [topLevelItemByHref]
  );
  const recentItems = useMemo(
    () => {
      const favoriteHrefs = new Set(favoriteItems.map((item) => item.href));
      return recentHrefs
        .map((href) => itemByHref.get(href))
        .filter((item): item is SidebarNavigationItem => item !== undefined && !favoriteHrefs.has(item.href))
        .slice(0, 4);
    },
    [favoriteItems, itemByHref, recentHrefs]
  );
  const railItems = useMemo(() => {
    const homeItem = workspaceModules.find((item) => item.id === "home");
    const dashboardItem = homeItem?.children?.find((item) => item.id === "dashboard");
    const firstItem = pathname === "/dashboard" ? dashboardItem : homeItem;
    const primaryIds = new Set([
      "vehicle-management",
      "learning-center",
      "asset-inventory",
      "loan-management",
      "human-resources",
    ]);
    const utilityIds = new Set(["monitoring", "administration"]);

    return {
      primary: [
        firstItem,
        ...workspaceModules.filter((item) => primaryIds.has(item.id)),
      ].filter((item): item is SidebarNavigationItem => Boolean(item)),
      utility: workspaceModules.filter((item) => utilityIds.has(item.id)),
    };
  }, [pathname, workspaceModules]);

  const handleNavigate = useCallback((href: string) => {
    if (href !== "#") onNavigate?.();
  }, [onNavigate]);

  const toggleQuickItem = useCallback((id: string) => {
    setExpandedQuickItem((current) => (current === id ? null : id));
  }, []);

  const themeLabel = resolvedTheme === "dark" ? "Light mode" : "Dark mode";
  const ThemeIcon = resolvedTheme === "dark" ? Sun : Moon;
  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        isCollapsed && "h-12 min-h-12 justify-center rounded-2xl px-0"
      )}
      aria-label={themeLabel}
    >
      <ThemeIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className={isCollapsed ? "sr-only" : ""}>{themeLabel}</span>
    </button>
  );
  const logoutButton = onLogout ? (
    <button
      type="button"
      onClick={onLogout}
      className="flex h-12 w-full items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
      aria-label="Log out"
    >
      <LogOut className="h-5 w-5" aria-hidden="true" />
    </button>
  ) : null;

  return (
    <MotionConfig reducedMotion="user">
      <motion.aside
        initial={false}
        animate={{ width: isDrawer ? "100%" : isCollapsed ? 84 : 280 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={cn(
          "flex h-full min-h-0 w-full shrink-0 flex-col border-r border-slate-200 bg-white text-slate-900 print:hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
          isCollapsed && !isDrawer ? "overflow-visible" : "overflow-hidden",
          isDrawer ? "max-w-full" : "shadow-[1px_0_0_rgba(15,23,42,0.02)]"
        )}
        aria-label="Main navigation"
        data-sidebar-collapsed={isCollapsed}
      >
        <header className={cn("relative flex h-16 shrink-0 items-center border-b border-slate-200 px-4 dark:border-slate-800", isCollapsed && "h-20 justify-center px-1")}>
          {isCollapsed && !isDrawer && onToggleCollapse ? (
            <button
              type="button"
              aria-label="Show menu"
              aria-expanded={false}
              onClick={onToggleCollapse}
              onMouseEnter={() => setIsCollapsedHeaderMenuVisible(true)}
              onMouseLeave={() => setIsCollapsedHeaderMenuVisible(false)}
              onFocus={() => setIsCollapsedHeaderMenuVisible(true)}
              onBlur={() => setIsCollapsedHeaderMenuVisible(false)}
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl outline-none transition-colors duration-150 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
            >
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-all duration-200 motion-reduce:transition-none",
                  isCollapsedHeaderMenuVisible ? "scale-95 opacity-0" : "scale-100 opacity-100"
                )}
                aria-hidden={isCollapsedHeaderMenuVisible}
              >
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-500/20">
                  <Image src="/logo.png" alt="Emerald Cash logo" width={42} height={42} className="h-10 w-10 object-contain" priority />
                </span>
              </span>
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                  isCollapsedHeaderMenuVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                )}
                aria-hidden={!isCollapsedHeaderMenuVisible}
              >
                <Menu className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
              </span>
            </button>
          ) : (
            <Link
              href="/home"
              aria-label="System Hub"
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-500/20">
                <Image src="/logo.png" alt="Emerald Cash logo" width={42} height={42} className="h-10 w-10 object-contain" priority />
              </div>
              <div className="min-w-0">
                <p id="mobile-navigation-title" className="truncate text-sm font-bold text-slate-950 dark:text-white">Emerald Cash</p>
                <p className="truncate text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">Unified Systems</p>
              </div>
            </Link>
          )}
          {!isDrawer && onToggleCollapse && !isCollapsed ? (
            <SidebarCollapseButton
              collapsed={isCollapsed}
              onClick={onToggleCollapse}
            />
          ) : null}
        </header>

        <nav className={cn("min-h-0 flex-1 px-3 py-4", isCollapsed ? "overflow-visible" : "space-y-4 overflow-y-auto overflow-x-visible")} aria-label="Workspace navigation">
          {isCollapsed && !isDrawer ? (
            <div className="flex min-h-full flex-col gap-3">
              <div className="space-y-2">
                {railItems.primary.map((item) => (
                  <SidebarSystemItem key={item.id} item={item} collapsed onNavigate={handleNavigate} />
                ))}
              </div>
              <div className="mt-auto space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {railItems.utility.map((item) => (
                  <SidebarSystemItem key={item.id} item={item} collapsed onNavigate={handleNavigate} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <SidebarFavorites
                items={favoriteItems}
                collapsed={isCollapsed}
                expandedItemId={expandedQuickItem}
                onToggleItem={toggleQuickItem}
                onNavigate={handleNavigate}
              />
              <SidebarRecent
                items={recentItems}
                collapsed={isCollapsed}
                expandedItemId={expandedQuickItem}
                onToggleItem={toggleQuickItem}
                onNavigate={handleNavigate}
              />
            </>
          )}
        </nav>

        {isCollapsed && !isDrawer ? (
          <footer className="space-y-2 border-t border-slate-200 p-2 dark:border-slate-800">
            <SidebarTooltip label={themeLabel}>{themeButton}</SidebarTooltip>
            {logoutButton ? <SidebarTooltip label="Log out">{logoutButton}</SidebarTooltip> : null}
          </footer>
        ) : onLogout ? (
          <SidebarFooter user={user} onLogout={onLogout} />
        ) : null}

      </motion.aside>
    </MotionConfig>
  );
}

export default AppSidebar;
