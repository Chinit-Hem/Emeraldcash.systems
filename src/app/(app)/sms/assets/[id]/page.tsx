"use client";

import { ArrowLeft, Edit3, Trash2 } from "lucide-react";
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
  status: "Available" | "In Use" | "Borrowed";
}

interface SmsTransfer {
  id: string;
  assetId: string;
  senderId: string;
  receiverId: string;
  location: string;
  status: "pending" | "accepted" | "rejected";
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

export default function SmsAssetDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const [asset, setAsset] = useState<SmsAsset | null>(null);
  const [transfers, setTransfers] = useState<SmsTransfer[]>([]);
  const [history, setHistory] = useState<AssetHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadAsset = async () => {
      setLoading(true);
      setError(null);
      try {
        const [assetRes, transfersRes, historyRes] = await Promise.all([
          fetch(`/api/sms/assets/${id}`),
          fetch("/api/sms/transfers"),
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

    void loadAsset();
  }, [id]);

  const statusClass = useMemo(() => {
    if (!asset) return "bg-slate-100 text-slate-800";
    if (asset.status === "Available") return "bg-emerald-100 text-emerald-800";
    if (asset.status === "In Use") return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  }, [asset]);

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

  if (loading) {
    return <div className="p-8 text-slate-600">Loading asset details...</div>;
  }

  if (error || !asset) {
    return (
      <div className="p-8">
        <p className="mb-4 text-red-600">{error || "Asset not found"}</p>
        <Link href="/sms/assets" className="inline-flex items-center gap-2 text-emerald-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Assets
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/sms/assets" className="inline-flex items-center gap-2 text-slate-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Assets
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/sms/assets/${asset.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{asset.name}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{asset.status}</span>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p><strong>ID:</strong> {asset.id}</p>
          <p><strong>Type:</strong> {asset.type}</p>
          <p><strong>Category:</strong> {asset.category || "-"}</p>
          <p><strong>Quantity:</strong> {asset.quantity ?? "-"}</p>
          <p><strong>Location:</strong> {asset.location || "-"}</p>
          <p><strong>Assigned To:</strong> {asset.assignedTo || "-"}</p>
        </div>
        {asset.description ? <p className="text-sm text-slate-600">{asset.description}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Transfers ({transfers.length})</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-slate-500">No transfers for this asset.</p>
        ) : (
          <div className="space-y-2">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p><strong>Status:</strong> {transfer.status}</p>
                <p><strong>Location:</strong> {transfer.location}</p>
                <p><strong>Sender / Receiver:</strong> {transfer.senderId} / {transfer.receiverId}</p>
                <p><strong>Created:</strong> {new Date(transfer.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          History ({history?.totalEvents ?? 0})
        </h2>
        {!history || history.events.length === 0 ? (
          <p className="text-sm text-slate-500">No history events available.</p>
        ) : (
          <div className="space-y-2">
            {history.events.map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p><strong>Type:</strong> {event.type}</p>
                <p><strong>Description:</strong> {event.description}</p>
                <p><strong>Timestamp:</strong> {new Date(event.timestamp).toLocaleString()}</p>
                {event.location ? <p><strong>Location:</strong> {event.location}</p> : null}
                {event.status ? <p><strong>Status:</strong> {event.status}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
