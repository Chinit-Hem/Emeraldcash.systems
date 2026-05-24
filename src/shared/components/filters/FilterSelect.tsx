"use client";

import React from "react";

export type SelectOption = { label: string; value: string };

type FilterSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

export default function FilterSelect({ id, value, onChange, options, placeholder, disabled }: FilterSelectProps) {
  return (
    <select
      id={id}
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

