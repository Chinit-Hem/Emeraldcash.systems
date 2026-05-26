"use client";

import { useRouter } from "next/navigation";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle,
  ImageIcon,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { validateTransferForm } from "@/systems/sms/utils/sms-validation";
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
} from "@/systems/sms/components/SmsShared";
import { uploadSmsImage } from "@/systems/sms/components/smsUpload";

type MovementMode = "send" | "return";
type SmsStatus = "Available" | "In Use" | "Borrowed" | "Out" | "Not Returned";

interface SmsMovementFormProps {
  initialMode: MovementMode;
}

interface SmsAssetOption {
  id: string;
  name: string;
  itemCode?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  status: SmsStatus;
}

type SmsAssetApiItem = {
  id: string;
  name: string;
  itemCode?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  status?: SmsStatus;
};

interface SettingsUser {
  username: string;
  full_name?: string | null;
  role?: string;
  email?: string | null;
  profile_picture?: string | null;
}

type MovementFormState = {
  assetSearch: string;
  senderId: string;
  receiverId: string;
  location: string;
  remark: string;
};

type CreateAssetResult =
  | { success: true; assetId: string }
  | { success: false; error: string };

const SMS_ASSETS_URL = "/api/sms/assets?pageSize=200";
const NEW_ASSET_VALIDATION_ID = "00000000-0000-4000-8000-000000000000";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const smsInvalidFieldClass =
  "border-red-500 bg-red-50 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/20 dark:focus:ring-red-500";

function toAssetOption(asset: SmsAssetApiItem): SmsAssetOption {
  return {
    id: asset.id,
    name: asset.name,
    itemCode: asset.itemCode,
    location: asset.location,
    assignedTo: asset.assignedTo,
    status: asset.status || "Available",
  };
}

