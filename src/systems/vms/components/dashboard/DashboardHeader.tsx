"use client";

import { useAuthUser } from "@/shared/hooks/AuthContext";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DashboardHeader() {
  const user = useAuthUser();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <>
      <div className="ec-glassPanel ec-theme-overlay-host rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden">
              <Image
                src="/logo.png"
                alt="Emerald Cash"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 640px) 48px, 56px"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Emerald Cash
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Vehicle Management System
              </p>
            </div>
          </div>

          {/* User Info, Theme Toggle and Logout */}
          <div className="hidden sm:flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {user.username}
              </p>
              <p className="text-xs text-[var(--text-secondary)] capitalize">
                {user.role}
              </p>
            </div>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </GlassButton>
          </div>
        </div>

        {/* Mobile User Info */}
        <div className="sm:hidden mt-3 pt-3 border-t border-[var(--glass-border)]">
          <p className="text-sm text-[var(--text-secondary)]">
            Logged in as <span className="font-semibold text-[var(--text-primary)]">{user.username}</span> ({user.role})
          </p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] p-4 backdrop-blur-sm">
          <div className="ec-glassCard w-full max-w-sm p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full border border-[var(--glass-border)] bg-[var(--accent-red-soft)] p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-[var(--accent-red)]"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Confirm Logout
              </h3>
            </div>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">
              Are you sure you want to logout? You will need to login again to access the system.
            </p>
            <div className="flex gap-3 justify-end">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="danger"
                size="sm"
                onClick={handleLogout}
                isLoading={isLoggingOut}
              >
                Logout
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
