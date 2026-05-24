"use client";

import { cn } from "@/shared/utils/ui";
import { Car, DollarSign, Image, Wrench } from "lucide-react";
import React from "react";

// ============================================================================
// Form Skeleton Components
// ============================================================================

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-slate-200 animate-pulse rounded-xl h-12",
      "shadow-sm",
      className
    )} />
  );
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-slate-100 animate-pulse rounded-xl",
      "shadow-sm",
      className
    )} />
  );
}

function SectionSkeleton({ 
  title, 
  icon: Icon, 
  rows = 2,
  className 
}: { 
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
      </div>
      
      {/* Form Rows */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            <SkeletonBar />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Form Skeleton
// ============================================================================

export function FormSkeleton({ 
  layout = "default",
  wizardStep = 1,
  totalSteps = 3
}: { 
  layout?: "default" | "compact" | "modal" | "wizard";
  wizardStep?: number;
  totalSteps?: number;
}) {
  if (layout === "wizard") {
    return (
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        {/* Wizard Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                i + 1 === wizardStep 
                  ? "bg-emerald-500 text-white shadow-lg" 
                  : i < wizardStep 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-slate-100 text-slate-500"
              )}
            >
              {i + 1 < wizardStep ? "✓" : i + 1}
            </div>
          ))}
        </div>
        
        {/* Current Step Content */}
        <SectionSkeleton 
          title="Step Content" 
          icon={Car} 
          rows={3}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "space-y-6 p-6",
      layout === "compact" && "max-w-md",
      layout === "modal" && "max-w-4xl",
      layout === "default" && "max-w-2xl"
    )}>
      {/* Image Section */}
      <SectionSkeleton 
        title="Vehicle Image" 
        icon={Image} 
        rows={1}
      />
      
      {/* Basic Info */}
      <SectionSkeleton 
        title="Basic Information" 
        icon={Car}
        rows={3}
      />
      
      {/* Specifications */}
      <SectionSkeleton 
        title="Specifications" 
        icon={Wrench}
        rows={3}
      />
      
      {/* Pricing */}
      <SectionSkeleton 
        title="Pricing" 
        icon={DollarSign}
        rows={2}
      />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
        <SkeletonPulse className="h-12 flex-1" />
        <SkeletonPulse className="h-12 w-32" />
      </div>
    </div>
  );
}

// ============================================================================
// Modal Skeleton (for AddVehicleModal)
// ============================================================================

export function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <SkeletonPulse className="h-8 w-48 mb-2" />
              <SkeletonPulse className="h-4 w-64" />
            </div>
            <SkeletonPulse className="w-10 h-10 rounded-xl" />
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <FormSkeleton layout="modal" />
        </div>
      </div>
    </div>
  );
}
