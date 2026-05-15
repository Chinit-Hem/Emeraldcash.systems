"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  Hash,
  ImageIcon,
  Layers3,
  MapPin,
  Package,
  RotateCcw,
  Tag,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  description?: string | null;
  status: "Available" | "In Use" | "Borrowed" | "Out" | "Not Returned";
}

interface SmsTransfer {
  id: string;
  assetId: string;
  senderId: string;
  receiverId: string;
  location: string;
  status: "pending" | "accepted" | "rejected" | "returned";
  remark?: string | null;
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        {icon}
        {label}
      </div>
      <div className="break-words text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}

export default function SmsAssetDetailPage() {
  const user = useAuthUser();
  const isAdmin = user?.role === "Admin";
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const [asset, setAsset] = useState<SmsAsset | null>(null);
  const [transfers, setTransfers] = useState<SmsTransfer[]>([]);
  const [history, setHistory] = useState<AssetHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const latestTransfer = useMemo(() => transfers[0], [transfers]);
  const historyEvents = history?.events || [];

  const handleDelete = async () => {
    if (!asset) return;
    if (!confirm(`Delete ${asset.name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/sms/assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Delete failed");
      }
      router.push("/sms/assets");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleReturn = async () => {
    if (!asset) return;
    if (!confirm(`Return ${asset.name} to stock?`)) return;

    try {
      const res = await fetch(`/api/sms/assets/${id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: asset.location || undefined,
          remark: "Returned from asset details",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(body?.error || "Return failed");
      }

      await loadAsset();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Return failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
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
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-white p-6">
          <p className="mb-4 font-medium text-red-600">{error || "Asset not found"}</p>
          <Link href="/sms/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/sms/assets"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </Link>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/sms/assets/${asset.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </Link>
            {asset.status !== "Available" && (
              <button
                type="button"
                onClick={handleReturn}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
              >
                <RotateCcw className="h-4 w-4" />
                Return Stock
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
            <div className="flex min-h-64 items-center justify-center border-b border-slate-200 bg-slate-100 lg:border-b-0 lg:border-r">
              {asset.imageUrl ? (
                <div className="relative h-full min-h-64 w-full">
                  <Image src={asset.imageUrl} alt={asset.name} fill sizes="280px" className="object-cover" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <ImageIcon className="h-12 w-12" />
                  <span className="text-sm font-medium">No image</span>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={asset.status} />
                    {latestTransfer ? <StatusPill status={latestTransfer.status} /> : null}
                  </div>
                  <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{asset.name}</h1>
                  <p className="mt-1 text-sm text-slate-500">{asset.itemCode || "No item code"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-right">
                  <div className="text-xs font-semibold uppercase text-slate-500">Quantity</div>
                  <div className="text-2xl font-bold text-slate-950">{asset.quantity ?? "-"}</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DetailItem icon={<Hash className="h-3.5 w-3.5" />} label="Asset ID" value={asset.id} />
                <DetailItem icon={<Layers3 className="h-3.5 w-3.5" />} label="Type" value={asset.type} />
                <DetailItem icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={asset.category || "-"} />
                <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={asset.location || "-"} />
                <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Assigned To" value={asset.assignedTo || "Unassigned"} />
                <DetailItem
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                  label="Last Movement"
                  value={latestTransfer ? formatDate(latestTransfer.createdAt) : "No movement"}
                />
              </div>

              {asset.description ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    Description
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{asset.description}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-950">Transfers</h2>
                <p className="text-sm text-slate-500">{transfers.length} movement records</p>
              </div>
              <Package className="h-5 w-5 text-slate-400" />
            </div>

            {transfers.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No transfers for this asset.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <StatusPill status={transfer.status} />
                      <span className="text-xs font-medium text-slate-500">{formatDate(transfer.createdAt)}</span>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Route</div>
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                          <span className="truncate">{transfer.senderId || "-"}</span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate">{transfer.receiverId || "-"}</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Location</div>
                        <div className="font-semibold text-slate-900">{transfer.location || "-"}</div>
                      </div>
                    </div>
                    {transfer.remark ? <p className="mt-3 text-sm text-slate-600">{transfer.remark}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-950">History</h2>
                <p className="text-sm text-slate-500">{history?.totalEvents ?? 0} audit and transfer events</p>
              </div>
              <FileText className="h-5 w-5 text-slate-400" />
            </div>

            {historyEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No history events available.</div>
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
                        <span>{formatDate(event.timestamp)}</span>
                        {event.location ? <span>{event.location}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
