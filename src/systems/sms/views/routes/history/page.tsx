"use client";

import { useLanguage } from "@/shared/hooks/LanguageContext";
import { useTranslation } from "@/shared/utils/i18n";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import Image from "next/image";
import {
  ArrowLeft,
  History,
  Search,
  RefreshCw,
  ArrowLeftRight,
  ShieldCheck,
  ClipboardCopy,
  CheckCircle2,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  CalendarDays,
  BarChart3,
  User,
  MapPin,
  Tag,
  AlertCircle,
  Inbox,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  formatCambodiaDisplayDateTime,
  toDateInstant,
} from "@/shared/utils/cambodiaTime";
import {
  SmsPageHeader,
  SmsPageShell,
  smsDangerButtonClass,
  smsInputClass,
  smsPanelClass,
  smsPrimaryButtonClass,
  smsSecondaryButtonClass,
} from "@/systems/sms/components/SmsShared";

// ============================================================================
// Types
// ============================================================================

interface SmsAsset {
  id: string;
  name: string;
  status: string;
  item_code?: string | null;
  type?: string;
}

interface HistoryEvent {
  id: string;
  type: "transfer" | "audit";
  assetId: string;
  userId?: string;
  description: string;
  location?: string;
  status?: string;
  timestamp: string;
  acceptedAt?: string | null;
  metadata?: Record<string, unknown>;
}

interface AssetHistory {
  assetId: string;
  assetName: string;
  totalEvents: number;
  events: HistoryEvent[];
}

interface LocalUser {
  username: string;
  full_name?: string;
  role?: string;
  email?: string;
  phone?: string;
  profile_picture?: string;
  staff_id?: number;
}

function formatRelativeTime(value: string) {
  const date = toDateInstant(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : "—";
}

function formatHistoryDateTime(value: string, language: string) {
  return formatCambodiaDisplayDateTime(value, language === "km" ? "km-KH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type EventFilter = "all" | "transfer" | "audit";

// ============================================================================
// Helpers
// ============================================================================

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    Available: "bg-emerald-100 text-emerald-800 border-emerald-200",
    "In Use": "bg-blue-100 text-blue-800 border-blue-200",
    Borrowed: "bg-amber-100 text-amber-800 border-amber-200",
    Pending: "bg-slate-100 text-slate-800 border-slate-200",
    accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return (
    map[status] || "bg-slate-100 text-slate-800 border-slate-200"
  );
}

function getEventIcon(type: string) {
  if (type === "transfer")
    return (
      <div className="rounded-md bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100">
        <ArrowLeftRight className="w-5 h-5" />
      </div>
    );
  return (
    <div className="rounded-md bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100">
      <ShieldCheck className="w-5 h-5" />
    </div>
  );
}

function getEventBadgeColor(type: string): string {
  if (type === "transfer")
    return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

// ============================================================================
// Components
// ============================================================================

const UserAvatar = ({
  userId,
  users,
}: {
  userId?: string;
  users: LocalUser[];
}) => {
  const user = users.find((u) => u.username === userId);
  const initial = user
    ? (user.full_name || user.username || "U").charAt(0).toUpperCase()
    : "?";

  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
      {initial}
    </div>
  );
};

const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="flex gap-4">
      <div className="h-12 w-12 flex-shrink-0 rounded-md bg-slate-200" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-slate-200 rounded-lg w-32" />
        <div className="h-3 bg-slate-200 rounded-lg w-full" />
        <div className="h-3 bg-slate-200 rounded-lg w-2/3" />
      </div>
    </div>
  </div>
);

const AssetSkeleton = () => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-16 rounded-md bg-slate-200" />
    ))}
  </div>
);

// ============================================================================
// Main Page
// ============================================================================

