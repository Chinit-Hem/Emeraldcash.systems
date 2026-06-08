"use client";

import React from "react";

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

  return (
    <select
      id={id}
      title={accessibleName}
      aria-label={accessibleName}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className="ec-select w-full"
      disabled={disabled}
    >
      <option value="">{placeholder ?? "All"}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
