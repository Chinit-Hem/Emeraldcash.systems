"use client";

import { ArrowLeftRight, RotateCcw, type LucideIcon } from "lucide-react";
import { memo } from "react";
import type { MovementMode } from "@/systems/sms/types/sms-movement";

type MovementModeOption = {
  mode: MovementMode;
  label: string;
  icon: LucideIcon;
  activeClass: string;
};

type SmsMovementModeToggleProps = {
  mode: MovementMode;
  onModeChange: (mode: MovementMode) => void;
};

const movementModeOptions: MovementModeOption[] = [
  {
    mode: "send",
    label: "Send Asset",
    icon: ArrowLeftRight,
    activeClass: "bg-white text-amber-700 shadow-sm dark:bg-slate-950 dark:text-amber-300",
  },
  {
    mode: "return",
    label: "Return Asset",
    icon: RotateCcw,
    activeClass: "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-300",
  },
];

export const SmsMovementModeToggle = memo(function SmsMovementModeToggle({
  mode,
  onModeChange,
}: SmsMovementModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      {movementModeOptions.map(({ mode: optionMode, label, icon: Icon, activeClass }) => (
        <button
          key={optionMode}
          type="button"
          aria-pressed={mode === optionMode}
          onClick={() => onModeChange(optionMode)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
            mode === optionMode
              ? activeClass
              : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-900/60"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
});
