"use client";

import { useRouter } from "next/navigation";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { validateTransferForm } from "@/systems/sms/utils/sms-validation";
import {
  SmsFieldError,
  SmsPageHeader,
  SmsPageShell,
  smsDividerClass,
  smsHelperClass,
  smsInputClass,
  smsInvalidFieldClass,
  smsLabelClass,
  smsPanelClass,
  smsPrimaryButtonClass,
  smsSecondaryButtonClass,
  smsTextareaClass,
} from "@/systems/sms/components/SmsShared";
import { uploadSmsImage } from "@/systems/sms/components/smsUpload";
import { SmsMovementAssetField } from "@/systems/sms/components/movement/SmsMovementAssetField";
import { SmsMovementImageField } from "@/systems/sms/components/movement/SmsMovementImageField";
import { SmsMovementModeToggle } from "@/systems/sms/components/movement/SmsMovementModeToggle";
import { SmsMovementUserField } from "@/systems/sms/components/movement/SmsMovementUserField";
import { useSmsAssetOptions } from "@/systems/sms/hooks/useSmsAssetOptions";
import { useSmsUsers } from "@/systems/sms/hooks/useSmsUsers";
import type {
  MovementFormState,
  MovementMode,
  SmsAssetOption,
} from "@/systems/sms/types/sms-movement";
import {
  NEW_ASSET_VALIDATION_ID,
  createAssetFromTransfer,
  findAssetByInput,
  isValidUUID,
} from "@/systems/sms/utils/smsMovementAssets";
import {
  buildMovementTransferPayload,
  validateReturnMovementForm,
} from "@/systems/sms/utils/smsMovementValidation";
import { formatSmsUserLabel } from "@/systems/sms/utils/smsUsers";

interface SmsMovementFormProps {
  initialMode: MovementMode;
}

const INITIAL_FORM_STATE: MovementFormState = {
  assetSearch: "",
  senderId: "",
  receiverId: "",
  location: "",
  remark: "",
};

const movementCopy = {
  send: {
    actorLabel: "Send From",
    destinationLabel: "Send To",
    locationLabel: "Send To Location",
    noteLabel: "Message to receiver (Optional)",
    notePlaceholder: "Example: Please accept this projector for the Sen Sok meeting room...",
    submitLabel: "Create Transfer Request",
    imageFolder: "sms/transfers/images",
    imagePublicIdPrefix: "transfer",
    successMessage: "Transfer request sent.",
    failureMessage: "Failed to create transfer",
    headerTone: "amber",
  },
  return: {
    actorLabel: "Send Back From",
    destinationLabel: "Send Back To",
    locationLabel: "Send Back Location",
    noteLabel: "Send Back Note",
    notePlaceholder: "Example: Returned by staff after monthly check. Charger included.",
    submitLabel: "Create Return Request",
    imageFolder: "sms/returns/images",
    imagePublicIdPrefix: "return",
    successMessage: "Return request sent.",
    failureMessage: "Return failed",
    headerTone: "blue",
  },
} as const;

function canChooseMovementActor(role: string): boolean {
  return role === "Admin";
}

