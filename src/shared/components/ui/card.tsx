// src/components/ui/card.tsx
import { cn } from "@/shared/utils/ui";

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
);
Card.displayName = "Card";

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      className
    )}
    {...props}
  />
);
CardHeader.displayName = "CardHeader";

const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
);
CardTitle.displayName = "CardTitle";

const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
