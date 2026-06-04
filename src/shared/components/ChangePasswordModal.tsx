"use client";

import React, { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Lock, XCircle } from "lucide-react";
import { isCommonWeakPassword, MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          disabled={disabled}
          aria-label={showPassword ? "Hide password" : "Show password"}
          title={showPassword ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordRules = [
    {
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      valid: newPassword.length >= MIN_PASSWORD_LENGTH,
    },
    {
      label: "Not a common password",
      valid: newPassword.length > 0 && !isCommonWeakPassword(newPassword),
    },
    {
      label: "Different from current password",
      valid: currentPassword.length > 0 && newPassword.length > 0 && currentPassword !== newPassword,
    },
    {
      label: "Confirmation matches",
      valid: confirmPassword.length > 0 && newPassword === confirmPassword,
    },
  ];
  const canSubmit = Boolean(currentPassword) && passwordRules.every((rule) => rule.valid) && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required");
      return;
    }
    if (!passwordRules.every((rule) => rule.valid)) {
      setError("Please meet all password requirements before saving.");
      return;
    }

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Change password"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Change Password</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Update your password for security.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
              </div>
              <p className="font-semibold text-slate-950 dark:text-white">Password changed successfully</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Closing...</p>
            </div>
          ) : (
            <>
              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Enter current password"
                autoComplete="current-password"
                disabled={loading}
              />

              <PasswordField
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new password (min 8 characters)"
                autoComplete="new-password"
                disabled={loading}
              />

              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={loading}
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Password requirements
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {passwordRules.map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-2 text-sm ${
                        rule.valid
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {rule.valid ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-500/35 dark:bg-red-500/10">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                >
                  {loading ? "Changing..." : "Change Password"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
