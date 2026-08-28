import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

export const TukTukIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M10.5 34.5h2V22.25A9.25 9.25 0 0 1 21.75 13h30.5c4.25 0 7.5 2.4 9.25 6.25L66 29.5v4h-4.5" />
      <path d="M12.5 34.5h14l5.5 5.25h16V17.5h-14v22.25" />
      <path d="M48 17.5h10.25l4.75 12H48" />
      <path d="M12.5 34.5H10v4h2.5v8h41a10 10 0 0 1 19.5 0h1v-8h-4" />
      <path d="M15 46.5a7 7 0 0 0 14 0" />
      <circle cx="63.25" cy="48" r="7" />
    </svg>
  )
);

TukTukIcon.displayName = "TukTukIcon";
