import type { ReactNode } from "react";

export default function EnterpriseCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "rounded-2xl border border-white/20 bg-white/70 dark:border-gray-800/70 dark:bg-slate-900/50 shadow-md backdrop-blur-xl " +
        className
      }
    >
      {children}
    </section>
  );
}

