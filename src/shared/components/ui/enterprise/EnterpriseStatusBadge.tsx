import type { ReactNode } from "react";
import { cn } from "@/shared/utils/ui";

type Status = "success" | "info" | "warning" | "error" | "neutral";

const styles: Record<Status, string> = {
  success:
    "border-emerald-200/80 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-900/25 dark:text-emerald-300",
  info:
    "border-blue-200/80 bg-blue-50/70 text-blue-700 dark:border-blue-800/80 dark:bg-blue-900/25 dark:text-blue-300",
  warning:
    "border-orange-200/80 bg-orange-50/70 text-orange-700 dark:border-orange-800/80 dark:bg-orange-900/25 dark:text-orange-300",
  error:
    "border-red-200/80 bg-red-50/70 text-red-700 dark:border-red-800/80 dark:bg-red-900/25 dark:text-red-300",
  neutral:
    "border-slate-200/80 bg-slate-50/70 text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/25 dark:text-slate-300",
};

export default function EnterpriseStatusBadge({
  status,
  children,
  className,
}: {
  status: Status;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        styles[status],
        className
      )}
    >
      {children}
    </span>
  );
}

