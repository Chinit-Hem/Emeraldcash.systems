"use client";

import { BookOpen, Boxes, Calculator, Car, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { isIOSSafariBrowser } from "@/shared/utils/platform";
import { useMounted } from "@/shared/hooks/useMounted";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { OptimizedLink } from "@/shared/components/OptimizedLink";

type NavItem = {
  label: string;
  labelKm: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Vehicle Valuation", labelKm: "វាយតម្លៃយានយន្ត", href: "/", icon: Calculator },
  { label: "LMS", labelKm: "ការបណ្តុះបណ្តាល", href: "/lms", icon: BookOpen },
  { label: "SMS", labelKm: "គ្រប់គ្រងស្តុក", href: "/sms", icon: Boxes },
  { label: "Vehicles", labelKm: "យានយន្ត", href: "/vehicles", icon: Car },
  { label: "Settings", labelKm: "ការកំណត់", href: "/settings", icon: Settings },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const isIOSSafari = useMounted() && isIOSSafariBrowser();
  const { language } = useLanguage();

  // Get translated nav items based on current language
  const translatedNavItems = useMemo(() => {
    return navItems.map(item => ({
      ...item,
      displayLabel: language === 'km' ? item.labelKm : item.label
    }));
  }, [language]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // iOS-safe nav class
  const navClass = isIOSSafari
    ? "fixed inset-x-0 bottom-0 z-50 bg-neu-bg border-t border-neu-bg-dark shadow-lg"
    : "neu-mobile-nav fixed inset-x-0 bottom-0 z-50";

  return (
    <nav
      className={navClass}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2 sm:h-[70px]">
        {translatedNavItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <OptimizedLink
              key={item.label}
              href={item.href}
              className={`neu-mobile-nav-item ${active ? "active" : ""}`}
              priority={active ? "high" : "normal"}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.35 : 1.9} />
              <span className="text-xs font-medium">{item.displayLabel}</span>
            </OptimizedLink>
          );
        })}
      </div>
    </nav>
  );
}
