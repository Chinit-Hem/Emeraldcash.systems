// src/components/ui/badge.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/ui";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80",
        secondary:
          "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-100/80",
        destructive:
          "border-transparent bg-red-100 text-red-800 hover:bg-red-100/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