export default function HistoryPage() {
  const user = useAuthUser();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const isAdmin = user?.role === "Admin";

  // -- Data State --
  const [assets, setAssets] = useState<SmsAsset[]>([]);
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [history, setHistory] = useState<AssetHistory | null>(null);

  // -- UI State --
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetSearch, setAssetSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);

  // -- Fetch Users --
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json();
      if (data.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (_e) {
      // Silently fail user fetch
    }
  }, []);

  // -- Fetch Assets --
  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const res = await fetch("/api/sms/assets");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAssets(data.data);
      }
    } catch (_e) {
      // Silently fail
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  // -- Fetch History --
  const fetchHistory = useCallback(
    async (assetId: string) => {
      setHistoryLoading(true);
      setError(null);
      setEventFilter("all");
      try {
        const res = await fetch(`/api/sms/history/${assetId}`);
        const data = await res.json();
        if (data.success) {
          setHistory(data.data);
        } else {
          setError(data.error || t.loadError);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t.networkError);
      } finally {
        setHistoryLoading(false);
      }
    },
    [t.loadError, t.networkError]
  );

  useEffect(() => {
    fetchAssets();
    fetchUsers();
  }, [fetchAssets, fetchUsers]);

  // -- Memoized Filtered Assets --
  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return assets;
    const q = assetSearch.toLowerCase();
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.item_code && a.item_code.toLowerCase().includes(q)) ||
        (a.type && a.type.toLowerCase().includes(q))
    );
  }, [assets, assetSearch]);

  // -- Memoized Filtered Events --
  const filteredEvents = useMemo(() => {
    if (!history?.events) return [];
    if (eventFilter === "all") return history.events;
    return history.events.filter((e) => e.type === eventFilter);
  }, [history, eventFilter]);

  // -- Stats --
  const stats = useMemo(() => {
    if (!history?.events) return null;
    const transfers = history.events.filter((e) => e.type === "transfer");
    const audits = history.events.filter((e) => e.type === "audit");
    const lastEvent = history.events[0];
    return {
      total: history.events.length,
      transfers: transfers.length,
      audits: audits.length,
      lastActivity: lastEvent
        ? formatRelativeTime(lastEvent.timestamp)
        : null,
    };
  }, [history]);

  // -- Handlers --
  const handleAssetSelect = (assetId: string) => {
    setSelectedAsset(assetId);
    if (assetId) fetchHistory(assetId);
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const copyMetadata = async (eventId: string, metadata: unknown) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (_e) {
      // ignore
    }
  };

  const getUserDisplay = (userId?: string) => {
    const user = users.find((u) => u.username === userId);
    return user ? user.full_name || user.username || userId : userId || "—";
  };

  const clearSelectedHistory = async () => {
    if (!selectedAsset || !history || clearingHistory) return;

    const confirmed = window.confirm(
      `Clear transfer history and audit logs for "${history.assetName}"?\n\nThis is Admin-only and will keep one cleanup audit entry.`
    );
    if (!confirmed) return;

    setClearingHistory(true);
    setError(null);
    try {
      const res = await fetch(`/api/sms/history/${selectedAsset}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to clear history");
      }
      await fetchHistory(selectedAsset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    } finally {
      setClearingHistory(false);
    }
  };

  // -- Real-time relative time ticker --
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  void nowTick;

  // -- Render --
  return (
    <SmsPageShell>
      <SmsPageHeader
        title={t.history || "History"}
        description={t.auditTrail || "Complete transfer history and audit logs"}
        icon={History}
        tone="purple"
        actions={
          <Button
            variant="outline"
            onClick={fetchAssets}
            disabled={assetsLoading}
            className={smsSecondaryButtonClass}
          >
            <RefreshCw
              className={`w-4 h-4 ${assetsLoading ? "animate-spin" : ""}`}
            />
            {t.refresh}
          </Button>
        }
      />

        {/* ================================================================ */}
        {/* STATS CARDS */}
        {/* ================================================================ */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className={`${smsPanelClass} p-5`}>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-slate-100 p-2.5">
                  <BarChart3 className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Total Events
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>
            <div className={`${smsPanelClass} p-5`}>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-50 p-2.5">
                  <ArrowLeftRight className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Transfers
                  </p>
                  <p className="text-2xl font-semibold text-blue-900">
                    {stats.transfers}
                  </p>
                </div>
              </div>
            </div>
            <div className={`${smsPanelClass} p-5`}>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-emerald-50 p-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Audit Logs
                  </p>
                  <p className="text-2xl font-semibold text-emerald-900">
                    {stats.audits}
                  </p>
                </div>
              </div>
            </div>
            <div className={`${smsPanelClass} p-5`}>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-amber-50 p-2.5">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Last Activity
                  </p>
                  <p className="truncate text-lg font-semibold text-amber-900">
                    {stats.lastActivity || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MAIN CONTENT GRID */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* -------------------------------------------------------------- */}
          {/* SIDEBAR — ASSET SELECTOR */}
          {/* -------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`${smsPanelClass} overflow-hidden`}>
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-md bg-slate-100 p-2.5">
                    <Search className="h-5 w-5 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {t.selectAsset}
                  </h3>
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder={t.searchAssets || "Search assets..."}
                    className={`${smsInputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
                {assetsLoading ? (
                  <div className="p-3">
                    <AssetSkeleton />
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Inbox className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium">
                      {assetSearch.trim()
                        ? t.noAssetsFound || "No matching assets"
                        : t.noAssetsAvailable || "No assets available"}
                    </p>
                    {assetSearch.trim() && (
                      <button
                        onClick={() => setAssetSearch("")}
                        className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        {t.clearFiltersAdd || "Clear search"}
                      </button>
                    )}
                  </div>
                ) : (
                  filteredAssets.map((asset) => {
                    const isSelected = selectedAsset === asset.id;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => handleAssetSelect(asset.id)}
                        className={`w-full rounded-md border p-4 text-left transition-colors ${
                          isSelected
                            ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-semibold truncate ${
                                isSelected
                                  ? "text-emerald-900"
                                  : "text-slate-900"
                              }`}
                            >
                              {asset.name}
                            </p>
                            {asset.item_code && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {asset.item_code}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(
                              asset.status
                            )}`}
                          >
                            {asset.status}
                          </Badge>
                        </div>
                        {asset.type && (
                          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {asset.type}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {!assetsLoading && assets.length > 0 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500 text-center">
                    {filteredAssets.length} of {assets.length} assets
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* MAIN — TIMELINE */}
          {/* -------------------------------------------------------------- */}
          <div className="lg:col-span-8">
            {/* Loading State */}
            {historyLoading && (
              <div className={`${smsPanelClass} p-6 sm:p-8`}>
                <div className="space-y-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {!historyLoading && error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <h3 className="text-xl font-bold text-red-800 mb-2">
                  {t.error || "Error"}
                </h3>
                <p className="text-red-600 mb-6">{error}</p>
                <Button
                  onClick={() =>
                    selectedAsset && fetchHistory(selectedAsset)
                  }
                  className={smsDangerButtonClass}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t.retry}
                </Button>
              </div>
            )}

            {/* No Asset Selected */}
            {!historyLoading && !error && !selectedAsset && (
              <div className={`${smsPanelClass} p-10 text-center sm:p-14`}>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
                  <History className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  {t.noAssetSelected}
                </h3>
                <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
                  {t.selectAssetViewHistory}
                </p>
              </div>
            )}

            {/* Asset Selected — Content */}
            {!historyLoading && !error && selectedAsset && history && (
              <div className="space-y-6">
                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
                    {(
                      [
                        ["all", t.allStatus || "All"],
                        ["transfer", `${t.transfers || "Transfers"} ${stats ? `(${stats.transfers})` : ""}`],
                        ["audit", `${t.auditTrail || "Audit"} ${stats ? `(${stats.audits})` : ""}`],
                      ] as [EventFilter, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setEventFilter(key)}
                          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                          eventFilter === key
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 ml-auto">
                    <Filter className="w-4 h-4" />
                    <span>
                      {filteredEvents.length}{" "}
                      {filteredEvents.length === 1
                        ? t.events?.replace(/s$/, "") || "event"
                        : t.events || "events"}
                    </span>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      onClick={clearSelectedHistory}
                      disabled={clearingHistory || !history.events.length}
                      className={smsDangerButtonClass}
                    >
                      {clearingHistory ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Clear history
                    </Button>
                  )}
                </div>

                {/* Timeline */}
                {filteredEvents.length === 0 ? (
                  <div className={`${smsPanelClass} p-10 text-center sm:p-14`}>
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {t.noEventsFound}
                    </h3>
                    <p className="text-slate-600">
                      {eventFilter !== "all"
                        ? `No ${eventFilter} events match your filter.`
                        : t.noHistory || "No history events available."}
                    </p>
                    {eventFilter !== "all" && (
                      <Button
                        variant="outline"
                        onClick={() => setEventFilter("all")}
                        className={`${smsSecondaryButtonClass} mt-4`}
                      >
                        {t.allStatus || "Show All"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className={`${smsPanelClass} p-4 sm:p-6`}>
                    <div className="relative">
                      {/* Vertical timeline line */}
                      <div className="absolute bottom-4 left-[26px] top-4 hidden w-px bg-slate-200 sm:block" />

                      <div className="space-y-6">
                        {filteredEvents.map(
                          (event: HistoryEvent, index: number) => {
                            const isExpanded = expandedEvents.has(event.id);
                            const isLast = index === filteredEvents.length - 1;
                            const hasMetadata =
                              event.metadata &&
                              Object.keys(event.metadata).length > 0;
                            const eventImageUrl =
                              typeof event.metadata?.imageUrl === "string"
                                ? event.metadata.imageUrl
                                : "";

                            return (
                              <div
                                key={event.id}
                                className="relative flex gap-4 sm:gap-6 group"
                              >
                                {/* Icon column */}
                                <div className="relative z-10 flex-shrink-0 hidden sm:flex flex-col items-center">
                                  {getEventIcon(event.type)}
                                  {!isLast && (
                                    <div className="mt-3 w-px flex-1 bg-slate-200" />
                                  )}
                                </div>

                                {/* Mobile icon */}
                                <div className="sm:hidden flex-shrink-0 mt-1">
                                  {event.type === "transfer" ? (
                                    <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                  )}
                                </div>

                                {/* Content card */}
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`rounded-lg border p-5 transition-colors ${
                                      isExpanded
                                        ? "border-slate-300 bg-slate-50"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                                  >
                                    {/* Header row */}
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                      <Badge
                                        variant="outline"
                                        className={`rounded-md px-2.5 py-0.5 text-xs font-semibold capitalize ${getEventBadgeColor(
                                          event.type
                                        )}`}
                                      >
                                        {event.type}
                                      </Badge>
                                      {event.status && (
                                        <Badge
                                          variant="outline"
                                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(
                                            event.status
                                          )}`}
                                        >
                                          {event.status}
                                        </Badge>
                                      )}
                                      <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                                        <CalendarDays className="w-3 h-3" />
                                        {formatHistoryDateTime(event.timestamp, language)}
                                      </span>
                                    </div>

                                    {/* Description */}
                                    <p className="font-semibold text-slate-900 text-base mb-2">
                                      {event.description}
                                    </p>

                                    {/* Meta info grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                      {event.location && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                          <span className="truncate">
                                            {event.location}
                                          </span>
                                        </div>
                                      )}
                                      {event.userId && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                          <UserAvatar
                                            userId={event.userId}
                                            users={users}
                                          />
                                          <span className="truncate">
                                            {getUserDisplay(event.userId)}
                                          </span>
                                        </div>
                                      )}
                                      {event.type === "transfer" &&
                                        event.metadata && (
                                          <>
                                            {event.metadata.senderId && (
                                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <ArrowLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                <span className="text-slate-500">
                                                  {t.from || "From"}:
                                                </span>
                                                <span className="font-medium truncate">
                                                  {getUserDisplay(
                                                    String(
                                                      event.metadata.senderId
                                                    )
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                            {event.metadata.receiverId && (
                                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <ArrowLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 rotate-180" />
                                                <span className="text-slate-500">
                                                  {t.to || "To"}:
                                                </span>
                                                <span className="font-medium truncate">
                                                  {getUserDisplay(
                                                    String(
                                                      event.metadata.receiverId
                                                    )
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        )}
                                    </div>

                                    {/* Relative time */}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                                      <Clock className="w-3 h-3" />
                                      {formatRelativeTime(event.timestamp)}
                                    </div>

                                    {eventImageUrl && (
                                      <div className="relative mb-3 h-36 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:w-60">
                                        <Image
                                          src={eventImageUrl}
                                          alt="Return proof"
                                          fill
                                          sizes="240px"
                                          className="object-cover"
                                        />
                                      </div>
                                    )}

                                    {/* Expandable metadata */}
                                    {hasMetadata && (
                                      <div>
                                        <button
                                          onClick={() =>
                                            toggleExpand(event.id)
                                          }
                                          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          )}
                                          {t.viewMetadata}
                                          <span className="text-slate-400">
                                            ({Object.keys(event.metadata!).length}{" "}
                                            fields)
                                          </span>
                                        </button>

                                        {isExpanded && (
                                          <div className="mt-3 relative">
                                            <div className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4">
                                              <pre className="text-xs text-slate-300 font-mono leading-relaxed">
                                                {JSON.stringify(
                                                  event.metadata,
                                                  null,
                                                  2
                                                )}
                                              </pre>
                                            </div>
                                            <button
                                              onClick={() =>
                                                copyMetadata(
                                                  event.id,
                                                  event.metadata
                                                )
                                              }
                                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                              title="Copy JSON"
                                            >
                                              {copiedId === event.id ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                              ) : (
                                                <ClipboardCopy className="w-3.5 h-3.5 text-slate-400" />
                                              )}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
    </SmsPageShell>
  );
}
