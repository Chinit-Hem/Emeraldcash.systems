"use client";

import { X } from "lucide-react";
import { cn } from "@/shared/utils/ui";

type SearchClearButtonProps = {
  onClear: () => void;
  label?: string;
  className?: string;
  iconClassName?: string;
};

export function SearchClearButton({
  onClear,
  label = "Clear search",
  className,
  iconClassName,
}: SearchClearButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onClear}
      className={cn(
        "ec-pressable inline-flex items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200",
        className
      )}
    >
      <X className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
    </button>
  );
}
