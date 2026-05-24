"use client";

import type { ReactNode } from "react";

type FilterFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
};

export default function FilterField({ id, label, children }: FilterFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

