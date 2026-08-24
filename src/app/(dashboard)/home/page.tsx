"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getNavigationItems } from "@/shared/components/sidebar/AppSidebar";
import type { SidebarNavigationItem } from "@/shared/components/sidebar/types";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { cn } from "@/shared/utils/ui";

const menuTileStyles = [
  {
    icon: "bg-sky-50 text-sky-600 ring-sky-200 group-hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30 dark:group-hover:bg-sky-500/20",
    text: "group-hover:text-sky-700 dark:group-hover:text-sky-200",
  },
  {
    icon: "bg-violet-50 text-violet-600 ring-violet-200 group-hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30 dark:group-hover:bg-violet-500/20",
    text: "group-hover:text-violet-700 dark:group-hover:text-violet-200",
  },
  {
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-200 group-hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30 dark:group-hover:bg-emerald-500/20",
    text: "group-hover:text-emerald-700 dark:group-hover:text-emerald-200",
  },
  {
    icon: "bg-orange-50 text-orange-600 ring-orange-200 group-hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30 dark:group-hover:bg-orange-500/20",
    text: "group-hover:text-orange-700 dark:group-hover:text-orange-200",
  },
  {
    icon: "bg-rose-50 text-rose-600 ring-rose-200 group-hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30 dark:group-hover:bg-rose-500/20",
    text: "group-hover:text-rose-700 dark:group-hover:text-rose-200",
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
  const Icon = item.icon;
  const style = menuTileStyles[index % menuTileStyles.length];

  return (
    <Link
      href={item.href}
      prefetch
      aria-label={item.label}
      className="group flex min-h-36 flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-3 py-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <span className={cn("flex h-16 w-16 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-105", style.icon)}>
        <Icon className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className={cn("mt-4 line-clamp-2 text-sm font-semibold text-slate-700 dark:text-slate-200", style.text)}>
        {item.label}
      </span>
      {item.badge ? (
        <span className="mt-2 rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

const ERP_SYSTEM_IDS = ["vehicle-management", "learning-center", "asset-inventory", "loan-management", "human-resources"];

const systemThemes: Record<string, { icon: string; selected: string; description: { en: string; km: string } }> = {
  "vehicle-management": {
    icon: "bg-sky-50 text-sky-600 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
    selected: "border-sky-300 bg-sky-50/70 dark:border-sky-500/50 dark:bg-sky-500/10",
    description: { en: "Vehicles, stock, and valuation", km: "យានយន្ត ស្តុក និងការវាយតម្លៃ" },
  },
  "learning-center": {
    icon: "bg-violet-50 text-violet-600 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
    selected: "border-violet-300 bg-violet-50/70 dark:border-violet-500/50 dark:bg-violet-500/10",
    description: { en: "Training, courses, and staff progress", km: "ការបណ្តុះបណ្តាល វគ្គសិក្សា និងវឌ្ឍនភាពបុគ្គលិក" },
  },
  "asset-inventory": {
    icon: "bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30",
    selected: "border-orange-300 bg-orange-50/70 dark:border-orange-500/50 dark:bg-orange-500/10",
    description: { en: "Assets, transfers, and history", km: "ទ្រព្យសម្បត្តិ ការផ្ទេរ និងប្រវត្តិ" },
  },
  "loan-management": {
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    selected: "border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/50 dark:bg-emerald-500/10",
    description: { en: "Loans, repayments, and approvals", km: "ប្រាក់កម្ចី ការសងប្រាក់ និងការអនុម័ត" },
  },
  "human-resources": {
    icon: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    selected: "border-rose-300 bg-rose-50/70 dark:border-rose-500/50 dark:bg-rose-500/10",
    description: { en: "People, roles, and workplace settings", km: "បុគ្គលិក តួនាទី និងការកំណត់កន្លែងធ្វើការ" },
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                className={cn("group flex min-h-44 flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-950", isSelected ? theme.selected : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700")}
              >
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-105", theme.icon)}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="mt-5 text-base font-bold text-slate-800 dark:text-slate-100">{system.label}</span>
                <span className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{isKhmer ? theme.description.km : theme.description.en}</span>
                <span className="mt-auto pt-4 text-xs font-semibold text-slate-400 dark:text-slate-500">{functionCount} {isKhmer ? "មុខងារ" : functionCount === 1 ? "function" : "functions"}</span>
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
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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
