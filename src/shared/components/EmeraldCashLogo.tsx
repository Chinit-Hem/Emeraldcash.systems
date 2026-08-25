"use client";

import type { ImgHTMLAttributes } from "react";

type EmeraldCashLogoProps = ImgHTMLAttributes<HTMLImageElement> & {
  title?: string;
};

export default function EmeraldCashLogo({ title = "Emerald Cash", ...props }: EmeraldCashLogoProps) {
  return (
    <img src="/logo-horizontal.png" alt={title} title={title} {...props} />
  );
}
