"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import { AlertCircle, CheckCircle, ImageIcon, Loader2, RotateCcw, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  SmsPageHeader,
  SmsPageShell,
  smsDividerClass,
  smsDropzoneClass,
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

type SmsStatus = "Available" | "In Use" | "Borrowed" | "Out" | "Not Returned";

interface SmsAssetOption {
  id: string;
  name: string;
  itemCode?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  status: SmsStatus;
}

interface AssetsResponse {
  success: boolean;
  data?: SmsAssetOption[];
  error?: string;
}

function assetLabel(asset: SmsAssetOption): string {
  const code = asset.itemCode ? ` (${asset.itemCode})` : "";
  const assigned = asset.assignedTo ? ` - ${asset.assignedTo}` : "";
  return `${asset.name}${code}${assigned}`;
}

export default function ReturnToStockPage() {
  const user = useAuthUser();
  const router = useRouter();
  const [assets, setAssets] = useState<SmsAssetOption[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetId, setAssetId] = useState("");
  const [location, setLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/sms/assets?pageSize=200")
      .then((response) => response.json())
      .then((data: AssetsResponse) => {
        if (data.success && Array.isArray(data.data)) {
          setAssets(data.data.filter((asset) => asset.status !== "Available"));
        } else {
          setGeneralError(data.error || "Failed to load returnable assets");
        }
      })
      .catch(() => setGeneralError("Failed to load returnable assets"))
      .finally(() => setAssetsLoading(false));
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId) || null,
    [assets, assetId]
  );

  useEffect(() => {
    if (selectedAsset?.location) {
      setLocation(selectedAsset.location);
    }
  }, [selectedAsset]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setGeneralError("");
    setSuccess("");

    if (!assetId) {
      setGeneralError("Please select an asset to return.");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadSmsImage({
        file: imageFile,
        folder: "sms/returns/images",
        publicIdPrefix: "return",
        entityId: selectedAsset?.id,
      });
      const response = await fetch(`/api/sms/assets/${assetId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: location.trim() || selectedAsset?.location || "Stock",
          remark: remark.trim() || "Returned to stock",
          imageUrl,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.error || "Return failed");
      }

      setSuccess("Asset returned to stock successfully.");
      setTimeout(() => router.push("/sms"), 1200);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Return failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SmsPageShell maxWidth="max-w-2xl">
      <SmsPageHeader
        title="Return to Stock"
        description="Return an assigned asset with a note and optional photo."
        icon={RotateCcw}
        tone="blue"
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
        <div>
          <label className={smsLabelClass}>
            Asset <span className="text-red-500">*</span>
          </label>
          {assetsLoading ? (
            <div className={smsLoadingFieldClass}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading assets...
            </div>
          ) : assets.length > 0 ? (
            <select
              title="Select asset to return"
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              className={smsSelectClass}
              disabled={loading}
            >
              <option value="">Select an assigned asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {assetLabel(asset)}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              No assigned assets are available to return.
            </div>
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
          <label className={smsLabelClass}>Return Location</label>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={smsInputClass}
            placeholder="e.g. Stock Room, Warehouse A"
            disabled={loading}
            maxLength={128}
          />
        </div>

        <div>
          <label className={smsLabelClass}>Return Note</label>
          <textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            className={`${smsTextareaClass} h-28 resize-none`}
            placeholder="Example: Returned by staff after monthly check. Charger included."
            disabled={loading}
            maxLength={500}
          />
          <p className={smsHelperClass}>{remark.length}/500</p>
        </div>

        <div>
          <label className={smsLabelClass}>Return Image</label>
          <div className={smsDropzoneClass}>
            {imageFile ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
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
                  aria-label="Remove return image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-gray-600 dark:text-gray-300">
                <Upload className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                <span className="font-semibold text-gray-800 dark:text-white">Upload return photo</span>
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
            disabled={loading || assetsLoading || !assetId}
            className={`${smsPrimaryButtonClass} flex-1 bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500/40`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {loading ? "Returning..." : "Return to Stock"}
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">Signed in as {user.full_name || user.username}</div>
      </form>
    </SmsPageShell>
  );
}
