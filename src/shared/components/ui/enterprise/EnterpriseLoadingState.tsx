export function EnterpriseLoadingState({
  text = "Loading...",
}: {
  text?: string;
}) {
  return (
    <div className="min-h-[220px] flex items-center justify-center">
      <div className="rounded-2xl border border-white/20 bg-white/60 p-6 text-center shadow-md backdrop-blur-xl dark:border-gray-800/70 dark:bg-slate-900/40">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-neu-bg-dark border-t-emerald-500/90" />
        <div className="text-sm text-slate-600 dark:text-slate-300">{text}</div>
      </div>
    </div>
  );
}

