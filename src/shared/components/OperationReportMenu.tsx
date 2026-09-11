"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { getReportNavigation } from "@/systems/loan/utils/reportNavigation";

export function OperationReportMenu({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const { language } = useLanguage();
  const { links } = getReportNavigation(user, language);
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!links.length) return children;
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={(event) => { if (!(event.target instanceof HTMLButtonElement)) setOpen(true); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.stopPropagation(); } }}>
      {children}
      <button type="button" aria-label={language === "km" ? "ជម្រើសរបាយការណ៍" : "Report shortcuts"} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-slate-900 dark:text-slate-300">
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? <nav id={id} aria-label={language === "km" ? "ជម្រើសរបាយការណ៍" : "Report shortcuts"} className="relative z-50 mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-200 dark:hover:bg-emerald-950">{link.label}</Link>)}
      </nav> : null}
    </div>
  );
}
