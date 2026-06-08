export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-72 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" />
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
