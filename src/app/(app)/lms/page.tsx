/**
 * LMS (Learning Management System) Page
 * 
 * Main training portal for staff to:
 * - View training categories and lessons
 * - Watch YouTube training videos
 * - Track completion progress
 * - Access step-by-step instructions
 * 
 * Unified page for both Admin and Staff roles.
 * Admin sees additional stats and staff management features.
 * 
 * @module lms/page
 */

import { Suspense } from "react";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { lmsService } from "@/services/LmsService";
import { NeuLmsSkeleton } from "@/app/components/skeletons/NeuLmsSkeleton";
import type { InitialLmsData } from "@/lib/lms-types";

const LmsDashboard = dynamic(() => import("@/app/components/lms/LmsDashboard"), {
  loading: () => <NeuLmsSkeleton />,
});

// Server prefetch - eliminates client loading spinner
async function getInitialLmsData(): Promise<InitialLmsData | null> {
  'use server';
  const { lmsService } = await import('@/services/LmsService');
  try {
    const result = await lmsService.getLmsDashboardInitial();
return result.success ? result.data ?? null : null;
  } catch (error) {
    console.error('[LmsPage] Initial data fetch error:', error);
    return null;
  }
}

export const metadata: Metadata = {
  title: "Training Portal | Emerald Cash VMS",
  description: "Staff training and certification portal",
};

export default async function LmsPage() {
  const initialData = await getInitialLmsData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <Suspense fallback={<NeuLmsSkeleton />}>
        <LmsDashboard initialData={initialData} />
      </Suspense>
    </div>
  );
}
