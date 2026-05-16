"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { NeuLmsSkeleton } from "@/app/components/skeletons/NeuLmsSkeleton";
import type { InitialLmsData } from "@/lib/lms-types";

type LmsDashboardComponent = ComponentType<{
  initialData?: InitialLmsData | null;
}>;

export default function LmsClientShell() {
  const [Dashboard, setDashboard] = useState<LmsDashboardComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = () => {
      void import("@/app/components/lms/LmsDashboard").then((module) => {
        if (!cancelled) {
          setDashboard(() => module.default);
        }
      });
    };

    const timeoutId = window.setTimeout(loadDashboard, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!Dashboard) {
    return <NeuLmsSkeleton />;
  }

  return <Dashboard initialData={null} />;
}
