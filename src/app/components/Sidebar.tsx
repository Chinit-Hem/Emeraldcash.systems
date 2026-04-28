"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { OptimizedLink } from "./OptimizedLink";
import { useVehicleStats } from "@/lib/useVehiclesNeon";
import { Car, Bike, Boxes } from "lucide-react";

function normalizeCategory(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

// Helper to check if category is TukTuk (handles "Tuk Tuk", "TukTuk", "tuktuk", etc.)
function isTukTukCategory(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "tuk tuk" || normalized === "tuktuk" || normalized === "tuk-tuk" || normalized.includes("tuk");
}

// Icon Components
function IconDashboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconLms() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

function IconTukTuk() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v-3a2 2 0 0 1 2-2h8l3 3v3" />
      <path d="M14 13V9a2 2 0 0 1 2-2h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconFleet({ className }: { className?: string }) {
  // Reuses IconCar to avoid duplication - both use the same Car icon
  return IconCar({ className });
}

function IconSettings() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

interface SidebarProps {
  user: User;
  onNavigate?: () => void;
}

// NavItem component with flat styling and instant navigation
interface NavItemProps {
  href?: string;
  icon: React.ComponentType<{className?: string}>;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}


function NavItem({ 
  href,
  icon: Icon, 
  label, 
  active, 
  onClick, 
  count
}: NavItemProps) {

  return (
    <OptimizedLink
      href={href || "#"}
      onClick={onClick}
      className="flex items-center gap-4 w-full group"
      priority={active ? "high" : "normal"}
    >

      <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 ease-out ${
        active 
          ? "bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 shadow-sm text-emerald-600 dark:text-emerald-300"
          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-emerald-600 dark:hover:text-emerald-300"
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 text-left">
        <span className={`text-sm font-medium transition-colors duration-200 ${active ? "text-emerald-600 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-300"}`}>
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
}

function QuickFilterButton({ 
  icon: Icon, 
  label, 
  count, 
  isActive, 
  onClick, 
  color,
  isAddButton
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
      className={`group relative flex items-center justify-between w-full p-3 rounded-2xl transition-colors duration-200 border shadow-sm ${
        isActive
          ? `${styles.activeBg} ${styles.activeBorder}`
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60"
      }`}
    >
      <div className="relative z-10 flex items-center gap-3">
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
          isActive
            ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
            : "bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:bg-white dark:group-hover:bg-slate-800"
        }`}>
          {isAddButton ? (
            <span className={`text-lg font-bold ${isActive ? styles.active : styles.inactive}`}>+</span>
          ) : (
            <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? styles.active : styles.inactive}`} />
          )}
        </div>
        
        <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? styles.active : styles.inactive}`}>
          {label}
        </span>
      </div>

        {count !== undefined && count > 0 && (
          <span className={`relative z-10 ${styles.countBg} text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm`}>
            {count.toLocaleString()}
          </span>
        )}
      </button>
    );
  }


export default function Sidebar({ user, onNavigate }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stats } = useVehicleStats();
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const isAdmin = user.role === "Admin";
  const activeCategory = pathname === "/vehicles" ? searchParams?.get("category") || "" : "";

  // Route active states
  const isDashboardActive = pathname === "/" || pathname === "/dashboard";
  const isLmsActive = pathname.startsWith("/lms");
  const isAdminLmsActive = pathname.startsWith("/admin/lms");
  const isSmsActive = pathname.startsWith("/sms");
  const isVehiclesActive = pathname === "/vehicles" && !activeCategory;
  const isCarsActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "cars";
  const isMotorcyclesActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "motorcycles";
  const isTukTuksActive = pathname === "/vehicles" && (normalizeCategory(activeCategory) === "tuktuks" || isTukTukCategory(activeCategory));
  const isStockActive = pathname.startsWith("/stock");
  const isSettingsActive = pathname === "/settings";

  const handleNavigate = (href: string) => {
    onNavigate?.();
    router.push(href);
  };

  // Get counts
  const allVehiclesCount = stats?.total ?? 0;
  const carsCount = stats?.byCategory?.Cars ?? 0;
  const motorcyclesCount = stats?.byCategory?.Motorcycles ?? 0;
  const tukTuksCount = stats?.byCategory?.TukTuks ?? 0;


  return (
    <aside className="w-[280px] h-screen overflow-y-auto flex flex-col bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm print:hidden relative z-[50]">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
            <Image
              src="/logo.png"
              alt="Emerald Cash"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Emerald Cash</h1>
            <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">VMS PRO</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 py-4 flex flex-col gap-6" aria-label="Main navigation">
        {/* Main Section */}
        <div className="flex flex-col gap-4">
  <NavItem
            href="/"
            icon={IconDashboard}
            label={t.dashboard}
            active={isDashboardActive}
            onClick={() => handleNavigate("/")}
          />
          <NavItem
            href="/lms"
            icon={IconLms}
            label={language === 'km' ? 'ការបណ្តុះបណ្តាល' : 'LMS'}
            active={isLmsActive || isAdminLmsActive}
            onClick={() => handleNavigate("/lms")}
          />

          <NavItem
            href="/sms"
            icon={IconSms}
            label={language === 'km' ? 'គ្រប់គ្រងស្តុក' : 'SMS'}
            active={isSmsActive}
            onClick={() => handleNavigate("/sms")}
          />



        </div>

        {/* Quick Filters Section */}
        <div className="px-4 py-6">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-2">
            {language === 'km' ? 'តម្រងរហ័ស' : 'Quick Filters'}
          </h2>
          
          <div className="flex flex-col gap-3">
            {/* All Vehicles */}
            <QuickFilterButton
              icon={IconFleet}
              label={t.vehicles}
              count={allVehiclesCount}
              isActive={isVehiclesActive}
              onClick={() => handleNavigate("/vehicles")}
              color="emerald"
            />

            {/* Cars */}
            <QuickFilterButton
              icon={IconCar}
label={language === 'km' ? 'រថយន្ត' : 'Cars'}
              count={carsCount}
              isActive={isCarsActive}
              onClick={() => handleNavigate("/vehicles?category=cars")}
              color="blue"
            />

            {/* Motorcycles */}
            <QuickFilterButton
              icon={IconMotorcycle}
label={language === 'km' ? 'ម៉ូតូ' : 'Motorcycles'}
              count={motorcyclesCount}
              isActive={isMotorcyclesActive}
              onClick={() => handleNavigate("/vehicles?category=motorcycles")}
              color="purple"
            />

            {/* TukTuks */}
            <QuickFilterButton
              icon={IconTukTuk}
              label={language === 'km' ? 'កង់បី' : 'TukTuks'}
              count={tukTuksCount}
              isActive={isTukTuksActive}
              onClick={() => handleNavigate("/vehicles?category=tuktuks")}
              color="orange"
            />


            {/* Add Vehicle - Admin only */}
            {isAdmin && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openAddVehicleModal'));
                  onNavigate?.();
                }}
                className="group relative flex items-center justify-between w-full p-3 rounded-2xl transition-colors duration-200 overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/60"
              >
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:bg-white dark:group-hover:bg-slate-800">
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-200">+</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {language === 'km' ? 'បន្ថែមយានយន្ត' : 'Add Vehicle'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="mt-auto">
          <NavItem
            href="/settings"
            icon={IconSettings}
            label={t.settings}
            active={isSettingsActive}
            onClick={() => handleNavigate("/settings")}
          />

        </div>
      </nav> 

      {/* Footer */}
      <div className="p-6 pt-4">
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          {language === 'km' ? '© ២០២៥ អេមើរ៉ល ឃែស' : '© 2025 Emerald Cash'}
        </div>
      </div>
    </aside>
  );
}
