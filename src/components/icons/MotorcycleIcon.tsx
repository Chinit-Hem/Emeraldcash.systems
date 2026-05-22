import type { SVGProps } from "react";

export function MotorcycleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="17" cy="47" r="9" strokeWidth="4" />
      <circle cx="50" cy="47" r="9" strokeWidth="4" />
      <circle cx="17" cy="47" r="3" strokeWidth="4" />
      <circle cx="50" cy="47" r="3" strokeWidth="4" />
      <path strokeWidth="4" d="M8 39c1.4-5.6 5.9-9 12-9h7.5c3 0 5.2 1.4 6.6 4l1.1 2h9.6" />
      <path strokeWidth="4" d="M15 29h10.5c3 0 5.4 1.5 6.9 4.1L34 36" />
      <path strokeWidth="4" d="M33 36c.6-7.9 6.8-13 14.3-13h1.9c4 0 7.2 3.2 7.2 7.2 0 3.8-3.1 6.8-6.8 6.8H33" />
      <path strokeWidth="4" d="M36 44h9.5L56 30" />
      <path strokeWidth="4" d="M45 15h8a3 3 0 0 1 0 6h-8" />
      <path strokeWidth="4" d="M47 21l9 26" />
      <path strokeWidth="4" d="M22 31l-5 16" />
      <path strokeWidth="4" d="M11 35H7v6" />
      <path strokeWidth="4" d="M29 47h15" />
      <path strokeWidth="4" d="M38 42h7" />
      <path strokeWidth="4" d="M37 18h8" />
    </svg>
  );
}
