"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/app/components/AuthContext";
import { ArrowLeft, AlertCircle, CheckCircle, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { validateTransferForm } from "@/lib/sms-validation";

interface SmsAssetOption {
  id: string;
  name: string;
  itemCode?: string | null;
}

type SmsAssetApiItem = {
  id: string;
  name: string;
  itemCode?: string | null;
};

interface SettingsUser {
  username: string;
  full_name?: string | null;
  role?: string;
  email?: string | null;
  profile_picture?: string | null;
}

export default function TransferPage() {
  const user = useAuthUser();
  const canChooseSender = user.role === "Admin" || user.role === "Transfer";
  const router = useRouter();

const [form, setForm] = useState({
    assetId: "",
    assetSearch: "", // Display name in input
    senderId: "",
    receiverId: "",
    location: "",
    remark: "",
  });

const [selectedAssetId, setSelectedAssetId] = useState(""); // Actual ID when selected from dropdown
  const [assets, setAssets] = useState<SmsAssetOption[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch('/api/sms/assets?pageSize=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAssets(data.data.map((a: SmsAssetApiItem) => ({ id: a.id, name: a.name, itemCode: a.itemCode })));
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

useEffect(() => {
    if (!canChooseSender && user.username) {
      setForm((prev) => ({ ...prev, senderId: user.username }));
    }
  }, [canChooseSender, user.username]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const dropdownContainer = document.getElementById('asset-dropdown-container');
      if (dropdownContainer && !dropdownContainer.contains(target)) {
        setAssetDropdownOpen(false);
      }
    }

    if (assetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [assetDropdownOpen]);

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

const uploadTransferImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    
    // Use selectedAssetId if available, otherwise use assetSearch (typed value)
    const assetIdForUpload = selectedAssetId || form.assetSearch;
    if (!assetIdForUpload.trim()) return null;

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("folder", "sms/transfers/images");
    formData.append("publicId", `transfer_${assetIdForUpload.trim()}_${Date.now()}`);

    const response = await fetch("/api/sms/assets/upload", {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false || !result.url) {
      throw new Error(result.error || "Image upload failed");
    }

    return result.url as string;
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setSuccess("");
    setFieldErrors({});

    // Use selectedAssetId if available (from dropdown), otherwise resolve asset name to ID
    let finalAssetId = selectedAssetId || form.assetSearch.trim();
    
    // If typed value doesn't look like UUID, try to find matching asset by name or itemCode
    if (!finalAssetId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const matchedAsset = assets.find(
        (a) => a.name.toLowerCase() === finalAssetId.toLowerCase() ||
              (a.itemCode?.toLowerCase() === finalAssetId.toLowerCase())
      );
      if (matchedAsset) {
        finalAssetId = matchedAsset.id;
      }
    }
    
    // Validate form using schema
    const validation = validateTransferForm({
      assetId: finalAssetId,
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
      const imageUrl = await uploadTransferImage();
      const res = await fetch("/api/sms/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId: finalAssetId.trim(),
          senderId: form.senderId.trim(),
          receiverId: form.receiverId.trim(),
          location: form.location.trim(),
          remark: form.remark.trim() || undefined,
          imageUrl: imageUrl || undefined,
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
{/* Asset ID - Hybrid: Select from dropdown OR type manually */}
        <div id="asset-dropdown-container" className="relative">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Asset <span className="text-red-500">*</span>
          </label>
          {assetsLoading ? (
            <div className="w-full border border-slate-200 rounded-lg p-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading assets...
            </div>
          ) : (
            <>
<input
                type="text"
                value={form.assetSearch}
                onChange={(e) => {
                  handleChange("assetSearch", e.target.value);
                  // Clear selected asset when user types (treating as manual UUID entry)
                  if (selectedAssetId) setSelectedAssetId("");
                }}
                onFocus={() => setAssetDropdownOpen(true)}
                className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.assetId
                    ? "border-red-300 focus:ring-red-500 bg-red-50"
                    : "border-slate-300 focus:ring-emerald-500"
                }`}
                placeholder="Select an asset or enter asset ID"
                disabled={loading}
                autoComplete="off"
                title="Select an asset or enter asset ID"
              />
{/* Dropdown suggestions - show all on focus, filter when typing */}
              {!loading && assets.length > 0 && assetDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {assets
                    .filter(
                      (asset) =>
                        !form.assetSearch ||
                        asset.name.toLowerCase().includes(form.assetSearch.toLowerCase()) ||
                        (asset.itemCode?.toLowerCase().includes(form.assetSearch.toLowerCase()) ?? false) ||
                        asset.id.toLowerCase().includes(form.assetSearch.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          handleChange("assetSearch", asset.name);
                          setAssetDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-900">{asset.name}</span>
                        <span className="text-sm text-slate-500">
                          {asset.itemCode ? `(${asset.itemCode})` : asset.id.slice(0, 8)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </>
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
          {!canChooseSender ? (
            <input
              type="text"
              value={user.full_name ? `${user.full_name} (@${user.username})` : `@${user.username}`}
              className="w-full border rounded-lg p-3 bg-slate-100 text-slate-600 border-slate-200"
              disabled
            />
          ) : usersLoading ? (
            <div className="w-full border border-slate-200 rounded-lg p-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading users...
            </div>
) : users.length > 0 ? (
            <select
              title="Select sender"
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
              title="Select receiver"
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

        {/* Message */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Message to receiver (Optional)
          </label>
          <textarea
            value={form.remark}
            onChange={(e) => handleChange("remark", e.target.value)}
            className={`w-full border rounded-lg p-3 h-24 focus:outline-none focus:ring-2 transition-all resize-none ${
              fieldErrors.remark
                ? "border-red-300 focus:ring-red-500 bg-red-50"
                : "border-slate-300 focus:ring-emerald-500"
            }`}
            placeholder="Example: Please accept this projector for the Sen Sok meeting room..."
            disabled={loading}
            maxLength={500}
          />
          {fieldErrors.remark && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.remark}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">{form.remark.length}/500</p>
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Transfer Image (Optional)
          </label>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            {imageFile ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{imageFile.name}</div>
                    <div className="text-xs text-slate-500">{(imageFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  disabled={loading}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                  aria-label="Remove transfer image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-slate-600">
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="font-semibold text-slate-800">Upload transfer photo</span>
                <span>JPG, PNG, WebP, or GIF</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={loading}
                  onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
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
            {loading ? "Creating..." : "Create Transfer + Stock"}
          </button>
        </div>
      </form>
    </div>
  );
}

