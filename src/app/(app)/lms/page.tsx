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
import { NeuLmsSkeleton } from "@/app/components/skeletons/NeuLmsSkeleton";
import LmsClientShell from "./LmsClientShell";

export const metadata: Metadata = {
  title: "Training Portal | Emerald Cash VMS",
  description: "Staff training and certification portal",
};

export default function LmsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <Suspense fallback={<NeuLmsSkeleton />}>
        <LmsClientShell />
      </Suspense>
    </div>
  );
}
