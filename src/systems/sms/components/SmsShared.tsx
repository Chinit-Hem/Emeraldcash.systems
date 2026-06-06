import Link from "next/link";
import { AlertCircle, ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SmsPageShellProps = {
  children: ReactNode;
  maxWidth?: string;
};

type SmsPageHeaderProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: "emerald" | "blue" | "slate" | "amber" | "purple";
  actions?: ReactNode;
  backHref?: string | null;
};

type SmsFieldErrorProps = {
  error?: string;
};

const headerTone = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export const smsPanelClass =
  "rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800";
export const smsInputClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 disabled:dark:bg-gray-900 disabled:dark:text-gray-500";
export const smsTextareaClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 disabled:dark:bg-gray-900 disabled:dark:text-gray-500";
export const smsSelectClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:dark:bg-gray-900 disabled:dark:text-gray-500";
export const smsPrimaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50";
export const smsSecondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700";
export const smsDangerButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50";
export const smsLabelClass = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";
export const smsHelperClass = "mt-1.5 text-xs text-gray-500 dark:text-gray-400";
export const smsErrorTextClass = "mt-1.5 flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400";
export const smsLoadingFieldClass =
  "flex h-11 w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400";
export const smsDropzoneClass =
  "rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-emerald-700";
export const smsDividerClass = "border-t border-gray-200 dark:border-gray-700";
export const smsInvalidFieldClass =
  "border-red-500 bg-red-50 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/20 dark:focus:ring-red-500";
export const smsModalPanelClass =
  "flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white/95 shadow-2xl ring-1 ring-gray-200/80 backdrop-blur-xl dark:bg-gray-900/95 dark:ring-gray-800";
export const smsModalHeaderClass =
  "shrink-0 border-b border-gray-200 bg-white/95 p-4 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/95 md:p-6";
export const smsModalFooterClass =
  "shrink-0 flex flex-col gap-3 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/95 sm:flex-row sm:px-6";

export function SmsPageShell({ children, maxWidth = "max-w-7xl" }: SmsPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-5 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className={`mx-auto ${maxWidth}`}>{children}</div>
    </div>
  );
}

export function SmsFieldError({ error }: SmsFieldErrorProps) {
  if (!error) return null;

  return (
    <p className={smsErrorTextClass}>
      <AlertCircle className="h-4 w-4" />
      {error}
    </p>
  );
}

export function SmsPageHeader({
  title,
  description,
  icon: Icon,
  tone = "emerald",
  actions,
  backHref = "/sms/assets",
}: SmsPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {backHref && (
          <Link
            href={backHref}
            scroll={false}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Back to SMS assets"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${headerTone[tone]}`}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">SMS</p>
          </div>
          <h1 className="text-2xl font-bold leading-tight text-gray-950 dark:text-white">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{actions}</div>}
    </div>
  );
}
