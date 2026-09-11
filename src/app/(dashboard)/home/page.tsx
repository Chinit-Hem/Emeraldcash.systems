"use client";

import { OperationReportMenu } from "@/shared/components/OperationReportMenu";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookUser, ChartNoAxesCombined, Check, HandCoins, ReceiptText, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { ERP_SYSTEM_IDS, useSelectedSystem } from "@/shared/hooks/useSelectedSystem";
import { getNavigationItems } from "@/shared/components/sidebar/AppSidebar";
import type { SidebarNavigationItem } from "@/shared/components/sidebar/types";
import { SystemIllustration } from "@/shared/components/icons/SystemIllustration";
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

const loanMenuContent: Record<string, { icon: LucideIcon; title: string; description: { en: string; km: string } }> = {
  "loan-management": {
    icon: HandCoins,
    title: "Loan Overview",
    description: { en: "View your loan portfolio and activity.", km: "មើលសំណុំប្រាក់កម្ចី និងសកម្មភាព។" },
  },
  "loan-borrowers": {
    icon: Users,
    title: "Borrowers",
    description: { en: "View borrower profiles and details.", km: "មើលប្រវត្តិរូប និងព័ត៌មានអ្នកខ្ចីប្រាក់។" },
  },
  "loan-contacts": {
    icon: BookUser,
    title: "Contacts",
    description: { en: "Find and manage contact details.", km: "ស្វែងរក និងគ្រប់គ្រងព័ត៌មានទំនាក់ទំនង។" },
  },
  "loan-accounting": {
    icon: ReceiptText,
    title: "Accounting",
    description: { en: "Review financial records and transactions.", km: "ពិនិត្យកំណត់ត្រាហិរញ្ញវត្ថុ និងប្រតិបត្តិការ។" },
  },
  "loan-operation-report": {
    icon: ChartNoAxesCombined,
    title: "Operation Reports",
    description: { en: "View and prepare operation reports.", km: "មើល និងរៀបចំរបាយការណ៍ប្រតិបត្តិការ។" },
  },
};

