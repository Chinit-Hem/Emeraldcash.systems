"use client";

import React, { useEffect, useRef, useState } from "react";

export type SelectOption = { label: string; value: string };

type FilterSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
};

export default function FilterSelect({ id, value, onChange, options, placeholder, label, disabled }: FilterSelectProps) {
  const accessibleName = label ?? placeholder ?? "Filter options";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
  }

  const currentLabel = options.find((o) => o.value === value)?.label ?? (placeholder ?? "All");

  return (
    <div ref={ref} id={id} className="relative">
      <button
        type="button"
        title={accessibleName}
        aria-label={accessibleName}
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => {}}
        disabled={disabled}
        className="ec-select w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800 border rounded-md shadow-sm hover:shadow-md focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="12" r="1.5" fill="currentColor" />
            <circle cx="16" cy="12" r="1.5" fill="currentColor" />
          </svg>
          <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-200">{currentLabel}</span>
        </div>

        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul role="menu" className="absolute z-50 mt-2 right-0 left-0 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((opt) => (
            <li key={opt.value} role="menuitem" className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="text-sm text-gray-800 dark:text-gray-100">{opt.label}</span>
              </div>
              <button
                type="button"
                onClick={() => handleSelect(opt.value)}
                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Select
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
