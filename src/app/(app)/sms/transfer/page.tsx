"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, CheckCircle, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { validateTransferForm } from "@/lib/sms-validation";

interface SmsAssetOption {
  id: string;
  name: string;
  itemCode?: string | null;
}

interface SettingsUser {
  username: string;
  full_name?: string | null;
  role?: string;
  email?: string | null;
  profile_picture?: string | null;
}

export default function TransferPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    assetId: "",
    senderId: "",
    receiverId: "",
    location: "",
    remark: "",
  });

  const [assets, setAssets] = useState<SmsAssetOption[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch('/api/sms/assets?pageSize=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAssets(data.data.map((a: any) => ({ id: a.id, name: a.name, itemCode: a.itemCode })));
        }
      })
      .catch(() => {
        // silently fail; user can still type a UUID manually
      })
      .finally(() => setAssetsLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/auth/users')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      })
      .catch(() => {
        // silently fail
      })
      .finally(() => setUsersLoading(false));
  }, []);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setSuccess("");
    setFieldErrors({});

    // Validate form using schema
    const validation = validateTransferForm({
      assetId: form.assetId.trim(),
      senderId: form.senderId.trim(),
      receiverId: form.receiverId.trim(),
      location: form.location.trim(),
      remark: form.remark.trim() || undefined,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setGeneralError("Please fix the errors below.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sms/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId: form.assetId.trim(),
          senderId: form.senderId.trim(),
          receiverId: form.receiverId.trim(),
          location: form.location.trim(),
          remark: form.remark.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create transfer");
      }

      setSuccess("Transfer created successfully!");
      setTimeout(() => router.push("/sms"), 1200);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  const userLabel = (u: SettingsUser) =>
    u.full_name ? `${u.full_name} (@${u.username})` : `@${u.username}`;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back */}
      <Link
        href="/sms"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to SMS
      </Link>

      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-slate-900">New Transfer</h1>

      {/* General Error Alert */}
      {generalError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">{generalError}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="font-semibold text-emerald-900">{success}</p>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm"
      >
        {/* Asset ID */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Asset <span className="text-red-500">*</span>
          </label>
          {assetsLoading ? (
            <div className="w-full border border-slate-200 rounded-lg p-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading assets...
            </div>
          ) : assets.length > 0 ? (
            <select
              value={form.assetId}
              onChange={(e) => handleChange("assetId", e.target.value)}
              className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition-all bg-white ${
                fieldErrors.assetId
                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                  : "border-slate-300 focus:ring-emerald-500"
              }`}
              disabled={loading}
            >
              <option value="">Select an asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}{asset.itemCode ? ` (${asset.itemCode})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={form.assetId}
              onChange={(e) => handleChange("assetId", e.target.value)}
              className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.assetId
                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                  : "border-slate-300 focus:ring-emerald-500"
              }`}
              placeholder="Enter asset UUID"
              disabled={loading}
            />
          )}
          {fieldErrors.assetId && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.assetId}</p>
          )}
        </div>

        {/* Sender */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Sender <span className="text-red-500">*</span>
          </label>
          {usersLoading ? (
            <div className="w-full border border-slate-200 rounded-lg p-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading users...
            </div>
          ) : users.length > 0 ? (
            <select
              value={form.senderId}
              onChange={(e) => handleChange("senderId", e.target.value)}
              className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition-all bg-white ${
                fieldErrors.senderId
                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                  : "border-slate-300 focus:ring-emerald-500"
              }`}
              disabled={loading}
            >
              <option value="">Select sender</option>
              {users.map((user) => (
                <option key={user.username} value={user.username}>
                  {userLabel(user)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={form.senderId}
              onChange={(e) => handleChange("senderId", e.target.value)}
              className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.senderId
                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                  : "border-slate-300 focus:ring-emerald-500"
              }`}
              placeholder="Enter sender username"
              disabled={loading}
            />
          )}
          {fieldErrors.senderId && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.senderId}</p>
          )}
        </div>

        {/* Receiver */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Receiver <span className="text-red-500">*</span>
          </label>
          {usersLoading ? (
            <div className="w-full border border-slate-200 rounded-lg p-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading users...
            </div>
          ) : users.length > 0 ? (
            <select
              value={form.receiverId}
              onChange={(e) => handleChange("receiverId", e.target.value)}
              className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition-all bg-white ${
                fieldErrors.receiverId
                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                  : "border-slate-300 focus:ring-emerald-500"
              }`}
              disabled={loading}
            >
              <option value="">Select receiver</option>
              {users.map((user) => (
                <option key={user.username} value={user.username}>
                  {userLabel(user)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={form.receiverId}
              onChange={(e) => handleChange("receiverId", e.target.value)}
              className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.receiverId
                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                  : "border-slate-300 focus:ring-emerald-500"
              }`}
              placeholder="Enter receiver username"
              disabled={loading}
            />
          )}
          {fieldErrors.receiverId && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.receiverId}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
            className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition-all ${
              fieldErrors.location
                ? "border-red-300 focus:ring-red-500 bg-red-50"
                : "border-slate-300 focus:ring-emerald-500"
            }`}
            placeholder="e.g. Warehouse A, Office Building"
            disabled={loading}
            maxLength={128}
          />
          {fieldErrors.location && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p>
          )}
        </div>

        {/* Remark */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Remark (Optional)
          </label>
          <textarea
            value={form.remark}
            onChange={(e) => handleChange("remark", e.target.value)}
            className={`w-full border rounded-lg p-3 h-24 focus:outline-none focus:ring-2 transition-all resize-none ${
              fieldErrors.remark
                ? "border-red-300 focus:ring-red-500 bg-red-50"
                : "border-slate-300 focus:ring-emerald-500"
            }`}
            placeholder="Additional notes about this transfer..."
            disabled={loading}
            maxLength={500}
          />
          {fieldErrors.remark && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.remark}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">{form.remark.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}

