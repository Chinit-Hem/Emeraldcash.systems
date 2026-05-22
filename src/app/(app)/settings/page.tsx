/**
 * Settings Page with Suspense
 * 
 * Uses dynamic imports for code splitting and instant loading states
 */

import { Suspense } from "react";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { NeuSettingsSkeleton } from "@/app/components/skeletons/NeuSettingsSkeleton";

// Lazy load the heavy settings component
const SettingsContent = dynamic(() => import("@/features/settings/components/SettingsContent"), {
  loading: () => <NeuSettingsSkeleton />,
});

export const metadata: Metadata = {
  title: "Settings | Emerald Cash Systems",
  description: "Manage your account, users, and system preferences",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<NeuSettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}
