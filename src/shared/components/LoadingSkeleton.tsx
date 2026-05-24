"use client";

import React from "react";

type VehicleListSkeletonProps = {
  count?: number;
};

export function VehicleListSkeleton({ count = 5 }: VehicleListSkeletonProps) {
  return (
    <div className="divide-y divide-black/5 dark:divide-white/5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`p-4 flex gap-4 ${
            index % 2 === 0
              ? "bg-white/50 dark:bg-gray-800/30"
              : "bg-gray-50/50 dark:bg-gray-800/20"
          }`}
        >
          {/* Image skeleton */}
          <div className="flex-shrink-0">
            <div className="h-20 w-20 rounded-xl skeleton skeleton-pulse" />
          </div>

          {/* Content skeleton */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-2 flex-1">
                <div className="skeleton skeleton-text skeleton-text-lg w-3/4" />
                <div className="skeleton skeleton-text w-1/2" />
              </div>
              <div className="h-6 w-16 rounded-full skeleton skeleton-pulse flex-shrink-0" />
            </div>

            <div className="flex items-center gap-4">
              <div className="skeleton skeleton-text w-24" />
              <div className="skeleton skeleton-text w-20" />
            </div>

            <div className="flex items-center justify-between">
              <div className="skeleton skeleton-text skeleton-text-lg w-20" />
              <div className="flex items-center gap-1">
                <div className="h-10 w-10 rounded-lg skeleton skeleton-pulse" />
                <div className="h-10 w-10 rounded-lg skeleton skeleton-pulse" />
                <div className="h-10 w-10 rounded-lg skeleton skeleton-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function TableSkeleton({ rows = 5, columns = 8 }: TableSkeletonProps) {
  return (
    <tbody className="bg-transparent divide-y divide-black/5 dark:divide-white/5">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr
          key={rowIndex}
          className={
            rowIndex % 2 === 0
              ? "bg-white/50 dark:bg-gray-800/30"
              : "bg-gray-50/50 dark:bg-gray-800/20"
          }
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
              <div
                className={`skeleton skeleton-pulse ${
                  colIndex === 0
                    ? "h-4 w-8"
                    : colIndex === 1
                    ? "h-10 w-10 rounded-lg"
                    : "h-4"
                }`}
                style={{
                  width:
                    colIndex === 0
                      ? "2rem"
                      : colIndex === 1
                      ? "2.5rem"
                      : colIndex === 2
                      ? "4rem"
                      : colIndex === 3
                      ? "5rem"
                      : colIndex === 4
                      ? "6rem"
                      : colIndex === 5
                      ? "3rem"
                      : colIndex === 6
                      ? "4rem"
                      : colIndex === 7
                      ? "6rem"
                      : "100%",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

type CardSkeletonProps = {
  className?: string;
};

export function CardSkeleton({ className = "" }: CardSkeletonProps) {
  return (
    <div className={`p-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm ring-1 ring-black/5 dark:ring-white/10 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 rounded-xl skeleton skeleton-pulse" />
        <div className="flex-1 space-y-2">
          <div className="skeleton skeleton-text skeleton-text-lg w-1/3" />
          <div className="skeleton skeleton-text w-1/4" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text w-5/6" />
        <div className="skeleton skeleton-text w-4/6" />
      </div>
    </div>
  );
}

type DashboardSkeletonProps = {
  kpiCount?: number;
};

export function DashboardSkeleton({ kpiCount = 4 }: DashboardSkeletonProps) {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: kpiCount }).map((_, index) => (
          <div key={index}>
            <CardSkeleton />
          </div>
        ))}

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton className="h-80" />
        <CardSkeleton className="h-80" />
      </div>
    </div>
  );
}

const LoadingSkeleton = {
  VehicleListSkeleton,
  TableSkeleton,
  CardSkeleton,
  DashboardSkeleton,
};

export default LoadingSkeleton;
