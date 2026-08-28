"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { getNavigationItems } from "@/shared/components/sidebar/AppSidebar";
import type { SidebarNavigationItem } from "@/shared/components/sidebar/types";
import { TukTukIcon } from "@/shared/components/icons/TukTukIcon";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { cn } from "@/shared/utils/ui";

const menuTileStyles = [
  {
    icon: "bg-sky-50 text-sky-600 ring-sky-200 group-hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30 dark:group-hover:bg-sky-500/20",
    text: "group-hover:text-sky-700 dark:group-hover:text-sky-200",
    card: "hover:border-sky-300 hover:bg-sky-50/70 focus-visible:ring-sky-500/70 dark:hover:border-sky-500/50 dark:hover:bg-sky-500/10",
  },
  {
    icon: "bg-violet-50 text-violet-600 ring-violet-200 group-hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30 dark:group-hover:bg-violet-500/20",
    text: "group-hover:text-violet-700 dark:group-hover:text-violet-200",
    card: "hover:border-violet-300 hover:bg-violet-50/70 focus-visible:ring-violet-500/70 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10",
  },
  {
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-200 group-hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30 dark:group-hover:bg-emerald-500/20",
    text: "group-hover:text-emerald-700 dark:group-hover:text-emerald-200",
    card: "hover:border-emerald-300 hover:bg-emerald-50/70 focus-visible:ring-emerald-500/70 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10",
  },
  {
    icon: "bg-orange-50 text-orange-600 ring-orange-200 group-hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30 dark:group-hover:bg-orange-500/20",
    text: "group-hover:text-orange-700 dark:group-hover:text-orange-200",
    card: "hover:border-orange-300 hover:bg-orange-50/70 focus-visible:ring-orange-500/70 dark:hover:border-orange-500/50 dark:hover:bg-orange-500/10",
  },
  {
    icon: "bg-rose-50 text-rose-600 ring-rose-200 group-hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30 dark:group-hover:bg-rose-500/20",
    text: "group-hover:text-rose-700 dark:group-hover:text-rose-200",
    card: "hover:border-rose-300 hover:bg-rose-50/70 focus-visible:ring-rose-500/70 dark:hover:border-rose-500/50 dark:hover:bg-rose-500/10",
  },
];

function getUniqueMenuItems(section: SidebarNavigationItem) {
  const seenHrefs = new Set<string>();
  return [section, ...(section.children ?? [])].filter((item) => {
    if (seenHrefs.has(item.href)) return false;
    seenHrefs.add(item.href);
    return true;
  });
}

