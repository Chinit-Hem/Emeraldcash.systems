"use client";

import React from "react";

/**
 * Neumorphic Vehicle List Skeleton
 * Mimics the mobile vehicle card layout with neumorphic shadows
 * for seamless loading transitions on mobile devices
 */

// Mobile Vehicle Card Skeleton
function MobileVehicleCardSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Main Card Content */}
      <div className="flex gap-3">
        {/* Vehicle Image Skeleton */}
        <div className="flex-shrink-0">
          <div className="h-16 w-16 rounded-xl bg-gray-200 dark:bg-slate-700 shadow-sm" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-2 flex-1">
              <div className="h-5 w-3/4 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            </div>
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-700 shadow-sm flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between">
            <div className="h-6 w-20 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            <div className="h-4 w-12 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

// iOS Vehicle Card Skeleton with expanded details
function IOSVehicleCardSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Main Card Content */}
      <div className="flex gap-3">
        {/* Vehicle Image Skeleton */}
        <div className="flex-shrink-0">
          <div className="h-16 w-16 rounded-xl bg-gray-200 dark:bg-slate-700 ring-1 ring-black/10 shadow-sm" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-2 flex-1">
              <div className="h-5 w-3/4 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            </div>
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-700 shadow-sm flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between">
            <div className="h-6 w-20 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            <div className="flex items-center gap-1">
              <div className="h-4 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
              <div className="h-4 w-4 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details Skeleton */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 h-10 bg-gray-200 dark:bg-slate-700 rounded-xl shadow-sm" 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Search Bar Skeleton
function SearchBarSkeleton() {
  return (
    <div className="mb-4 rounded-xl bg-white dark:bg-slate-900 p-1 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-5 w-5 bg-gray-200 dark:bg-slate-700 rounded-full shadow-sm" />
        <div className="flex-1 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
      </div>
    </div>
  );
}

// iOS Status Bar Skeleton
function IOSStatusBarSkeleton() {
  return (
    <div className="mb-4 rounded-lg bg-emerald-600 px-4 py-3 shadow-md animate-pulse">
      <div className="h-3 w-48 bg-white/30 dark:bg-white/20 rounded-lg" />
    </div>
  );
}

// Pagination Skeleton for Mobile
function MobilePaginationSkeleton() {
  return (
    <div className="mt-4 flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm animate-pulse">
      <div className="h-10 w-20 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
      
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 bg-emerald-600 rounded-lg shadow-sm" />
        <div className="h-4 w-4 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
        <div className="h-4 w-4 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
      </div>
      
      <div className="h-10 w-20 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-sm" />
    </div>
  );
}

// Main Vehicle List Skeleton - Updated to match Dashboard/LMS white style
export function NeuVehicleListSkeleton({ 
  count = 6, 
  variant = "mobile",
  showIOSStatus = false 
}: { 
  count?: number;
  variant?: "mobile" | "ios";
  showIOSStatus?: boolean;
}) {
  return (
    <div className="min-h-screen pb-20 lg:pb-0 bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-sm animate-pulse" />
          <div className="h-10 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-sm animate-pulse" />
        </div>

        {/* Quick Filters Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="h-24 bg-white dark:bg-slate-900 rounded-3xl shadow-sm animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm animate-pulse">
          <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-sm" />
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm overflow-hidden animate-pulse">
          <div className="h-16 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-100 dark:border-slate-800" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 border-b border-slate-100 dark:border-slate-800 last:border-0" />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-white dark:bg-slate-900 rounded-lg shadow-sm animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-10 w-20 bg-white dark:bg-slate-900 rounded-xl shadow-sm animate-pulse" />
            <div className="h-10 w-16 bg-white dark:bg-slate-900 rounded-xl shadow-sm animate-pulse" />
            <div className="h-10 w-20 bg-white dark:bg-slate-900 rounded-xl shadow-sm animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop Vehicle Card Skeleton
function DesktopVehicleCardSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="bg-slate-100 dark:bg-slate-800 rounded-[16px] p-4 shadow-sm animate-pulse"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* Image */}
        <div className="h-20 w-20 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700 shadow-sm" />
            <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700 shadow-sm" />
            <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700 shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop Vehicle List Skeleton
export function NeuVehicleListSkeletonDesktop({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <DesktopVehicleCardSkeleton key={index} index={index} />
      ))}
    </div>
  );
}

export default NeuVehicleListSkeleton;
