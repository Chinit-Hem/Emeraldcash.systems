import AppShell from "@/shared/layouts/AppShell";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AppShell>{children}</AppShell>
    </ErrorBoundary>
  );
}
