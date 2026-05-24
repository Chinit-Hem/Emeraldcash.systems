"use client";

import React from "react";

type FilterInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal" | "search" | "email" | "tel" | "url" | "none";
  min?: number | string;
  max?: number | string;
};

export default function FilterInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  min,
  max,
}: FilterInputProps) {
  return (
    <input
      id={id}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      inputMode={inputMode}
      min={min}
      max={max}
      className="ec-input w-full"
    />
  );
}