function MenuFunctionTile({ item, index }: { item: SidebarNavigationItem; index: number }) {
  const { language } = useLanguage();
  const content = loanMenuContent[item.id];
  const title = content && language !== "km" ? content.title : item.label;
  const isTukTuks = item.id === "vehicle-tuktuks";
  const Icon = isTukTuks ? TukTukIcon : content?.icon ?? item.icon;
  const style = isTukTuks
      ? {
        icon: "bg-rose-50 text-rose-600 ring-0 dark:bg-rose-500/10 dark:text-rose-300",
        text: "group-hover:text-rose-700 dark:group-hover:text-rose-200",
        card: "hover:border-rose-300 hover:bg-rose-50/70 focus-visible:ring-rose-500/70 dark:hover:border-rose-500/50 dark:hover:bg-rose-500/10",
      }
    : menuTileStyles[index % menuTileStyles.length];

  const tile = (
    <Link
      href={item.href}
      prefetch
      aria-label={title}
      className={cn(
        "group flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 dark:border-slate-700 dark:bg-slate-900",
        content && "min-w-0 justify-start px-3 py-5 hover:translate-y-0 motion-reduce:transition-none",
        style.card,
      )}
    >
      <span className={cn("flex h-28 w-28 items-center justify-center rounded-2xl transition-transform group-hover:scale-105", content && "h-20 w-20", style.icon)}>
        <Icon
          className={isTukTuks ? "h-16 w-20" : content ? "h-10 w-10" : "h-16 w-16"}
          strokeWidth={isTukTuks ? 5 : 1.8}
          aria-hidden="true"
        />
      </span>
      <span className={cn("mt-7 line-clamp-2 text-2xl font-semibold leading-tight text-slate-700 dark:text-slate-200", content && "mt-4 line-clamp-none text-base leading-6", style.text)}>
        {title}
      </span>
      {content ? (
        <>
          <span className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
            {language === "km" ? content.description.km : content.description.en}
          </span>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-semibold text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">
            {language === "km" ? "បើក" : "Open"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </>
      ) : null}
      {!isTukTuks && item.badge ? (
        <span className="mt-3 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
  return item.id === "loan-operation-report" ? <OperationReportMenu>{tile}</OperationReportMenu> : tile;
}


const systemThemes: Record<string, { shortName: string; icon: string; card: string; button: string; description: { en: string; km: string } }> = {
  "vehicle-management": {
    shortName: "VMS",
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    card: "border-emerald-300 bg-emerald-50/70 hover:border-emerald-500 hover:bg-emerald-100 focus-within:border-emerald-500 focus-within:bg-emerald-100 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:hover:border-emerald-400 dark:hover:bg-emerald-500/20 dark:focus-within:border-emerald-400 dark:focus-within:bg-emerald-500/20",
    button: "bg-emerald-600 group-hover:bg-emerald-700 group-focus-within:bg-emerald-700",
    description: { en: "Vehicle Management", km: "គ្រប់គ្រងយានយន្ត" },
  },
  "learning-center": {
    shortName: "LMS",
    icon: "bg-violet-50 text-violet-600 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
    card: "border-violet-300 bg-violet-50/70 hover:border-violet-500 hover:bg-violet-100 focus-within:border-violet-500 focus-within:bg-violet-100 dark:border-violet-500/50 dark:bg-violet-500/10 dark:hover:border-violet-400 dark:hover:bg-violet-500/20 dark:focus-within:border-violet-400 dark:focus-within:bg-violet-500/20",
    button: "bg-violet-600 group-hover:bg-violet-700 group-focus-within:bg-violet-700",
    description: { en: "Learning Center", km: "មជ្ឈមណ្ឌលសិក្សា" },
  },
  "asset-inventory": {
    shortName: "SMS",
    icon: "bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30",
    card: "border-orange-300 bg-orange-50/70 hover:border-orange-500 hover:bg-orange-100 focus-within:border-orange-500 focus-within:bg-orange-100 dark:border-orange-500/50 dark:bg-orange-500/10 dark:hover:border-orange-400 dark:hover:bg-orange-500/20 dark:focus-within:border-orange-400 dark:focus-within:bg-orange-500/20",
    button: "bg-orange-500 group-hover:bg-orange-600 group-focus-within:bg-orange-600",
    description: { en: "Asset Inventory", km: "សារពើភ័ណ្ឌទ្រព្យសម្បត្តិ" },
  },
  "loan-management": {
    shortName: "Loan",
    icon: "bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30",
    card: "border-blue-300 bg-blue-50/70 hover:border-blue-500 hover:bg-blue-100 focus-within:border-blue-500 focus-within:bg-blue-100 dark:border-blue-500/50 dark:bg-blue-500/10 dark:hover:border-blue-400 dark:hover:bg-blue-500/20 dark:focus-within:border-blue-400 dark:focus-within:bg-blue-500/20",
    button: "bg-blue-600 group-hover:bg-blue-700 group-focus-within:bg-blue-700",
    description: { en: "Loan Management", km: "គ្រប់គ្រងប្រាក់កម្ចី" },
  },
  "human-resources": {
    shortName: "HR",
    icon: "bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
    card: "border-red-300 bg-red-50/70 hover:border-red-500 hover:bg-red-100 focus-within:border-red-500 focus-within:bg-red-100 dark:border-red-500/50 dark:bg-red-500/10 dark:hover:border-red-400 dark:hover:bg-red-500/20 dark:focus-within:border-red-400 dark:focus-within:bg-red-500/20",
    button: "bg-red-600 group-hover:bg-red-700 group-focus-within:bg-red-700",
    description: { en: "Human Resources", km: "ធនធានមនុស្ស" },
  },
};

function SystemHub({ systems, language }: { systems: SidebarNavigationItem[]; language: string }) {
  const isKhmer = language === "km";
  const selectedSystemId = useSelectedSystem();
  const selectedSystem = systems.find((system) => system.id === selectedSystemId);
  const selectedItems = selectedSystem ? getUniqueMenuItems(selectedSystem) : [];
  const SelectedSystemIcon = selectedSystem?.icon;

  return (
    <>
      {!selectedSystem ? <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800" aria-labelledby="systems-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="systems-heading" className="text-xl font-bold text-[#1a1a2e] dark:text-slate-100">
            {isKhmer ? "សូមស្វាគមន៍មកកាន់ Emerald Cash" : "Welcome to Emerald Cash"}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isKhmer ? "ជ្រើសរើសប្រព័ន្ធមួយ ដើម្បីចាប់ផ្តើម។" : "Choose a system to get started."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
          {systems.length} {isKhmer ? "ប្រព័ន្ធ" : systems.length === 1 ? "system" : "systems"}
        </span>
      </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {systems.map((system) => {
            const theme = systemThemes[system.id] ?? systemThemes["vehicle-management"];
            const features = getUniqueMenuItems(system).slice(1, 5);
            const isHr = system.id === "human-resources";

            return (
              <Link
                key={system.id}
                href={isHr ? "/hr" : `/home?system=${system.id}`}
                aria-label={isKhmer ? `បើក ${system.label}` : `Explore ${system.label}`}
                className={cn("group flex cursor-pointer flex-col overflow-hidden min-w-0 rounded-xl border p-3 shadow-sm xl:p-4 transition-[background-color,border-color,box-shadow] duration-200 hover:shadow-md focus-within:shadow-md motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900", theme.card)}
              >
                <div className={cn("mb-2 rounded-xl", theme.icon)}>
                  <SystemIllustration systemId={system.id} />
                </div>
                <h3 className="text-base font-bold leading-6 text-slate-900 dark:text-slate-100">
                  {isKhmer ? system.label : `${theme.shortName}${theme.shortName === "HR" ? " System" : ""}`}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {isKhmer ? theme.description.km : theme.description.en}
                </p>
                <div className="mb-4 mt-4 flex-1">
                  <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isHr ? (isKhmer ? "របាយការណ៍" : "Reports") : (isKhmer ? "មុខងារដែលមាន" : "Available features")}
                  </p>
                  {isHr ? (
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {isKhmer ? "មើលរបាយការណ៍ BM, LS និងគណនេយ្យគ្រប់សាខា។" : "View BM, LS, and Account reports across all branches."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {(features.length ? features : [system]).map((feature) => (
                        <li key={feature.id} className="flex items-start gap-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                          <Check className={cn("mt-0.5 h-4 w-4 shrink-0", theme.icon)} aria-hidden="true" />
                          {feature.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span
                  className={cn("inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-colors", theme.button)}
                >
                  {isKhmer ? `បើក ${theme.shortName}` : `Explore ${theme.shortName}`}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
        <aside className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50/70 px-4 py-3 dark:bg-emerald-500/10">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{isKhmer ? "ត្រូវការជំនួយ?" : "Need help?"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{isKhmer ? "ទាក់ទងអ្នកគ្រប់គ្រងរបស់អ្នក សម្រាប់ជំនួយក្នុងការចូលប្រើប្រព័ន្ធ។" : "Contact your administrator for help with system access."}</p>
          </div>
        </aside>
      </section> : null}

      {selectedSystem ? (
        <section className="scroll-mt-24 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 sm:p-6" aria-labelledby="system-functions-heading">
          <Link href="/home" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-300"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{isKhmer ? "មជ្ឈមណ្ឌលប្រព័ន្ធ" : "All systems"}</Link>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1", (systemThemes[selectedSystem.id] ?? systemThemes["vehicle-management"]).icon)}>
              {SelectedSystemIcon ? <SelectedSystemIcon className="h-5 w-5" aria-hidden="true" /> : null}
            </span>
            <div>
              <h2 id="system-functions-heading" className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedSystem.label}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{isKhmer ? "ជ្រើសរើសមុខងារដែលអ្នកចង់បើក។" : "Choose the function you want to open."}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
    <div className="bg-[#f8fafc] p-3 dark:bg-slate-950 sm:p-4">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <SystemHub systems={systems} language={language} />
      </div>
    </div>
  );
}
