"use client";

import { cn } from "@/shared/utils/ui";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { translatePhrase } from "@/shared/utils/i18n";
import { BookOpen, PlayCircle, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type ContentManagerTabId = "categories" | "lessons";

type ContentManagerTab = {
  id: ContentManagerTabId;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const contentManagerTabs: ContentManagerTab[] = [
  {
    id: "categories",
    label: "Manage Categories",
    description: "Training groups and order",
    href: "/lms/admin/categories",
    icon: BookOpen,
  },
  {
    id: "lessons",
    label: "Manage Lessons",
    description: "Videos, visibility, and category placement",
    href: "/lms/admin/lessons",
    icon: PlayCircle,
  },
];

export function LmsContentManagerTabs({
  activeTab,
}: {
  activeTab: ContentManagerTabId;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const tr = (text: string) => translatePhrase(text, language);

  return (
    <div className="mb-6 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
      <div className="grid gap-2 sm:grid-cols-2">
        {contentManagerTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => router.push(tab.href, { scroll: false })}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.99]",
                isActive
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                  isActive
                    ? "border-emerald-200 bg-white text-emerald-600"
                    : "border-slate-200 bg-white text-slate-500"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{tr(tab.label)}</span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-xs font-medium",
                    isActive ? "text-emerald-600" : "text-slate-500"
                  )}
                >
                  {tr(tab.description)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
