"use client";

export default function SkeletonDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Hero Skeleton */}
      <div className="ec-skeleton-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="ec-skeleton-line ec-skeleton-line-lg w-48" />
            <div className="ec-skeleton-line ec-skeleton-line-sm w-64" />
          </div>
          <div className="flex items-center gap-3">
            <div className="ec-skeleton-line ec-skeleton-line-sm w-24" />
            <div className="ec-skeleton-line ec-skeleton-line-sm w-32" />
          </div>
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="ec-skeleton-card">
            <div className="ec-skeleton-line ec-skeleton-line-sm w-20 mb-3" />
            <div className="ec-skeleton-line ec-skeleton-line-lg w-16" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ec-skeleton-card">
          <div className="ec-skeleton-line ec-skeleton-line-sm w-32 mb-4" />
          <div className="h-48 bg-slate-200/30 dark:bg-slate-700/30 rounded-lg" />
        </div>
        <div className="ec-skeleton-card">
          <div className="ec-skeleton-line ec-skeleton-line-sm w-32 mb-4" />
          <div className="h-48 bg-slate-200/30 dark:bg-slate-700/30 rounded-lg" />
        </div>
      </div>

      <div className="ec-skeleton-card">
        <div className="ec-skeleton-line ec-skeleton-line-sm w-32 mb-4" />
        <div className="h-64 bg-slate-200/30 dark:bg-slate-700/30 rounded-lg" />
      </div>

      <div className="ec-skeleton-card">
        <div className="ec-skeleton-line ec-skeleton-line-sm w-32 mb-4" />
        <div className="h-64 bg-slate-200/30 dark:bg-slate-700/30 rounded-lg" />
      </div>
    </div>
  );
}