function MenuFunctionTile({ item, index }: { item: SidebarNavigationItem; index: number }) {
  const isTukTuks = item.id === "vehicle-tuktuks";
  const Icon = isTukTuks ? TukTukIcon : item.icon;
  const style = isTukTuks
      ? {
        icon: "bg-rose-50 text-rose-600 ring-0 dark:bg-rose-500/10 dark:text-rose-300",
        text: "group-hover:text-rose-700 dark:group-hover:text-rose-200",
        card: "hover:border-rose-300 hover:bg-rose-50/70 focus-visible:ring-rose-500/70 dark:hover:border-rose-500/50 dark:hover:bg-rose-500/10",
      }
    : menuTileStyles[index % menuTileStyles.length];

  return (
    <Link
      href={item.href}
      prefetch
      aria-label={item.label}
      className={cn(
        "group flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 dark:border-slate-700 dark:bg-slate-900",
        style.card,
      )}
    >
      <span className={cn("flex h-28 w-28 items-center justify-center rounded-2xl transition-transform group-hover:scale-105", style.icon)}>
        <Icon
          className={isTukTuks ? "h-16 w-20" : "h-16 w-16"}
          strokeWidth={isTukTuks ? 5 : 1.8}
          aria-hidden="true"
        />
      </span>
      <span className={cn("mt-7 line-clamp-2 text-2xl font-semibold leading-tight text-slate-700 dark:text-slate-200", style.text)}>
        {item.label}
      </span>
      {!isTukTuks && item.badge ? (
        <span className="mt-3 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

const ERP_SYSTEM_IDS = ["vehicle-management", "learning-center", "asset-inventory", "loan-management", "human-resources"];

const systemThemes: Record<string, { shortName: string; icon: string; selected: string; hover: string; button: string; description: { en: string; km: string } }> = {
  "vehicle-management": {
    shortName: "VMS",
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    selected: "border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/50 dark:bg-emerald-500/10",
    hover: "border-slate-300 hover:border-emerald-300 hover:bg-emerald-50/70 dark:border-slate-700 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10",
    button: "bg-emerald-600 group-hover:bg-emerald-700",
    description: { en: "Vehicle Management", km: "គ្រប់គ្រងយានយន្ត" },
  },
  "learning-center": {
    shortName: "LMS",
    icon: "bg-violet-50 text-violet-600 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
    selected: "border-violet-300 bg-violet-50/70 dark:border-violet-500/50 dark:bg-violet-500/10",
    hover: "border-slate-300 hover:border-violet-300 hover:bg-violet-50/70 dark:border-slate-700 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10",
    button: "bg-violet-600 group-hover:bg-violet-700",
    description: { en: "Learning Center", km: "មជ្ឈមណ្ឌលសិក្សា" },
  },
  "asset-inventory": {
    shortName: "SMS",
    icon: "bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30",
    selected: "border-orange-300 bg-orange-50/70 dark:border-orange-500/50 dark:bg-orange-500/10",
    hover: "border-slate-300 hover:border-orange-300 hover:bg-orange-50/70 dark:border-slate-700 dark:hover:border-orange-500/50 dark:hover:bg-orange-500/10",
    button: "bg-orange-500 group-hover:bg-orange-600",
    description: { en: "Asset Inventory", km: "សារពើភ័ណ្ឌទ្រព្យសម្បត្តិ" },
  },
  "loan-management": {
    shortName: "Loan",
    icon: "bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30",
    selected: "border-blue-300 bg-blue-50/70 dark:border-blue-500/50 dark:bg-blue-500/10",
    hover: "border-slate-300 hover:border-blue-300 hover:bg-blue-50/70 dark:border-slate-700 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10",
    button: "bg-blue-600 group-hover:bg-blue-700",
    description: { en: "Loan Management", km: "គ្រប់គ្រងប្រាក់កម្ចី" },
  },
  "human-resources": {
    shortName: "HR",
    icon: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    selected: "border-rose-300 bg-rose-50/70 dark:border-rose-500/50 dark:bg-rose-500/10",
    hover: "border-slate-300 hover:border-rose-300 hover:bg-rose-50/70 dark:border-slate-700 dark:hover:border-rose-500/50 dark:hover:bg-rose-500/10",
    button: "bg-rose-600 group-hover:bg-rose-700",
    description: { en: "Human Resources", km: "ធនធានមនុស្ស" },
  },
};

function SystemHub({ systems, language }: { systems: SidebarNavigationItem[]; language: string }) {
  const isKhmer = language === "km";
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const selectedSystem = systems.find((system) => system.id === selectedSystemId) ?? systems[0];
  const selectedItems = selectedSystem ? getUniqueMenuItems(selectedSystem) : [];
  const SelectedSystemIcon = selectedSystem?.icon;

  return (
    <>
      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 sm:p-6" aria-labelledby="systems-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="systems-heading" className="text-xl font-bold text-[#1a1a2e] dark:text-slate-100 sm:text-2xl">
            {isKhmer ? "ប្រព័ន្ធ ERP របស់អ្នក" : "Your ERP systems"}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isKhmer ? "ជ្រើសរើសប្រព័ន្ធមួយ ដើម្បីមើលមុខងារដែលមាន។" : "Select a system to see the functions available to you."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
          {systems.length} {isKhmer ? "ប្រព័ន្ធ" : systems.length === 1 ? "system" : "systems"}
        </span>
      </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {systems.map((system) => {
            const Icon = system.icon;
            const theme = systemThemes[system.id] ?? systemThemes["vehicle-management"];
            const isSelected = system.id === selectedSystem?.id;
            const functionCount = getUniqueMenuItems(system).length;

            return (
              <button
                key={system.id}
                type="button"
                onClick={() => setSelectedSystemId(system.id)}
                aria-pressed={isSelected}
                className={cn("group flex min-h-[320px] flex-col rounded-2xl border bg-white p-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-950", isSelected ? theme.selected : theme.hover)}
              >
                <span className="flex w-full items-center gap-3">
                  <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-105", theme.icon)}>
                    <Icon className="h-8 w-8" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xl font-bold text-slate-800 dark:text-slate-100">{theme.shortName}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-400">{isKhmer ? theme.description.km : theme.description.en}</span>
                  </span>
                </span>
                <span className="mt-8 block">
                  <span className="block text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{functionCount}</span>
                  <span className="mt-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                    {isKhmer ? "មុខងារដែលមាន" : functionCount === 1 ? "function available" : "functions available"}
                  </span>
                </span>
                <span className={cn("mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors", theme.button)}>
                  {isKhmer ? "មើលមុខងារ" : "View functions"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedSystem ? (
        <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 sm:p-6" aria-labelledby="system-functions-heading">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1", (systemThemes[selectedSystem.id] ?? systemThemes["vehicle-management"]).icon)}>
              {SelectedSystemIcon ? <SelectedSystemIcon className="h-5 w-5" aria-hidden="true" /> : null}
            </span>
            <div>
              <h2 id="system-functions-heading" className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedSystem.label}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{isKhmer ? "ជ្រើសរើសមុខងារដែលអ្នកចង់បើក។" : "Choose the function you want to open."}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {selectedItems.map((item, index) => <MenuFunctionTile key={item.id} item={item} index={index} />)}
          </div>
        </section>
      ) : null}
    </>
  );
}

export default function HomePage() {
  const { language } = useLanguage();
  const user = useAuthUser();
  const navigationItems = useMemo(
    () => getNavigationItems(user, "/home", new URLSearchParams(), language, {}),
    [language, user]
  );
  const systems = navigationItems.filter((item) => ERP_SYSTEM_IDS.includes(item.id));

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
            {language === "km" ? "មជ្ឈមណ្ឌលប្រព័ន្ធ" : "System Hub"}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a2e] dark:text-slate-100 sm:text-3xl">
            {language === "km" ? "ជ្រើសរើសប្រព័ន្ធរបស់អ្នក" : "Choose your system"}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-300">
            {language === "km" ? "ចាប់ផ្តើមដោយជ្រើសរើសប្រព័ន្ធ ERP មួយ។ យើងនឹងបង្ហាញតែមុខងារដែលអ្នកត្រូវការ។" : "Start by choosing an ERP system. We will show only the functions you need."}
          </p>
        </header>

        <SystemHub systems={systems} language={language} />
      </div>
    </div>
  );
}
