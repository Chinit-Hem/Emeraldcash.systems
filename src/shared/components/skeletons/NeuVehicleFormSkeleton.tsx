/**
 * Neumorphic Vehicle Form Skeleton
 * Mimics the exact layout of the Vehicle Form with neumorphic shadows
 */

"use client";

import React from "react";

export function NeuVehicleFormSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 shadow-sm" />
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl shadow-sm" />
        </div>

        {/* Form Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
                <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Input fields */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse" />
                    <div className="h-14 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-md shadow-sm animate-pulse" />
                    <div className="h-14 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
                <div className="h-6 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
              </div>
              <div className="h-32 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm animate-pulse" />
            </div>
          </div>

          {/* Right Column - Image & Actions */}
          <div className="space-y-6">
            {/* Image Upload Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
              </div>
              
              {/* Image placeholder */}
              <div className="aspect-square bg-white dark:bg-slate-900 rounded-[20px] shadow-sm animate-pulse flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 shadow-sm" />
              </div>
              
              <div className="mt-4 h-12 bg-slate-200 dark:bg-slate-700 rounded-[16px] shadow-sm animate-pulse" />
            </div>

            {/* Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-sm animate-pulse" />
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse" />
              </div>

              <div className="space-y-4">
                <div className="h-14 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm animate-pulse" />
                <div className="h-14 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm animate-pulse" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-[16px] shadow-sm animate-pulse" />
              <div className="h-14 bg-white dark:bg-slate-900 rounded-[16px] shadow-sm animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NeuVehicleFormSkeleton;
