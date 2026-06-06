"use client";

import { useAuthUser } from "@/shared/hooks/AuthContext";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { hasAppPermission } from "@/shared/utils/permissions";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  FileText,
  Hash,
  ImageIcon,
  Layers3,
  MapPin,
  Package,
  RotateCcw,
  Send,
  Tag,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ImageModal from "@/systems/sms/components/assets/ImageModal";
import { formatCambodiaDisplayDateTime } from "@/shared/utils/cambodiaTime";
import {
  buildAssetEditPath,
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
  createdBy?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  status: "Available" | "In Use" | "Borrowed" | "Out" | "Not Returned";
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface SmsTransfer {
  id: string;
  assetId: string;
  senderId: string;
  receiverId: string;
  location: string;
  status: "pending" | "accepted" | "rejected" | "returned";
  remark?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

interface AssetHistoryEvent {
  id: string;
  type: "transfer" | "audit";
  description: string;
  location?: string;
  status?: string;
  timestamp: string;
}

interface AssetHistory {
  assetId: string;
  assetName: string;
  totalEvents: number;
  events: AssetHistoryEvent[];
}

function formatDate(value: string, language: string): string {
  return formatCambodiaDisplayDateTime(value, language === "km" ? "km-KH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleFromAction(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string): string {
  const classes: Record<string, string> = {
    Available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "In Use": "bg-amber-50 text-amber-700 ring-amber-200",
    Borrowed: "bg-blue-50 text-blue-700 ring-blue-200",
    Out: "bg-red-50 text-red-700 ring-red-200",
    "Not Returned": "bg-slate-100 text-slate-700 ring-slate-200",
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rejected: "bg-red-50 text-red-700 ring-red-200",
    returned: "bg-blue-50 text-blue-700 ring-blue-200",
  };
  return classes[status] || "bg-slate-100 text-slate-700 ring-slate-200";
}

function displayValue(value?: string | number | null, fallback = "Not set") {
  if (value === 0) return "0";
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  return text || fallback;
}

function hasDisplayValue(value?: string | number | null) {
  if (value === 0) return true;
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

function ProtectedValue({ value, fallback = "Not set" }: { value?: string | number | null; fallback?: string }) {
  return hasDisplayValue(value) ? <span data-no-translate>{displayValue(value, fallback)}</span> : <>{fallback}</>;
}

function DisplayTextValue({ value, fallback = "Not set" }: { value?: string | number | null; fallback?: string }) {
  return <>{displayValue(value, fallback)}</>;
}

function shortAssetId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function buildAssetMovementPath(mode: "send" | "return", assetId: string) {
  const params = new URLSearchParams({ assetId });
  return mode === "return" ? `/sms/return?${params.toString()}` : `/sms/transfer?${params.toString()}`;
}

function statusIcon(status: string) {
  if (status === "accepted" || status === "returned" || status === "Available") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  if (status === "rejected" || status === "Out") {
    return <XCircle className="h-4 w-4" />;
  }
  return <Clock3 className="h-4 w-4" />;
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(status)}`}>
      {statusIcon(status)}
      {titleFromAction(status)}
    </span>
  );
}

function DetailItem({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        {icon}
        {label}
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 break-words text-sm font-semibold text-slate-900">{value}</div>
        {action}
      </div>
    </div>
  );
}

export default function SmsAssetDetailPage() {
  const user = useAuthUser();
  const { language, isKhmer } = useLanguage();
  const canEditAsset = hasAppPermission(user?.role, "sms:edit");
  const canDeleteAsset = hasAppPermission(user?.role, "sms:delete");
  const canTransferAsset = hasAppPermission(user?.role, "sms:transfer");
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const assetsBackHref = useMemo(
    () => getSafeAssetListReturnPath(searchParams.get(SMS_ASSET_RETURN_PARAM)),
    [searchParams]
  );

  const [asset, setAsset] = useState<SmsAsset | null>(null);
  const [transfers, setTransfers] = useState<SmsTransfer[]>([]);
  const [history, setHistory] = useState<AssetHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [viewImage, setViewImage] = useState<{ src: string; alt: string } | null>(null);
  const [copiedAssetId, setCopiedAssetId] = useState(false);
  const copyFeedbackTimer = useRef<number | null>(null);

  const loadAsset = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const [assetRes, transfersRes, historyRes] = await Promise.all([
        fetch(`/api/sms/assets/${id}`),
        fetch(`/api/sms/transfers?assetId=${id}&status=all`),
        fetch(`/api/sms/history/${id}`),
      ]);

      const [assetData, transfersData, historyData] = await Promise.all([
        assetRes.json(),
        transfersRes.json(),
        historyRes.json(),
      ]);

      if (!assetData?.success || !assetData?.data) {
        setError(assetData?.error || "Asset not found");
        setAsset(null);
        return;
      }

      setAsset(assetData.data as SmsAsset);
      setTransfers(
        ((transfersData?.data as SmsTransfer[] | undefined) || []).filter(
          (transfer) => transfer.assetId === id
        )
      );
      if (historyData?.success) {
        setHistory(historyData.data as AssetHistory);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load asset details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAsset();
  }, [id]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimer.current !== null) {
        window.clearTimeout(copyFeedbackTimer.current);
      }
    };
  }, []);

  const latestTransfer = useMemo(() => transfers[0], [transfers]);
  const historyEvents = history?.events || [];
  const isReturnAction = asset?.status !== "Available";
  const formatAssetDate = (value: string) => formatDate(value, language);
  const movementRecordLabel = isKhmer
    ? `${transfers.length} កំណត់ត្រាចលនា`
    : `${transfers.length} movement records`;
  const auditEventLabel = isKhmer
    ? `${history?.totalEvents ?? 0} ព្រឹត្តិការណ៍សវនកម្ម និងផ្ទេរ`
    : `${history?.totalEvents ?? 0} audit and transfer events`;

  const handleDelete = async () => {
    if (!asset) return;
    const confirmMessage = isKhmer
      ? `លុប "${asset.name}" ឬ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`
      : `Delete ${asset.name}? This cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/sms/assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Delete failed");
      }
      router.push(assetsBackHref, { scroll: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleCopyAssetId = async () => {
    if (!asset) return;

    try {
      await navigator.clipboard.writeText(asset.id);
      setCopiedAssetId(true);
      if (copyFeedbackTimer.current !== null) {
        window.clearTimeout(copyFeedbackTimer.current);
      }
      copyFeedbackTimer.current = window.setTimeout(() => {
        setCopiedAssetId(false);
        copyFeedbackTimer.current = null;
      }, 1400);
    } catch {
      setCopiedAssetId(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-56 animate-pulse rounded-lg bg-white shadow-sm" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-lg bg-white shadow-sm" />
            <div className="h-80 animate-pulse rounded-lg bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-white p-6">
          <p className="mb-4 font-medium text-red-600">{error || "Asset not found"}</p>
          <Link href={assetsBackHref} scroll={false} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={assetsBackHref}
            scroll={false}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(240px,320px)_1fr]">
            <div className="flex min-h-60 items-center justify-center border-b border-slate-200 bg-slate-100 lg:min-h-full lg:border-b-0 lg:border-r">
              {asset.imageUrl && !imageError ? (
                <button
                  type="button"
                  onClick={() => setViewImage({ src: asset.imageUrl!, alt: asset.name })}
                  className="relative h-full min-h-60 w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-label={`View ${asset.name} larger`}
                  data-no-translate
                >
                  <Image 
                    src={asset.imageUrl!} 
                    alt={asset.name} 
                    fill 
                    sizes="280px" 
                    className="object-cover"
                    onError={() => setImageError(true)}
                  />
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <ImageIcon className="h-12 w-12" />
                  <span className="text-sm font-medium">{imageError ? 'Image unavailable' : 'No image'}</span>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={asset.status} />
                    {latestTransfer ? <StatusPill status={latestTransfer.status} /> : null}
                  </div>
                  <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl" data-no-translate>{asset.name}</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {asset.itemCode ? <span data-no-translate>{asset.itemCode}</span> : "No item code"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {canTransferAsset && (
                    <Link
                      href={buildAssetMovementPath(isReturnAction ? "return" : "send", asset.id)}
                      scroll={false}
                      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition ${
                        isReturnAction ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {isReturnAction ? <RotateCcw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                      {isReturnAction ? "Return Asset" : "Send Asset"}
                    </Link>
                  )}
                  {canEditAsset && (
                    <Link
                      href={buildAssetEditPath(asset.id, assetsBackHref)}
                      scroll={false}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Link>
                  )}
                  {canDeleteAsset && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase text-slate-500">Quantity</div>
                  <div className="mt-1 text-2xl font-bold text-slate-950">{displayValue(asset.quantity)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase text-slate-500">Assigned To</div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-950">
                    <ProtectedValue value={asset.assignedTo} fallback="Unassigned" />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase text-slate-500">Last Movement</div>
                  <div className="mt-1 text-sm font-bold text-slate-950">
                    {latestTransfer ? formatAssetDate(latestTransfer.createdAt) : "No movement"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase text-slate-500">Updated</div>
                  <div className="mt-1 text-sm font-bold text-slate-950">
                    {asset.updatedAt ? formatAssetDate(asset.updatedAt) : asset.createdAt ? formatAssetDate(asset.createdAt) : "Not set"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DetailItem
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="Asset ID"
                  value={<span title={asset.id} data-no-translate>{shortAssetId(asset.id)}</span>}
                  action={
                    <button
                      type="button"
                      onClick={handleCopyAssetId}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Copy asset ID"
                    >
                      {copiedAssetId ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  }
                />
                <DetailItem icon={<Layers3 className="h-3.5 w-3.5" />} label={isKhmer ? "ប្រភេទទ្រព្យសម្បត្តិ" : "Type"} value={<DisplayTextValue value={asset.type} />} />
                <DetailItem icon={<Tag className="h-3.5 w-3.5" />} label={isKhmer ? "ក្រុម" : "Category"} value={<DisplayTextValue value={asset.category} />} />
                <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={<ProtectedValue value={asset.location} />} />
                <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Created By" value={<ProtectedValue value={asset.createdBy} />} />
                <DetailItem
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                  label="Created"
                  value={asset.createdAt ? formatAssetDate(asset.createdAt) : "Not set"}
                />
              </div>

              {asset.description ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    Description
                  </div>
                  <p className="text-sm leading-6 text-slate-700" data-no-translate>{asset.description}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-950">Transfers</h2>
                <p className="text-sm text-slate-500">{movementRecordLabel}</p>
              </div>
              <Package className="h-5 w-5 text-slate-400" />
            </div>

            {transfers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-slate-500">
                <Package className="h-8 w-8 text-slate-300" />
                No transfers for this asset.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <StatusPill status={transfer.status} />
                      <span className="text-xs font-medium text-slate-500">{formatAssetDate(transfer.createdAt)}</span>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Route</div>
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                          <span className="truncate" data-no-translate>{transfer.senderId || "-"}</span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate" data-no-translate>{transfer.receiverId || "-"}</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Location</div>
                        <div className="font-semibold text-slate-900" data-no-translate>{transfer.location || "-"}</div>
                      </div>
                    </div>
                    {transfer.remark ? <p className="mt-3 text-sm text-slate-600" data-no-translate>{transfer.remark}</p> : null}
                    {transfer.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setViewImage({ src: transfer.imageUrl!, alt: `${asset.name} - Return proof` })}
                        className="relative mt-3 h-36 w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        aria-label="View transfer image larger"
                      >
                        <Image
                          src={transfer.imageUrl!}
                          alt="Return proof"
                          fill
                          sizes="224px"
                          className="object-cover"
                        />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-950">History</h2>
                <p className="text-sm text-slate-500">{auditEventLabel}</p>
              </div>
              <FileText className="h-5 w-5 text-slate-400" />
            </div>

            {historyEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-slate-500">
                <FileText className="h-8 w-8 text-slate-300" />
                No history events available.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historyEvents.map((event) => (
                  <div key={event.id} className="grid grid-cols-[32px_1fr] gap-3 p-5">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      {event.type === "transfer" ? <Package className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-950">{titleFromAction(event.description)}</span>
                        {event.status ? <StatusPill status={event.status} /> : null}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                        <span>{titleFromAction(event.type)}</span>
                        <span>{formatAssetDate(event.timestamp)}</span>
                        {event.location ? <span data-no-translate>{event.location}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
</section>
        </div>
      </div>

      {/* Image lightbox modal */}
      <ImageModal
        src={viewImage?.src || ""}
        alt={viewImage?.alt || ""}
        isOpen={!!viewImage}
        onClose={() => setViewImage(null)}
      />
    </div>
  );
}
