"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AssetFormModal from "@/systems/sms/components/assets/AssetFormModal";
import {
  buildAssetDetailPath,
  getSafeAssetListReturnPath,
  SMS_ASSET_RETURN_PARAM,
} from "@/systems/sms/utils/assetNavigation";

interface SmsAsset {
  id: string;
  name: string;
  itemCode?: string | null;
  type: string;
  category?: string | null;
  quantity?: number | null;
  location?: string | null;
  assignedTo?: string | null;
  imageUrl?: string | null;
  documentUrl?: string | null;
  description?: string | null;
  refId?: string | null;
  status: "Available" | "In Use" | "Borrowed" | "Out" | "Not Returned";
}

export default function EditAssetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const assetsBackHref = useMemo(
    () => getSafeAssetListReturnPath(searchParams.get(SMS_ASSET_RETURN_PARAM)),
    [searchParams]
  );
  const detailHref = useMemo(
    () => buildAssetDetailPath(id, assetsBackHref),
    [assetsBackHref, id]
  );

  const [asset, setAsset] = useState<SmsAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadAsset = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sms/assets/${id}`);
        const data = await res.json();

        if (!data?.success || !data?.data) {
          setError(data?.error || "Asset not found");
          setAsset(null);
          return;
        }

        setAsset(data.data as SmsAsset);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load asset");
      } finally {
        setLoading(false);
      }
    };

    void loadAsset();
  }, [id]);

  const handleSave = async (
    data: Omit<SmsAsset, "id">
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/sms/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        router.push(detailHref);
        router.refresh();
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (_err) {
      return { success: false, error: "Update failed" };
    }
  };

  const handleClose = () => {
    router.push(detailHref);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6">
        <div className="text-center max-w-md">
          <p className="mb-6 text-red-600 text-lg">{error || "Asset not found"}</p>
          <Link
            href={assetsBackHref}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <AssetFormModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        initialData={asset ? {
          name: asset.name,
          type: asset.type,
          status: asset.status,
          itemCode: asset.itemCode ?? undefined,
          category: asset.category ?? undefined,
          quantity: asset.quantity ?? 1,
          location: asset.location ?? undefined,
          assignedTo: asset.assignedTo ?? undefined,
          imageUrl: asset.imageUrl ?? undefined,
          documentUrl: asset.documentUrl ?? undefined,
          description: asset.description ?? undefined,
          refId: asset.refId ?? undefined,
        } : undefined}
        title={`Edit ${asset.name}`}
        isEdit={true}
      />
    </div>
  );
}
