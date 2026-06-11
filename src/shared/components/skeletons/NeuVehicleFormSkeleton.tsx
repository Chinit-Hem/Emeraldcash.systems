/**
 * Neumorphic Vehicle Form Skeleton
 * Visible loading state for add/edit vehicle forms.
 */

"use client";

import React from "react";
import { cn } from "@/shared/utils/ui";

type NeuVehicleFormSkeletonProps = {
  variant?: "page" | "modal";
};

function SkeletonBlock({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("ec-skeleton rounded-xl", className)}
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    />
  );
}

function SkeletonField({ delay = 0 }: { delay?: number }) {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-4 w-24" delay={delay} />
      <SkeletonBlock className="h-12 rounded-2xl sm:h-14" delay={delay + 60} />
    </div>
  );
}

function SkeletonSection({
  titleWidth = "w-40",
  children,
  delay = 0,
}: {
  titleWidth?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-[0_18px_45px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10 rounded-2xl" delay={delay} />
        <SkeletonBlock className={cn("h-5", titleWidth)} delay={delay + 80} />
      </div>
      {children}
    </section>
  );
}

export function NeuVehicleFormSkeleton({ variant = "page" }: NeuVehicleFormSkeletonProps) {
  const isModal = variant === "modal";

  return (
    <div
      className={cn(
        "bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100",
        isModal ? "max-h-[90vh] overflow-y-auto" : "min-h-screen p-4 sm:p-6 lg:p-8"
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className={cn("mx-auto space-y-5", isModal ? "p-5 sm:p-6" : "max-w-6xl")}>
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-emerald-500/20 dark:from-emerald-500/12 dark:via-slate-900 dark:to-sky-500/10">
          <div className="flex items-center gap-4">
            <div className="ec-loading-orbit h-14 w-14 flex-shrink-0 rounded-2xl" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-44 max-w-full" />
              <SkeletonBlock className="h-3 w-72 max-w-full" delay={90} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-5">
            <SkeletonSection titleWidth="w-44">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonField key={index} delay={index * 55} />
                ))}
              </div>
            </SkeletonSection>

            <SkeletonSection titleWidth="w-32" delay={140}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonField key={index} delay={160 + index * 65} />
                ))}
              </div>
            </SkeletonSection>

            <SkeletonSection titleWidth="w-36" delay={220}>
              <SkeletonBlock className="h-28 rounded-2xl sm:h-36" delay={260} />
            </SkeletonSection>
          </div>

          <div className="space-y-5">
            <SkeletonSection titleWidth="w-32" delay={180}>
              <SkeletonBlock className="aspect-square rounded-3xl" delay={220} />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-16 rounded-2xl" delay={260 + index * 70} />
                ))}
              </div>
            </SkeletonSection>

            <SkeletonSection titleWidth="w-28" delay={260}>
              <div className="space-y-4">
                <SkeletonField delay={300} />
                <SkeletonField delay={360} />
              </div>
            </SkeletonSection>

            <div className="grid gap-3">
              <SkeletonBlock className="h-12 rounded-2xl" delay={420} />
              <SkeletonBlock className="h-12 rounded-2xl" delay={480} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VehicleFormModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 px-4 py-8 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-4 dark:border-emerald-500/20 dark:from-slate-900 dark:to-slate-950">
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-10 w-10 rounded-xl" delay={80} />
          </div>
          <NeuVehicleFormSkeleton variant="modal" />
        </div>
      </div>
    </div>
  );
}

export default NeuVehicleFormSkeleton;
