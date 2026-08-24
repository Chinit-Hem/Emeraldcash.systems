import type { ReactNode } from "react";

export default function EnterpriseEmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

