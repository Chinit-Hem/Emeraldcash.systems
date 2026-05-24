function SmsCardSkeleton() {
  return (
    <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70 shadow-xl dark:border-slate-700 dark:bg-slate-900/80" />
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="animate-pulse space-y-8">
        <div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SmsCardSkeleton key={index} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SmsCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
