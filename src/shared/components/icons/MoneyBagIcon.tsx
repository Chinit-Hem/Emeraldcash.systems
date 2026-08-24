import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

export const MoneyBagIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <image
        href="/assets/money-bag.png"
        x="2"
        y="2"
        width="20"
        height="20"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  )
);

MoneyBagIcon.displayName = "MoneyBagIcon";

