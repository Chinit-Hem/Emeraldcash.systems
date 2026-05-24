"use client";

import React, { Suspense, ReactNode } from "react";
import { NeuDashboardSkeleton } from "@/shared/components/skeletons/NeuDashboardSkeleton";
import { NeuVehicleListSkeleton } from "@/shared/components/skeletons/NeuVehicleListSkeleton";
import { NeuLmsSkeleton } from "@/shared/components/skeletons/NeuLmsSkeleton";

type SkeletonType = "dashboard" | "vehicle-list" | "lms" | "none";

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  skeletonType?: SkeletonType;
  lmsTab?: "learning" | "progress" | "achievements" | "my-process";
}

/**
 * SuspenseBoundary - Wrapper component for React Suspense
 * 
 * Features:
 * - Provides neumorphic skeleton screens matching the actual UI
 * - Supports different skeleton types for different pages
 * - Seamless transition from skeleton to actual content
 */
export function SuspenseBoundary({ 
  children, 
  fallback,
  skeletonType = "none",
  lmsTab = "learning"
}: SuspenseBoundaryProps) {
  
  // Generate appropriate skeleton based on type
  const getSkeleton = (): ReactNode => {
    switch (skeletonType) {
      case "dashboard":
        return <NeuDashboardSkeleton />;
      case "vehicle-list":
        return <NeuVehicleListSkeleton count={6} variant="mobile" />;
      case "lms":
        return <NeuLmsSkeleton activeTab={lmsTab} />;
      case "none":
      default:
        return null;
    }
  };

  const defaultFallback = fallback || getSkeleton();

  return (
    <Suspense fallback={defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * StreamingBoundary - For streaming SSR with progressive loading
 * 
 * Features:
 * - Shows skeleton immediately
 * - Streams content as it becomes available
 * - Maintains layout stability during loading
 */
export function StreamingBoundary({ 
  children, 
  skeletonType = "dashboard",
  lmsTab = "learning"
}: Omit<SuspenseBoundaryProps, "fallback">) {
  return (
    <SuspenseBoundary 
      skeletonType={skeletonType}
      lmsTab={lmsTab}
    >
      {children}
    </SuspenseBoundary>
  );
}

export default SuspenseBoundary;
