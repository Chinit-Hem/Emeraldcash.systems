"use client";

import type { User } from "@/shared/types/types";
import { BookOpen, Boxes, Calculator, Menu, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { isIOSSafariBrowser } from "@/shared/utils/platform";
import { useMounted } from "@/shared/hooks/useMounted";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { OptimizedLink } from "@/shared/components/OptimizedLink";
import { hasAppPermission } from "@/shared/utils/permissions";

type NavLinkItem = {
  id: "vms" | "lms" | "sms" | "settings";
  label: string;
  labelKm: string;
  href: string;
  icon: LucideIcon;
};

type MobileBottomNavProps = {
  user: User;
  isMenuOpen?: boolean;
  onOpenMenu: () => void;
};

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

function isKeyboardTarget(element: Element | null) {
  if (!(element instanceof HTMLElement)) return false;

  const tagName = element.tagName.toLowerCase();
  if (element instanceof HTMLInputElement) {
    return ![
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit",
    ].includes(element.type);
  }

  return (
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  );
}

export default function MobileBottomNav({
  user,
  isMenuOpen = false,
  onOpenMenu,
}: MobileBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const isIOSSafari = useMounted() && isIOSSafariBrowser();
  const { language } = useLanguage();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const translatedNavItems = useMemo(() => {
    const navItems: NavLinkItem[] = [];

    if (hasAppPermission(user.role, "vehicles:view")) {
      navItems.push({ id: "vms", label: "VMS", labelKm: "VMS", href: "/", icon: Calculator });
    }

    if (hasAppPermission(user.role, "lms:view")) {
      navItems.push({ id: "lms", label: "LMS", labelKm: "LMS", href: "/lms", icon: BookOpen });
    }

    if (hasAppPermission(user.role, "sms:view")) {
      navItems.push({ id: "sms", label: "SMS", labelKm: "SMS", href: "/sms", icon: Boxes });
    }

    navItems.push({
      id: "settings",
      label: "Settings",
      labelKm: "ការកំណត់",
      href: "/settings",
      icon: Settings,
    });

    return navItems.map((item) => ({
      ...item,
      displayLabel: language === "km" ? item.labelKm : item.label,
    }));
  }, [language, user.role]);

  useEffect(() => {
    if (isIOSSafari) return;

    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    if (connection?.saveData || connection?.effectiveType === "2g") return;

    const prefetchTimers: number[] = [];
    const routes = translatedNavItems.map((item) => item.href);
    const timer = window.setTimeout(() => {
      routes.forEach((href, index) => {
        prefetchTimers.push(window.setTimeout(() => router.prefetch(href), index * 120));
      });
    }, 900);

    return () => {
      window.clearTimeout(timer);
      prefetchTimers.forEach((prefetchTimer) => window.clearTimeout(prefetchTimer));
    };
  }, [isIOSSafari, router, translatedNavItems]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const keyboardTimers = new Set<number>();

    const updateKeyboardState = () => {
      const focusedFormField = isKeyboardTarget(document.activeElement);

      setIsKeyboardOpen(mediaQuery.matches && focusedFormField);
    };

    const scheduleKeyboardStateUpdate = () => {
      updateKeyboardState();

      [80, 240, 500].forEach((delay) => {
        const timer = window.setTimeout(() => {
          keyboardTimers.delete(timer);
          updateKeyboardState();
        }, delay);
        keyboardTimers.add(timer);
      });
    };

    updateKeyboardState();
    window.visualViewport?.addEventListener("resize", scheduleKeyboardStateUpdate);
    window.visualViewport?.addEventListener("scroll", scheduleKeyboardStateUpdate);
    window.addEventListener("resize", scheduleKeyboardStateUpdate);
    window.addEventListener("focusin", scheduleKeyboardStateUpdate);
    window.addEventListener("focusout", scheduleKeyboardStateUpdate);
    mediaQuery.addEventListener("change", scheduleKeyboardStateUpdate);

    return () => {
      keyboardTimers.forEach((timer) => window.clearTimeout(timer));
      window.visualViewport?.removeEventListener("resize", scheduleKeyboardStateUpdate);
      window.visualViewport?.removeEventListener("scroll", scheduleKeyboardStateUpdate);
      window.removeEventListener("resize", scheduleKeyboardStateUpdate);
      window.removeEventListener("focusin", scheduleKeyboardStateUpdate);
      window.removeEventListener("focusout", scheduleKeyboardStateUpdate);
      mediaQuery.removeEventListener("change", scheduleKeyboardStateUpdate);
    };
  }, []);

  useEffect(() => {
    const shouldCollapseNavSpace = isKeyboardOpen && !isMenuOpen;

    document.documentElement.classList.toggle("mobile-keyboard-open", shouldCollapseNavSpace);
    document.body.classList.toggle("mobile-keyboard-open", shouldCollapseNavSpace);

    return () => {
      document.documentElement.classList.remove("mobile-keyboard-open");
      document.body.classList.remove("mobile-keyboard-open");
    };
  }, [isKeyboardOpen, isMenuOpen]);

  const isActive = (item: NavLinkItem) => {
    if (item.id === "vms") {
      return (
        pathname === "/" ||
        pathname === "/dashboard" ||
        pathname.startsWith("/vehicles") ||
        pathname.startsWith("/stock") ||
        pathname.startsWith("/cleaned-vehicles")
      );
    }
    if (item.id === "lms") return pathname.startsWith("/lms") || pathname.startsWith("/admin/lms");
    if (item.id === "sms") return pathname.startsWith("/sms");
    return pathname === "/settings";
  };

  const navClass = isIOSSafari
    ? "fixed inset-x-0 bottom-0 z-50 border-t border-neu-bg-dark bg-neu-bg shadow-lg xl:hidden"
    : "neu-mobile-nav fixed inset-x-0 bottom-0 z-50 xl:hidden";
  const menuLabel = language === "km" ? "ម៉ឺនុយ" : "Menu";

  if (isKeyboardOpen && !isMenuOpen) {
    return null;
  }

  return (
    <nav
      className={navClass}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-[calc(4.25rem+env(safe-area-inset-bottom))] max-w-2xl items-start justify-around gap-1 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-2">
        {translatedNavItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <OptimizedLink
              key={item.id}
              href={item.href}
              className={`neu-mobile-nav-item min-w-0 flex-1 !px-1 ${active ? "active" : ""}`}
              prefetch={false}
              priority="low"
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.35 : 1.9} />
              <span className="max-w-full truncate text-[11px] font-medium leading-tight sm:text-xs">
                {item.displayLabel}
              </span>
            </OptimizedLink>
          );
        })}
        <button
          type="button"
          className={`neu-mobile-nav-item min-w-0 flex-1 !px-1 ${isMenuOpen ? "active" : ""}`}
          onClick={onOpenMenu}
          aria-label={language === "km" ? "បើកម៉ឺនុយ" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          <Menu className="h-5 w-5" strokeWidth={isMenuOpen ? 2.35 : 1.9} />
          <span className="max-w-full truncate text-[11px] font-medium leading-tight sm:text-xs">
            {menuLabel}
          </span>
        </button>
      </div>
    </nav>
  );
}
