"use client";

import { useRouter } from "next/navigation";
import { useAuthUser } from "@/app/components/AuthContext";
import { AlertCircle, ArrowLeftRight, CheckCircle, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { validateTransferForm } from "@/lib/sms-validation";
import {
  SmsPageHeader,
  SmsPageShell,
  smsDividerClass,
  smsDropzoneClass,
  smsErrorTextClass,
  smsHelperClass,
  smsInputClass,
  smsLabelClass,
  smsLoadingFieldClass,
  smsPanelClass,
  smsPrimaryButtonClass,
  smsSecondaryButtonClass,
  smsSelectClass,
  smsTextareaClass,
} from "../components/SmsShared";
import { uploadSmsImage } from "../components/smsUpload";

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

type TransferFormState = {
  assetSearch: string;
  senderId: string;
  receiverId: string;
  location: string;
  remark: string;
};

type CreateAssetResult =
  | { success: true; assetId: string }
  | { success: false; error: string };

const SMS_ASSETS_URL = "/api/sms/assets?pageSize=100";
const NEW_ASSET_VALIDATION_ID = "00000000-0000-4000-8000-000000000000";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const smsInvalidFieldClass =
  "border-red-500 bg-red-50 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/20 dark:focus:ring-red-500";

function toAssetOption(asset: SmsAssetApiItem): SmsAssetOption {
  return { id: asset.id, name: asset.name, itemCode: asset.itemCode };
}

async function fetchAssetOptions(): Promise<SmsAssetOption[]> {
  const response = await fetch(SMS_ASSETS_URL);
  const data = await response.json().catch(() => ({}));
  return data.success && Array.isArray(data.data) ? data.data.map(toAssetOption) : [];
}

function isValidUUID(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function findAssetByInput(assets: SmsAssetOption[], input: string): SmsAssetOption | undefined {
  const query = input.toLowerCase();
  return assets.find(
    (asset) =>
      asset.name.toLowerCase() === query ||
      asset.itemCode?.toLowerCase() === query
  );
}

async function createAssetFromTransfer(assetName: string): Promise<CreateAssetResult> {
  try {
    const response = await fetch("/api/sms/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: assetName.trim(),
        type: "Other",
        quantity: 1,
        status: "Available",
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success || typeof result.data?.id !== "string") {
      return { success: false, error: result.error || "Failed to create asset" };
    }

    return { success: true, assetId: result.data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create asset" };
  }
}

export default function TransferPage() {
  const user = useAuthUser();
  const canChooseSender = user.role === "Admin" || user.role === "Transfer";
  const router = useRouter();

  const [form, setForm] = useState<TransferFormState>({
    assetSearch: "",
    senderId: "",
    receiverId: "",
    location: "",
    remark: "",
  });

  const [selectedAssetId, setSelectedAssetId] = useState("");
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

  const loadAssets = useCallback(async () => {
    setAssets(await fetchAssetOptions());
  }, []);

  useEffect(() => {
    loadAssets()
      .catch(() => {
        // silently fail; user can still type a UUID manually
      })
      .finally(() => setAssetsLoading(false));
  }, [loadAssets]);

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

  const handleChange = (field: keyof TransferFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const buildTransferPayload = (assetId: string) => ({
    assetId: assetId.trim(),
    senderId: form.senderId.trim(),
    receiverId: form.receiverId.trim(),
    location: form.location.trim(),
    remark: form.remark.trim() || undefined,
  });

  const validateTransferPayload = (assetId: string) => {
    const validation = validateTransferForm(buildTransferPayload(assetId));

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setGeneralError("Please fix the errors below.");
    }

    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setSuccess("");
    setFieldErrors({});

    const assetInput = (selectedAssetId || form.assetSearch).trim();
    const matchedAsset = selectedAssetId ? undefined : findAssetByInput(assets, assetInput);
    const isNewAsset = assetInput.length >= 2 && !selectedAssetId && !isValidUUID(assetInput) && !matchedAsset;
    let finalAssetId = selectedAssetId || matchedAsset?.id || assetInput;

    if (!validateTransferPayload(isNewAsset ? NEW_ASSET_VALIDATION_ID : finalAssetId)) {
      return;
    }

    setLoading(true);
    try {
      if (isNewAsset) {
        const createResult = await createAssetFromTransfer(assetInput);
        if (!createResult.success) {
          throw new Error(createResult.error || "Failed to create new asset");
        }

        finalAssetId = createResult.assetId;
        void loadAssets().catch(() => undefined);
      }

      const imageUrl = await uploadSmsImage({
        file: imageFile,
        folder: "sms/transfers/images",
        publicIdPrefix: "transfer",
        entityId: finalAssetId,
      });
      const res = await fetch("/api/sms/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...buildTransferPayload(finalAssetId),
          imageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create transfer");
      }

      setSuccess(isNewAsset ? "New asset created and transfer successful!" : "Transfer created successfully!");
      setTimeout(() => router.push("/sms"), 1200);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  const userLabel = (u: SettingsUser) =>
    u.full_name ? `${u.full_name} (@${u.username})` : `@${u.username}`;

  const assetSearchQuery = form.assetSearch.toLowerCase();
  const visibleAssets = assets
    .filter(
      (asset) =>
        !assetSearchQuery ||
        asset.name.toLowerCase().includes(assetSearchQuery) ||
        (asset.itemCode?.toLowerCase().includes(assetSearchQuery) ?? false) ||
        asset.id.toLowerCase().includes(assetSearchQuery)
    )
    .slice(0, 10);

  return (
    <SmsPageShell maxWidth="max-w-2xl">
      <SmsPageHeader
        title="New Transfer"
        description="Send an SMS asset to another user, with an optional photo and receiver note."
        icon={ArrowLeftRight}
        tone="amber"
      />

      {generalError && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{generalError}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{success}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`${smsPanelClass} space-y-6 p-4 md:p-6`}
      >
        <div id="asset-dropdown-container" className="relative">
          <label className={smsLabelClass}>
            Asset <span className="text-red-500">*</span>
          </label>
          {assetsLoading ? (
            <div className={smsLoadingFieldClass}>
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
                  if (selectedAssetId) setSelectedAssetId("");
                }}
                onFocus={() => setAssetDropdownOpen(true)}
                className={`${smsInputClass} ${
                  fieldErrors.assetId
                    ? smsInvalidFieldClass
                    : ""
                }`}
                placeholder="Select an asset or enter asset ID"
                disabled={loading}
                autoComplete="off"
                title="Select an asset or enter asset ID"
              />
              {!loading && assets.length > 0 && assetDropdownOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                  {visibleAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setSelectedAssetId(asset.id);
                        handleChange("assetSearch", asset.name);
                        setAssetDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{asset.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {asset.itemCode ? `(${asset.itemCode})` : asset.id.slice(0, 8)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {fieldErrors.assetId && (
            <p className={smsErrorTextClass}>
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.assetId}
            </p>
          )}
        </div>

        {/* Sender */}
        <div>
          <label className={smsLabelClass}>
            Sender <span className="text-red-500">*</span>
          </label>
          {!canChooseSender ? (
            <input
              type="text"
              title="Sender"
              value={user.full_name ? `${user.full_name} (@${user.username})` : `@${user.username}`}
              className={smsInputClass}
              disabled
            />
          ) : usersLoading ? (
            <div className={smsLoadingFieldClass}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading users...
            </div>
          ) : users.length > 0 ? (
            <select
              title="Select sender"
              value={form.senderId}
              onChange={(e) => handleChange("senderId", e.target.value)}
              className={`${smsSelectClass} ${
                fieldErrors.senderId
                  ? smsInvalidFieldClass
                  : ""
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
              title="Sender"
              value={form.senderId}
              onChange={(e) => handleChange("senderId", e.target.value)}
              className={`${smsInputClass} ${
                fieldErrors.senderId
                  ? smsInvalidFieldClass
                  : ""
              }`}
              placeholder="Enter sender username"
              disabled={loading}
            />
          )}
          {fieldErrors.senderId && (
            <p className={smsErrorTextClass}>
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.senderId}
            </p>
          )}
        </div>

        {/* Receiver */}
        <div>
          <label className={smsLabelClass}>
            Receiver <span className="text-red-500">*</span>
          </label>
          {usersLoading ? (
            <div className={smsLoadingFieldClass}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading users...
            </div>
          ) : users.length > 0 ? (
            <select
              title="Select receiver"
              value={form.receiverId}
              onChange={(e) => handleChange("receiverId", e.target.value)}
              className={`${smsSelectClass} ${
                fieldErrors.receiverId
                  ? smsInvalidFieldClass
                  : ""
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
              title="Receiver"
              value={form.receiverId}
              onChange={(e) => handleChange("receiverId", e.target.value)}
              className={`${smsInputClass} ${
                fieldErrors.receiverId
                  ? smsInvalidFieldClass
                  : ""
              }`}
              placeholder="Enter receiver username"
              disabled={loading}
            />
          )}
          {fieldErrors.receiverId && (
            <p className={smsErrorTextClass}>
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.receiverId}
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className={smsLabelClass}>
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            title="Location"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
            className={`${smsInputClass} ${
              fieldErrors.location
                ? smsInvalidFieldClass
                : ""
            }`}
            placeholder="e.g. Warehouse A, Office Building"
            disabled={loading}
            maxLength={128}
          />
          {fieldErrors.location && (
            <p className={smsErrorTextClass}>
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.location}
            </p>
          )}
        </div>

        {/* Message */}
        <div>
          <label className={smsLabelClass}>
            Message to receiver (Optional)
          </label>
          <textarea
            title="Message to receiver"
            value={form.remark}
            onChange={(e) => handleChange("remark", e.target.value)}
            className={`${smsTextareaClass} h-24 resize-none ${
              fieldErrors.remark
                ? smsInvalidFieldClass
                : ""
            }`}
            placeholder="Example: Please accept this projector for the Sen Sok meeting room..."
            disabled={loading}
            maxLength={500}
          />
          {fieldErrors.remark && (
            <p className={smsErrorTextClass}>
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.remark}
            </p>
          )}
          <p className={smsHelperClass}>{form.remark.length}/500</p>
        </div>

        {/* Image */}
        <div>
          <label className={smsLabelClass}>
            Transfer Image (Optional)
          </label>
          <div className={smsDropzoneClass}>
            {imageFile ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{imageFile.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{(imageFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  disabled={loading}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  aria-label="Remove transfer image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-gray-600 dark:text-gray-300">
                <Upload className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                <span className="font-semibold text-gray-800 dark:text-white">Upload transfer photo</span>
                <span>JPG, PNG, WebP, or GIF</span>
                <input
                  type="file"
                  title="Upload transfer photo"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={loading}
                  onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
        </div>

        <div className={`flex flex-col gap-3 pt-4 sm:flex-row ${smsDividerClass}`}>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className={smsSecondaryButtonClass}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className={`${smsPrimaryButtonClass} flex-1`}
          >
            {loading ? "Creating..." : "Create Transfer + Stock"}
          </button>
        </div>
      </form>
    </SmsPageShell>
  );
}

