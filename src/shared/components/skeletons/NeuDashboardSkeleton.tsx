"use client";

import React from "react";

/**
 * Neumorphic Dashboard Skeleton
 * Mimics the exact layout of the Vehicles Dashboard with neumorphic shadows
 * for seamless loading transitions
 */

// KPI Card Skeleton with neumorphic styling
function KpiCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[20px] p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm" />
      </div>
      <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm mb-2" />
      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
    </div>
  );
}

// Filter Bar Skeleton
function FilterBarSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[20px] p-4 shadow-sm mb-6 animate-pulse">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search input skeleton */}
        <div className="flex-1 min-w-[200px] h-12 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm" />
        
        {/* Filter dropdowns */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="w-32 h-12 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm" 
          />
        ))}
        
        {/* Action buttons */}
        <div className="w-24 h-12 bg-slate-200 dark:bg-slate-700 rounded-[16px] shadow-sm" />
        <div className="w-24 h-12 bg-slate-200 dark:bg-slate-700 rounded-[16px] shadow-sm" />
      </div>
    </div>
  );
}

// Table Header Skeleton
function TableHeaderSkeleton() {
  return (
    <div className="flex items-center gap-2 mb-3 animate-pulse">
      <div className="h-10 w-32 bg-white dark:bg-slate-900 rounded-[12px] shadow-sm" />
      <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-[12px] shadow-sm ml-auto" />
    </div>
  );
}

// Table Row Skeleton
function TableRowSkeleton({ index }: { index: number }) {
  return (
    <tr className={`${index % 2 === 0 ? "bg-slate-100 dark:bg-slate-800/50" : ""}`}>
      {/* ID */}
      <td className="px-4 py-3">
        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
      </td>
      
      {/* Image */}
      <td className="px-4 py-3">
        <div className="h-12 w-12 rounded-lg bg-white dark:bg-slate-900 shadow-sm animate-pulse" />
      </td>
      
      {/* Category */}
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
      </td>
      
      {/* Brand */}
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
      </td>
      
      {/* Model */}
      <td className="px-4 py-3">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
      </td>
      
      {/* Year */}
      <td className="px-4 py-3">
        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
      </td>
      
      {/* Plate */}
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
      </td>
      
      {/* Price */}
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse ml-auto" />
      </td>
      
      {/* Price 40% */}
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse ml-auto" />
      </td>
      
      {/* Price 70% */}
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse ml-auto" />
      </td>
      
      {/* Tax Type */}
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
      </td>
      
      {/* Condition */}
      <td className="px-4 py-3">
        <div className="h-6 w-16 bg-white dark:bg-slate-900 rounded-full shadow-sm animate-pulse" />
      </td>
      
      {/* Body Type */}
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
      </td>
      
      {/* Color */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 shadow-sm animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 shadow-sm animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 shadow-sm animate-pulse" />
        </div>
      </td>
    </tr>
  );
}

// Table Skeleton
function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-auto max-h-[65vh] custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 shadow-sm">
              {['ID', 'Image', 'Category', 'Brand', 'Model', 'Year', 'Plate', 'Market Price', 'D.O.C. 40%', 'Vehicles 70%', 'Tax Type', 'Condition', 'Body Type', 'Color', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left">
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {Array.from({ length: rows }).map((_, index) => (
              <TableRowSkeleton key={index} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pagination Skeleton
function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between mt-4 p-3 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm animate-pulse">
      <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-[12px] shadow-sm" />
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-[10px] shadow-sm" />
        ))}
      </div>
      <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-[12px] shadow-sm" />
    </div>
  );
}

// Main Dashboard Skeleton
export function NeuDashboardSkeleton() {
  return (
    <div className="min-h-screen pb-20 lg:pb-0 bg-white dark:bg-slate-900">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between animate-pulse">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-[16px] shadow-sm" />
        </div>

        {/* Status Bar Skeleton */}
        <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-[20px] shadow-sm animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>

        {/* Add Button */}
        <div className="animate-pulse">
          <div className="h-12 w-40 bg-slate-200 dark:bg-slate-700 rounded-[16px] shadow-sm" />
        </div>

        {/* Filter Bar */}
        <FilterBarSkeleton />

        {/* Table */}
        <div className="space-y-3">
          <TableHeaderSkeleton />
          <TableSkeleton rows={8} />
          <PaginationSkeleton />
        </div>
      </div>
    </div>
  );
}

export default NeuDashboardSkeleton;