export default function SmsMovementForm({ initialMode }: SmsMovementFormProps) {
  const user = useAuthUser();
  const router = useRouter();
  const canChooseActor = canChooseMovementActor(user.role);
  const [mode, setMode] = useState<MovementMode>(initialMode);
  const [form, setForm] = useState<MovementFormState>(INITIAL_FORM_STATE);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const { assets, assetsLoading, refreshAssets } = useSmsAssetOptions();
  const { users, usersLoading } = useSmsUsers();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");

  const copy = movementCopy[mode];
  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );
  const returnableAssets = useMemo(
    () => assets.filter((asset) => asset.status !== "Available"),
    [assets]
  );
  const selectableAssets = mode === "return" ? returnableAssets : assets;
  const selectedAssignedUserOption = useMemo(() => {
    const assignedTo = selectedAsset?.assignedTo;
    if (!assignedTo || users.some((settingsUser) => settingsUser.username === assignedTo)) {
      return null;
    }

    return { value: assignedTo, label: `${assignedTo} (assigned)` };
  }, [selectedAsset?.assignedTo, users]);
  const SubmitIcon = mode === "return" ? RotateCcw : ArrowLeftRight;

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

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;

      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setModeSafely = useCallback((nextMode: MovementMode) => {
    if (nextMode === mode) return;

    setMode(nextMode);
    setGeneralError("");
    setSuccess("");
    setFieldErrors({});
    setImageFile(null);

    if (nextMode === "return" && selectedAsset?.status === "Available") {
      setSelectedAssetId("");
      setForm((prev) => ({ ...prev, assetSearch: "", receiverId: "", remark: "" }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      receiverId: nextMode === "return" && prev.receiverId === "stock" ? "" : prev.receiverId,
      remark: "",
    }));
  }, [mode, selectedAsset?.status]);

  const handleChange = useCallback((field: keyof MovementFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  }, [clearFieldError]);

  const handleAssetSearchChange = useCallback((value: string) => {
    setSelectedAssetId("");
    setForm((prev) => ({ ...prev, assetSearch: value }));
    clearFieldError("assetId");
  }, [clearFieldError]);

  const handleAssetSelect = useCallback((asset: SmsAssetOption) => {
    setSelectedAssetId(asset.id);
    setForm((prev) => ({
      ...prev,
      assetSearch: asset.name,
      senderId: mode === "return" ? asset.assignedTo || prev.senderId || user.username : prev.senderId,
      receiverId: mode === "return" && prev.receiverId === "stock" ? "" : prev.receiverId,
      location: mode === "return" ? asset.location || prev.location : prev.location,
    }));
    clearFieldError("assetId");
  }, [clearFieldError, mode, user.username]);

  const handleSenderChange = useCallback(
    (value: string) => handleChange("senderId", value),
    [handleChange]
  );
  const handleReceiverChange = useCallback(
    (value: string) => handleChange("receiverId", value),
    [handleChange]
  );

  const buildTransferPayload = useCallback(
    (assetId: string) => buildMovementTransferPayload(form, assetId),
    [form]
  );

  const validateSendPayload = (assetId: string) => {
    const validation = validateTransferForm(buildTransferPayload(assetId));

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setGeneralError("Please fix the errors below.");
    }

    return validation.isValid;
  };

  const validateReturnPayload = () => {
    const validation = validateReturnMovementForm(form, selectedAssetId);

    setFieldErrors(validation.errors);
    if (!validation.isValid) {
      setGeneralError("Please fix the errors below.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
        void refreshAssets().catch(() => undefined);
      }

      const imageUrl = await uploadSmsImage({
        file: imageFile,
        folder: copy.imageFolder,
        publicIdPrefix: copy.imagePublicIdPrefix,
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
        throw new Error(result.error || copy.failureMessage);
      }

      setSuccess(
        mode === "send" && isNewAsset
          ? "New asset created and transfer request sent."
          : copy.successMessage
      );
      setTimeout(() => router.push("/sms/pending"), 1000);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : copy.failureMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SmsPageShell maxWidth="max-w-2xl">
      <SmsPageHeader
        title="Asset Movement"
        description="Send SMS assets, record handovers, and request returns through approval."
        icon={mode === "return" ? RotateCcw : ArrowLeftRight}
        tone={copy.headerTone}
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
        <SmsMovementModeToggle mode={mode} onModeChange={setModeSafely} />

        <SmsMovementAssetField
          mode={mode}
          value={form.assetSearch}
          error={fieldErrors.assetId}
          loading={loading}
          assetsLoading={assetsLoading}
          selectableAssets={selectableAssets}
          returnableAssetsCount={returnableAssets.length}
          onSearchChange={handleAssetSearchChange}
          onSelect={handleAssetSelect}
        />

        {selectedAsset && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <div className="font-semibold">{selectedAsset.name}</div>
            <div className="mt-1 text-blue-800 dark:text-blue-300">
              Status: {selectedAsset.status} | Assigned: {selectedAsset.assignedTo || "Unassigned"}
            </div>
          </div>
        )}

        <SmsMovementUserField
          label={copy.actorLabel}
          value={form.senderId}
          error={fieldErrors.senderId}
          datalistId="sms-movement-sender-options"
          title={`Select or enter ${copy.actorLabel.toLowerCase()}`}
          placeholder={mode === "return" ? "Select or enter returning username" : "Select or enter sender username"}
          users={users}
          usersLoading={usersLoading}
          loading={loading}
          readOnlyDisplayValue={!canChooseActor ? formatSmsUserLabel(user) : undefined}
          extraOption={selectedAssignedUserOption}
          onChange={handleSenderChange}
        />

        <SmsMovementUserField
          label={copy.destinationLabel}
          value={form.receiverId}
          error={fieldErrors.receiverId}
          datalistId="sms-movement-receiver-options"
          title={mode === "return" ? "Select or enter send back receiver" : "Select or enter receiver"}
          placeholder={mode === "return" ? "Select or enter send back receiver" : "Select or enter receiver"}
          users={users}
          usersLoading={usersLoading}
          loading={loading}
          extraOption={selectedAssignedUserOption}
          onChange={handleReceiverChange}
        />

        <div>
          <label className={smsLabelClass}>
            {copy.locationLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            title={copy.locationLabel}
            value={form.location}
            onChange={(event) => handleChange("location", event.target.value)}
            className={`${smsInputClass} ${fieldErrors.location ? smsInvalidFieldClass : ""}`}
            placeholder="e.g. Warehouse A, Office Building"
            disabled={loading}
            maxLength={128}
            aria-invalid={fieldErrors.location ? "true" : "false"}
          />
          <SmsFieldError error={fieldErrors.location} />
        </div>

        <div>
          <label className={smsLabelClass}>{copy.noteLabel}</label>
          <textarea
            title={copy.noteLabel}
            value={form.remark}
            onChange={(event) => handleChange("remark", event.target.value)}
            className={`${smsTextareaClass} h-24 resize-none ${fieldErrors.remark ? smsInvalidFieldClass : ""}`}
            placeholder={copy.notePlaceholder}
            disabled={loading}
            maxLength={500}
            aria-invalid={fieldErrors.remark ? "true" : "false"}
          />
          <SmsFieldError error={fieldErrors.remark} />
          <p className={smsHelperClass}>{form.remark.length}/500</p>
        </div>

        <SmsMovementImageField
          mode={mode}
          imageFile={imageFile}
          loading={loading}
          onImageFileChange={setImageFile}
        />

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
            ) : (
              <SubmitIcon className="h-4 w-4" />
            )}
            {loading ? "Processing..." : copy.submitLabel}
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Signed in as {user.full_name || user.username}
        </div>
      </form>
    </SmsPageShell>
  );
}
