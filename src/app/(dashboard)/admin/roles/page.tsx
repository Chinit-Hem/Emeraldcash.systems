"use client";

import { Shield, UsersRound } from "lucide-react";
import { DEFAULT_ROLE_PERMISSIONS, LEGACY_ROLE_NAMES, PERMISSION_LABELS, type Permission } from "@/shared/types/types";
import { useLanguage } from "@/shared/hooks/LanguageContext";

const roleDescriptions: Record<string, string> = {
  "System Administrator": "IT/Admin manages users, roles, permissions, and system configuration.",
  "Branch Manager": "Branch performance, report review, and report approval.",
  "Loan Specialist": "Creates and manages loans and customer follow-up.",
  Accountant: "Accounting, repayment, disbursement, and account reports.",
  "Assistant Accountant": "Accounting support with lower-level permissions.",
  "Credit / Approver": "Credit review and loan approval within the approval limit.",
  Admin: "Full system access and security administration.",
  Staff: "Standard day-to-day system access.",
  "Loan Operations": "Loan preparation, collection, collateral review, and operational reporting.",
  "Manager / Approver": "Branch management, loan approval, reporting, and read-only LMS, VMS, and SMS access.",
  Finance: "Accounting, disbursement, repayment, and financial reporting.",
  "Human Resources": "Employee records, learning, and HR reporting.",
  "IT Support": "Read-only system support and configuration visibility.",
  "Risk & Compliance": "Independent read-only loan and report oversight.",
  Marketing: "Learning access without customer or financial data.",
  "Intern / Read Only": "Restricted learning access for supervised interns.",
  "Executive Viewer": "Executive dashboards and reports without operational editing.",
};

export default function RolesPage() {
  const { language } = useLanguage();
  const visibleRoles = Object.entries(DEFAULT_ROLE_PERMISSIONS).filter(([role]) => !LEGACY_ROLE_NAMES.includes(role as typeof LEGACY_ROLE_NAMES[number]));
  return <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6"><div className="mx-auto max-w-[1200px]"><div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{language === "km" ? "ការគ្រប់គ្រងសិទ្ធិ" : "Access control"}</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{language === "km" ? "តួនាទី" : "Roles"}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{language === "km" ? "តួនាទីស្តង់ដារដែលប្រព័ន្ធអនុវត្ត" : "The standard roles currently enforced by the application."}</p></div><div className="mt-5 grid gap-4 lg:grid-cols-3">{visibleRoles.map(([role, permissions]) => <section key={role} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><UsersRound className="h-5 w-5" /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{permissions.length} permissions</span></div><h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{role}</h2><p className="mt-1 min-h-10 text-sm text-slate-500 dark:text-slate-400">{roleDescriptions[role] || "Configured system role."}</p><div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">{permissions.map((permission) => <p key={permission} className="mb-2 flex gap-2 text-sm text-slate-700 dark:text-slate-300"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />{PERMISSION_LABELS[permission as Permission]}</p>)}</div></section>)}</div></div></div>;
}
