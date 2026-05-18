"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import { AlertCircle, ArrowLeft, CheckCircle, ImageIcon, Loader2, RotateCcw, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

  const uploadReturnImage = async (): Promise<string | null> => {
    if (!imageFile || !selectedAsset) return null;

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("folder", "sms/returns/images");
    formData.append("publicId", `return_${selectedAsset.id}_${Date.now()}`);

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
      const imageUrl = await uploadReturnImage();
      const response = await fetch(`/api/sms/assets/${assetId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: location.trim() || selectedAsset?.location || "Stock",
          remark: remark.trim() || "Returned to stock",
          imageUrl: imageUrl || undefined,
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
    <div className="mx-auto max-w-2xl p-6">
      <Link
        href="/sms"
        className="mb-6 inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to SMS
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <RotateCcw className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Return to Stock</h1>
          <p className="text-sm text-slate-500">Return an assigned asset with a note and optional photo.</p>
        </div>
      </div>

      {generalError && (
        <div className="mb-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="font-semibold text-red-900">{generalError}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
          <p className="font-semibold text-emerald-900">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Asset <span className="text-red-500">*</span>
          </label>
          {assetsLoading ? (
            <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 p-3 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading assets...
            </div>
          ) : assets.length > 0 ? (
            <select
              title="Select asset to return"
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-600">
              No assigned assets are available to return.
            </div>
          )}
        </div>

        {selectedAsset && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
            <div className="font-semibold">{selectedAsset.name}</div>
            <div className="mt-1 text-blue-800">
              Status: {selectedAsset.status} | Assigned: {selectedAsset.assignedTo || "Unassigned"}
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Return Location</label>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Stock Room, Warehouse A"
            disabled={loading}
            maxLength={128}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Return Note</label>
          <textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            className="h-28 w-full resize-none rounded-lg border border-slate-300 p-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Example: Returned by staff after monthly check. Charger included."
            disabled={loading}
            maxLength={500}
          />
          <p className="mt-1 text-xs text-slate-500">{remark.length}/500</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Return Image</label>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            {imageFile ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
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
                  aria-label="Remove return image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-slate-600">
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="font-semibold text-slate-800">Upload return photo</span>
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

        <div className="flex gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="rounded-lg bg-slate-100 px-4 py-2 font-medium transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || assetsLoading || !assetId}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {loading ? "Returning..." : "Return to Stock"}
          </button>
        </div>

        <div className="text-xs text-slate-500">Signed in as {user.full_name || user.username}</div>
      </form>
    </div>
  );
}
