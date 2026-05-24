"use client";

import type { SVGProps } from "react";

type EmeraldCashLogoProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export default function EmeraldCashLogo({ title = "Emerald Cash", ...props }: EmeraldCashLogoProps) {
  return (
    <svg viewBox="0 0 256 256" role="img" aria-label={title} {...props}>
      <title>{title}</title>
      <path
        d="M128 20c30 0 55 26 52 63-3 39-28 88-52 156-24-68-49-117-52-156-3-37 22-63 52-63Z"
        fill="#9b1c1c"
      />
      <path
        d="M60 70c22 0 41 17 44 42 4 30-14 70-40 118-20-42-39-82-40-118-1-25 14-42 36-42Z"
        fill="#9b1c1c"
        opacity="0.92"
      />
      <path
        d="M196 70c22 0 37 17 36 42-1 36-20 76-40 118-26-48-44-88-40-118 3-25 22-42 44-42Z"
        fill="#9b1c1c"
        opacity="0.92"
      />
      <path
        d="M128 238c-26-62-52-104-86-124"
        stroke="#0b6b3c"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M128 238c26-62 52-104 86-124"
        stroke="#0b6b3c"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

