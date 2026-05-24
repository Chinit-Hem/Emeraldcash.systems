"use client";

import React, { useState } from "react";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import { GlassInput } from "@/shared/components/ui/glass/GlassInput";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const json = await res.json();
      
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Failed to change password");
      }

      setSuccess(true);
      
      // Close modal after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
    setLoading(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="ec-liquid-modal w-full max-w-md overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Change password"
      >
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-xl font-bold text-[var(--text)]">Change Password</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Update your password for security</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/18">
                <svg className="h-8 w-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-[var(--text)]">Password changed successfully</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Closing...</p>
            </div>
          ) : (
            <>
              <GlassInput
                type="password"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                required
              />

              <GlassInput
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 4 characters)"
                autoComplete="new-password"
                required
              />

              <GlassInput
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
              />

              {error ? (
                <div className="rounded-xl border border-red-500/35 bg-red-500/12 p-3">
                  <p className="text-sm text-[var(--ec-danger-text)]">{error}</p>
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <GlassButton
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={loading}
                >
                  Change Password
                </GlassButton>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