async function fetchAssetOptions(): Promise<SmsAssetOption[]> {
  const response = await fetch(SMS_ASSETS_URL);
  const data = await response.json().catch(() => ({}));
  return data.success && Array.isArray(data.data) ? data.data.map(toAssetOption) : [];
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

function isValidUUID(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function userLabel(user: SettingsUser): string {
  return user.full_name ? `${user.full_name} (@${user.username})` : `@${user.username}`;
}

function currentUserLabel(user: ReturnType<typeof useAuthUser>): string {
  return user.full_name ? `${user.full_name} (@${user.username})` : `@${user.username}`;
}

function assetLabel(asset: SmsAssetOption): string {
  const code = asset.itemCode ? ` (${asset.itemCode})` : "";
  const assigned = asset.assignedTo ? ` - ${asset.assignedTo}` : "";
  return `${asset.name}${code}${assigned}`;
}

function findAssetByInput(assets: SmsAssetOption[], input: string): SmsAssetOption | undefined {
  const query = input.toLowerCase();
  return assets.find(
    (asset) =>
      asset.name.toLowerCase() === query ||
      asset.itemCode?.toLowerCase() === query
  );
}

export default function SmsMovementForm({ initialMode }: SmsMovementFormProps) {
  const user = useAuthUser();
  const router = useRouter();
  const canChooseActor = user.role === "Admin" || user.role === "Transfer";
  const [mode, setMode] = useState<MovementMode>(initialMode);
  const [form, setForm] = useState<MovementFormState>({
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
        // The form still allows manual transfer asset entry in Send To mode.
      })
      .finally(() => setAssetsLoading(false));
  }, [loadAssets]);

  useEffect(() => {
    fetch("/api/auth/users")
      .then((response) => response.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      })
      .catch(() => {
        // User selection gracefully falls back to a text field.
      })
      .finally(() => setUsersLoading(false));
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  const returnableAssets = useMemo(
    () => assets.filter((asset) => asset.status !== "Available"),
    [assets]
  );

  const selectableAssets = mode === "return" ? returnableAssets : assets;

  useEffect(() => {
    if (!canChooseActor && user.username) {
      setForm((prev) => ({ ...prev, senderId: user.username }));
    }
  }, [canChooseActor, user.username]);

  useEffect(() => {
    if (mode === "return") {
      setForm((prev) => ({
        ...prev,
        receiverId: prev.receiverId === "stock" ? "" : prev.receiverId,
        senderId: selectedAsset?.assignedTo || prev.senderId || user.username,
        location: selectedAsset?.location || prev.location,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      receiverId: prev.receiverId === "stock" ? "" : prev.receiverId,
      senderId: !canChooseActor ? user.username : prev.senderId,
    }));
  }, [canChooseActor, mode, selectedAsset, user.username]);

  useEffect(() => {
    if (mode === "return" && selectedAsset && selectedAsset.status === "Available") {
      setSelectedAssetId("");
      setForm((prev) => ({ ...prev, assetSearch: "" }));
    }
  }, [mode, selectedAsset]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const dropdownContainer = document.getElementById("sms-movement-asset-dropdown");
      if (dropdownContainer && !dropdownContainer.contains(target)) {
        setAssetDropdownOpen(false);
      }
    }

    if (assetDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [assetDropdownOpen]);

  const setModeSafely = (nextMode: MovementMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setGeneralError("");
    setSuccess("");
    setFieldErrors({});
    setImageFile(null);
    setAssetDropdownOpen(false);
    if (nextMode === "return" && selectedAsset?.status === "Available") {
      setSelectedAssetId("");
      setForm((prev) => ({ ...prev, assetSearch: "", receiverId: "", remark: "" }));
    } else {
      setForm((prev) => ({
        ...prev,
        receiverId: nextMode === "return" && prev.receiverId === "stock" ? "" : prev.receiverId,
        remark: "",
      }));
    }
  };

  const handleChange = (field: keyof MovementFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAssetSelect = (asset: SmsAssetOption) => {
    setSelectedAssetId(asset.id);
    setForm((prev) => ({
      ...prev,
      assetSearch: asset.name,
      senderId: mode === "return" ? asset.assignedTo || prev.senderId || user.username : prev.senderId,
      receiverId: mode === "return" && prev.receiverId === "stock" ? "" : prev.receiverId,
      location: mode === "return" ? asset.location || prev.location : prev.location,
    }));
    setAssetDropdownOpen(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.assetId;
      return next;
    });
  };

  const buildTransferPayload = (assetId: string) => ({
    assetId: assetId.trim(),
    senderId: form.senderId.trim(),
    receiverId: form.receiverId.trim(),
    location: form.location.trim(),
    remark: form.remark.trim() || undefined,
  });

  const validateSendPayload = (assetId: string) => {
    const validation = validateTransferForm(buildTransferPayload(assetId));

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setGeneralError("Please fix the errors below.");
    }

    return validation.isValid;
  };

  const validateReturnPayload = () => {
    const errors: Record<string, string> = {};

    if (!selectedAssetId) errors.assetId = "Please select an assigned asset to send back.";
    if (!form.senderId.trim()) errors.senderId = "Please select who is sending this asset back.";
    if (!form.receiverId.trim()) errors.receiverId = "Please select who this asset is going back to.";
    if (!form.location.trim()) errors.location = "Location is required";
    if (form.location.length > 128) errors.location = "Location too long";
    if (form.remark.length > 500) errors.remark = "Remark too long";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setGeneralError("Please fix the errors below.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setGeneralError("");
    setSuccess("");
    setFieldErrors({});

    const assetInput = (selectedAssetId || form.assetSearch).trim();
    const matchedAsset = selectedAssetId ? undefined : findAssetByInput(assets, assetInput);
    const isNewAsset =
      mode === "send" &&
      assetInput.length >= 2 &&
      !selectedAssetId &&
      !isValidUUID(assetInput) &&
      !matchedAsset;
    let finalAssetId = selectedAssetId || matchedAsset?.id || assetInput;

    if (mode === "send" && !validateSendPayload(isNewAsset ? NEW_ASSET_VALIDATION_ID : finalAssetId)) {
      return;
    }

    if (mode === "return" && !validateReturnPayload()) {
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
        folder: mode === "return" ? "sms/returns/images" : "sms/transfers/images",
        publicIdPrefix: mode === "return" ? "return" : "transfer",
        entityId: finalAssetId,
      });

      const response = await fetch("/api/sms/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildTransferPayload(finalAssetId),
          imageUrl,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.error || (mode === "return" ? "Return failed" : "Failed to create transfer"));
      }

      setSuccess(
        mode === "return"
          ? "Send back request sent."
          : isNewAsset
            ? "New asset created and transfer request sent."
            : "Transfer request sent."
      );
      setTimeout(() => router.push("/sms/pending"), 1000);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : mode === "return" ? "Return failed" : "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  const assetSearchQuery = form.assetSearch.toLowerCase();
  const visibleAssets = selectableAssets
    .filter(
      (asset) =>
        !assetSearchQuery ||
        asset.name.toLowerCase().includes(assetSearchQuery) ||
        (asset.itemCode?.toLowerCase().includes(assetSearchQuery) ?? false) ||
        asset.id.toLowerCase().includes(assetSearchQuery) ||
        (asset.assignedTo?.toLowerCase().includes(assetSearchQuery) ?? false)
    )
    .slice(0, 12);

  const selectedAssignedUserIsInList = Boolean(
    selectedAsset?.assignedTo &&
      users.some((settingsUser) => settingsUser.username === selectedAsset.assignedTo)
  );

  const actorLabel = mode === "return" ? "Send Back From" : "Send From";
  const destinationLabel = mode === "return" ? "Send Back To" : "Send To";
  const noteLabel = mode === "return" ? "Send Back Note" : "Message to receiver (Optional)";
  const imageLabel = mode === "return" ? "Send Back Image" : "Transfer Image (Optional)";
  const uploadLabel = mode === "return" ? "Upload send back photo" : "Upload transfer photo";
  const submitLabel = mode === "return" ? "Send Back" : "Send To";

  return (
    <SmsPageShell maxWidth="max-w-2xl">
      <SmsPageHeader
        title="SMS Movement"
        description="Send an asset to someone or send an assigned asset back to a selected user."
        icon={mode === "return" ? RotateCcw : ArrowLeftRight}
        tone={mode === "return" ? "blue" : "amber"}
      />

      {generalError && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{generalError}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${smsPanelClass} space-y-6 p-4 md:p-6`}>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <button
            type="button"
            aria-pressed={mode === "send"}
            onClick={() => setModeSafely("send")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "send"
                ? "bg-white text-amber-700 shadow-sm dark:bg-slate-950 dark:text-amber-300"
                : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-900/60"
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Send To
          </button>
          <button
            type="button"
            aria-pressed={mode === "return"}
            onClick={() => setModeSafely("return")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "return"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-300"
                : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-900/60"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Send Back
          </button>
        </div>

        <div id="sms-movement-asset-dropdown" className="relative">
          <label className={smsLabelClass}>
            Asset <span className="text-red-500">*</span>
          </label>
          {assetsLoading ? (
            <div className={smsLoadingFieldClass}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading assets...
            </div>
          ) : mode === "return" && returnableAssets.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              No assigned assets are available to send back.
            </div>
          ) : (
            <>
              <input
                type="text"
                value={form.assetSearch}
                onChange={(event) => {
                  handleChange("assetSearch", event.target.value);
                  if (selectedAssetId) setSelectedAssetId("");
                }}
                onFocus={() => setAssetDropdownOpen(true)}
                className={`${smsInputClass} ${fieldErrors.assetId ? smsInvalidFieldClass : ""}`}
                placeholder={mode === "return" ? "Select an assigned asset to send back" : "Select an asset or enter asset ID"}
                disabled={loading}
                autoComplete="off"
                title={mode === "return" ? "Select asset to send back" : "Select an asset or enter asset ID"}
              />
              {!loading && selectableAssets.length > 0 && assetDropdownOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                  {visibleAssets.length > 0 ? (
                    visibleAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleAssetSelect(asset)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-gray-900 dark:text-white">{asset.name}</span>
                          {asset.assignedTo && (
                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                              Assigned to {asset.assignedTo}
                            </span>
                          )}
                        </span>
                        <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                          {asset.itemCode ? `(${asset.itemCode})` : asset.id.slice(0, 8)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No matching assets
                    </div>
                  )}
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

        {selectedAsset && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <div className="font-semibold">{selectedAsset.name}</div>
            <div className="mt-1 text-blue-800 dark:text-blue-300">
              Status: {selectedAsset.status} | Assigned: {selectedAsset.assignedTo || "Unassigned"}
            </div>
          </div>
        )}

        <div>
          <label className={smsLabelClass}>
            {actorLabel} <span className="text-red-500">*</span>
          </label>
          {!canChooseActor ? (
            <input
              type="text"
              title={actorLabel}
              value={currentUserLabel(user)}
              className={smsInputClass}
              disabled
            />
          ) : usersLoading ? (
            <div className={smsLoadingFieldClass}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading users...
            </div>
          ) : users.length > 0 ? (
            <select
              title={`Select ${actorLabel.toLowerCase()}`}
              value={form.senderId}
              onChange={(event) => handleChange("senderId", event.target.value)}
              className={`${smsSelectClass} ${fieldErrors.senderId ? smsInvalidFieldClass : ""}`}
              disabled={loading}
            >
              <option value="">Select person</option>
              {mode === "return" && selectedAsset?.assignedTo && !selectedAssignedUserIsInList && (
                <option value={selectedAsset.assignedTo}>{selectedAsset.assignedTo} (assigned)</option>
              )}
              {users.map((settingsUser) => (
                <option key={settingsUser.username} value={settingsUser.username}>
                  {userLabel(settingsUser)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              title={actorLabel}
              value={form.senderId}
              onChange={(event) => handleChange("senderId", event.target.value)}
              className={`${smsInputClass} ${fieldErrors.senderId ? smsInvalidFieldClass : ""}`}
              placeholder={mode === "return" ? "Enter returning username" : "Enter sender username"}
              disabled={loading}
              maxLength={128}
            />
          )}
          {fieldErrors.senderId && (
            <p className={smsErrorTextClass}>
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.senderId}
            </p>
          )}
        </div>

        <div>
          <label className={smsLabelClass}>
            {destinationLabel} <span className="text-red-500">*</span>
          </label>
          {usersLoading ? (
            <div className={smsLoadingFieldClass}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading users...
            </div>
          ) : users.length > 0 ? (
            <select
              title={mode === "return" ? "Select send back receiver" : "Select receiver"}
              value={form.receiverId}
              onChange={(event) => handleChange("receiverId", event.target.value)}
              className={`${smsSelectClass} ${fieldErrors.receiverId ? smsInvalidFieldClass : ""}`}
              disabled={loading}
            >
              <option value="">{mode === "return" ? "Select send back receiver" : "Select receiver"}</option>
              {users.map((settingsUser) => (
                <option key={settingsUser.username} value={settingsUser.username}>
                  {userLabel(settingsUser)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              title="Receiver"
              value={form.receiverId}
              onChange={(event) => handleChange("receiverId", event.target.value)}
              className={`${smsInputClass} ${fieldErrors.receiverId ? smsInvalidFieldClass : ""}`}
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

        <div>
          <label className={smsLabelClass}>
            {mode === "return" ? "Send Back Location" : "Send To Location"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            title={mode === "return" ? "Send Back Location" : "Send To Location"}
            value={form.location}
            onChange={(event) => handleChange("location", event.target.value)}
            className={`${smsInputClass} ${fieldErrors.location ? smsInvalidFieldClass : ""}`}
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

        <div>
          <label className={smsLabelClass}>{noteLabel}</label>
          <textarea
            title={noteLabel}
            value={form.remark}
            onChange={(event) => handleChange("remark", event.target.value)}
            className={`${smsTextareaClass} h-24 resize-none ${fieldErrors.remark ? smsInvalidFieldClass : ""}`}
            placeholder={
              mode === "return"
                ? "Example: Returned by staff after monthly check. Charger included."
                : "Example: Please accept this projector for the Sen Sok meeting room..."
            }
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

        <div>
          <label className={smsLabelClass}>{imageLabel}</label>
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
                  aria-label={mode === "return" ? "Remove return image" : "Remove transfer image"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-gray-600 dark:text-gray-300">
                <Upload className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                <span className="font-semibold text-gray-800 dark:text-white">{uploadLabel}</span>
                <span>JPG, PNG, WebP, or GIF</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">No file chosen</span>
                <input
                  type="file"
                  title={uploadLabel}
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
            disabled={loading || assetsLoading || (mode === "return" && returnableAssets.length === 0)}
            className={`${smsPrimaryButtonClass} flex-1 ${mode === "return" ? "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500/40" : ""}`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "return" ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <ArrowLeftRight className="h-4 w-4" />
            )}
            {loading ? "Processing..." : submitLabel}
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Signed in as {user.full_name || user.username}
        </div>
      </form>
    </SmsPageShell>
  );
}
