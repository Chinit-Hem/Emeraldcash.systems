/**
 * Neumorphic Settings Skeleton
 * Mimics the exact layout of the Settings page with neumorphic shadows
 */

"use client";

import React from "react";

export function NeuSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 shadow-sm" />
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-xl shadow-sm" />
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 shadow-sm animate-pulse mb-4" />
                
                {/* Name */}
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse mb-2" />
                
                {/* Role */}
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse mb-4" />
                
                {/* Edit Button */}
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-[16px] shadow-sm animate-pulse" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse mb-4" />
              
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse" />
                    <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Settings Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
                <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
              </div>

              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse" />
                    <div className="h-14 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="mt-6 h-12 w-32 bg-slate-200 dark:bg-slate-700 rounded-[16px] shadow-sm animate-pulse" />
            </div>

            {/* Preferences */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
                <div className="h-6 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
              </div>

              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm">
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse" />
                      <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse" />
                    </div>
                    <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded-full shadow-sm animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
              </div>

              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-12 bg-white dark:bg-slate-900 rounded-[12px] shadow-sm animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NeuSettingsSkeleton;
