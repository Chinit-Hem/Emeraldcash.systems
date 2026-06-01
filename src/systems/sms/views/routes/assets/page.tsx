"use client";

import { useAuthUser } from '@/shared/hooks/AuthContext';
import { AlertCircle, Edit3, Eye, Filter, ImageIcon, Loader2, Package, Plus, Search, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AssetFormModal from '@/systems/sms/components/assets/AssetFormModal';
import ImageModal from '@/systems/sms/components/assets/ImageModal';
import {
  SmsPageHeader,
  SmsPageShell,
  smsInputClass,
  smsPanelClass,
  smsPrimaryButtonClass,
  smsSecondaryButtonClass,
  smsSelectClass,
} from '@/systems/sms/components/SmsShared';
import {
  areAssetListFiltersEqual,
  buildAssetDetailPath,
  buildAssetListPath,
  getAssetListItemElementId,
  parseAssetListFilters,
  SMS_ASSET_FOCUS_PARAM,
  type AssetListFilters,
} from '@/systems/sms/utils/assetNavigation';

interface SmsAsset {
  id: string;
  name: string;
  itemCode?: string;
  type: string;
  category?: string;
  quantity?: number;
  location?: string;
  assignedTo?: string;
  imageUrl?: string;
  status: 'Available' | 'In Use' | 'Borrowed' | 'Out' | 'Not Returned';
}

interface SmsStats {
  totalAssets: number;
  todayChange: number;
  available: number;
  inUse: number;
  borrowed: number;
  out: number;
  notReturned: number;
  pendingTransfers: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

type AssetFilterKey = keyof AssetListFilters;

export default function AssetsPage() {
  const user = useAuthUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = user?.role === 'Admin';
  const [assets, setAssets] = useState<SmsAsset[]>([]);
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetListFilters>(() =>
    parseAssetListFilters(searchParams)
  );
  const [totalPages, setTotalPages] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<SmsAsset | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [viewImage, setViewImage] = useState<{ src: string; alt: string } | null>(null);
  const focusedAssetId = searchParams.get(SMS_ASSET_FOCUS_PARAM) ?? '';

  // Track images that failed to load - reset when assets change
  useEffect(() => {
    setImageErrors(new Set());
  }, [assets]);

  // Handle image load error - show placeholder for broken images
  const handleImageError = useCallback((assetId: string) => {
    setImageErrors(prev => new Set(prev).add(assetId));
  }, []);

  const fetchAssets = useCallback(async (pageFilters: AssetListFilters, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pageFilters.page.toString(),
        pageSize: pageFilters.pageSize.toString(),
        ...(pageFilters.search && { search: pageFilters.search }),
        ...(pageFilters.status && { status: pageFilters.status }),
        ...(pageFilters.assignedTo && { assigned_to: pageFilters.assignedTo })
      });

      const response = await fetch(`/api/sms/assets?${params}`, { signal });
      const data: ApiResponse<SmsAsset[]> = await response.json();

      if (data.success) {
        // Ensure data.data is always an array
        const assetsArray = Array.isArray(data.data) ? data.data : [];
        setAssets(assetsArray);
        setTotalPages(data.totalPages || 1);
      } else {
        setError(data.error || 'Failed to load assets');
        setAssets([]); // Reset to empty array on error
      }
    } catch (err) {
      if (signal?.aborted) return;
      setError(`Failed to fetch assets: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setAssets([]); // Reset to empty array on error
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/sms/stats');
      const data: ApiResponse<SmsStats> = await response.json();
      if (data.success) {
        setStats(data.data ?? null);
      }
    } catch (err) {
      console.error('Stats fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const nextFilters = parseAssetListFilters(searchParams);

    setFilters((currentFilters) =>
      areAssetListFiltersEqual(currentFilters, nextFilters) ? currentFilters : nextFilters
    );
  }, [searchParams]);

  const handleFilterChange = useCallback(
    (key: AssetFilterKey, value: string | number) => {
      const nextFilters: AssetListFilters = {
        ...filters,
        [key]: key === 'page' || key === 'pageSize' ? Number(value) : String(value),
        page: key === 'page' ? Number(value) : 1,
      };

      setFilters(nextFilters);
      router.replace(buildAssetListPath(nextFilters), { scroll: false });
    },
    [filters, router]
  );

  const getAssetDetailHref = useCallback(
    (assetId: string) => buildAssetDetailPath(assetId, buildAssetListPath(filters, assetId)),
    [filters]
  );

  const rememberAssetReturnTarget = useCallback(
    (assetId: string, event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      window.history.replaceState(
        window.history.state,
        '',
        buildAssetListPath(filters, assetId)
      );
    },
    [filters]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void fetchAssets(filters, controller.signal);
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [filters, fetchAssets]);

  useEffect(() => {
    if (loading || !focusedAssetId || assets.length === 0) {
      return;
    }

    const target = document.getElementById(getAssetListItemElementId(focusedAssetId));

    if (!target) {
      return;
    }

    const scrollTimeout = window.setTimeout(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.focus({ preventScroll: true });
    }, 80);

    return () => window.clearTimeout(scrollTimeout);
  }, [assets, focusedAssetId, loading]);

  const handleSaveAsset = async (data: Omit<SmsAsset, 'id'>): Promise<{ success: boolean; error?: string; errors?: Record<string, string> }> => {
    try {
      const method = editingAsset ? 'PUT' : 'POST';
      const url = editingAsset ? `/api/sms/assets/${editingAsset.id}` : '/api/sms/assets';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        void fetchAssets(filters);
        void fetchStats();
        setCreateModalOpen(false);
        setEditingAsset(null);
        return { success: true };
      }
      // Return both general error and field-level errors if available
      const errorMessage = result.error || 'Save failed';
      const fieldErrors = result.errors;
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        return { success: false, error: errorMessage, errors: fieldErrors };
      }
      return { success: false, error: errorMessage };
    } catch (_err) {
      return { success: false, error: 'Save failed' };
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('Delete this asset?')) return;

    try {
      const response = await fetch(`/api/sms/assets/${assetId}`, { method: 'DELETE' });
      if (response.ok) {
        setAssets((current) => current.filter((asset) => asset.id !== assetId));
        void fetchStats();
      }
    } catch (_err) {
      alert('Delete failed');
    }
  };

  const statusColor = (status: string) => ({
    'Available': 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-300/60',
    'In Use': 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-300/60',
    'Borrowed': 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-300/60',
    'Out': 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-300/60',
    'Not Returned': 'bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-700/70 dark:text-slate-100 dark:ring-slate-500'
  }[status] || 'bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-700/70 dark:text-slate-100 dark:ring-slate-500');

  const statCards = useMemo(() => {
    if (!stats) return [];

    return [
      { label: 'Total Assets', value: stats.totalAssets, color: 'text-emerald-700', badge: 'bg-emerald-50' },
      { label: 'Available', value: stats.available, color: 'text-emerald-700', badge: 'bg-emerald-50' },
      { label: 'In Use', value: stats.inUse, color: 'text-amber-700', badge: 'bg-amber-50' },
      { label: 'Borrowed', value: stats.borrowed, color: 'text-red-700', badge: 'bg-red-50' },
      { label: 'Out', value: stats.out, color: 'text-orange-700', badge: 'bg-orange-50' },
      { label: 'Not Returned', value: stats.notReturned, color: 'text-rose-700', badge: 'bg-rose-50' },
      {
        label: 'Today',
        value: stats.todayChange > 0 ? `+${stats.todayChange}` : stats.todayChange,
        color: 'text-purple-700',
        badge: 'bg-purple-50',
      },
    ];
  }, [stats]);

  return (
    <SmsPageShell>
      <SmsPageHeader
        title="Asset Inventory"
        description="Manage SMS equipment and resources"
        icon={Package}
        tone="emerald"
        actions={
            <button
              onClick={() => setCreateModalOpen(true)}
              className={`${smsPrimaryButtonClass} w-full sm:w-auto`}
            >
              <Plus className="w-5 h-5" />
              Add Asset
            </button>
        }
      />

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7 lg:gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="min-h-[92px] rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow md:hover:shadow-md"
              >
                <div className={`mb-3 inline-flex rounded-md px-2 py-1 text-2xl font-semibold leading-none ${card.badge} ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className={`${smsPanelClass} mb-6 p-4 sm:p-5`}>
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-end">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                title="Search assets"
                placeholder="Search name, code, location..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={`${smsInputClass} pl-12`}
              />
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-52 lg:flex-none">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  title="Filter by asset status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className={`${smsSelectClass} pl-12`}
                >
                  <option value="">All Status</option>
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Borrowed">Borrowed</option>
                  <option value="Out">Out</option>
                  <option value="Not Returned">Not Returned</option>
                </select>
              </div>
              <input
                type="text"
                title="Filter by assignee"
                placeholder="Assigned to..."
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                className={`${smsInputClass} lg:w-48`}
              />
            </div>
          </div>
        </div>

        {/* Assets */}
        <div className={`${smsPanelClass} min-w-0 overflow-hidden`}>
          {loading ? (
            <div className="p-8 text-center sm:p-12">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-emerald-600 sm:h-12 sm:w-12" />
              <p className="text-base text-slate-600">Loading assets...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center sm:p-12">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500 sm:h-16 sm:w-16" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Error</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                type="button"
                onClick={() => fetchAssets(filters)}
                className={smsPrimaryButtonClass}
              >
                Retry
              </button>
            </div>
          ) : !Array.isArray(assets) || assets.length === 0 ? (
            <div className="p-8 text-center sm:p-14">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-lg bg-slate-100 sm:h-24 sm:w-24">
                <Search className="h-10 w-10 text-slate-500 sm:h-12 sm:w-12" />
              </div>
              <h3 className="mb-2 text-2xl font-bold leading-tight text-slate-800">No assets found</h3>
              <p className="mx-auto mb-6 max-w-md text-base leading-6 text-slate-600">
                {filters.search || filters.status || filters.assignedTo
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first asset.'
                }
              </p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className={`${smsPrimaryButtonClass} w-full sm:w-auto`}
              >
                <Plus className="w-5 h-5" />
                {filters.search ? 'Clear Filters & Add Asset' : 'Add First Asset'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-3 p-2.5 md:hidden">
                {assets.map((asset) => {
                  const isFocused = asset.id === focusedAssetId;

                  return (
                    <article
                      key={asset.id}
                      id={getAssetListItemElementId(asset.id)}
                      tabIndex={isFocused ? -1 : undefined}
                      className={`scroll-mt-24 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm outline-none transition-shadow dark:border-slate-700/80 dark:bg-slate-900/80 ${
                        isFocused ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                      }`}
                    >
                    <div className="flex min-w-0 items-start gap-3">
                      {asset.imageUrl && !imageErrors.has(asset.id) ? (
                        <button
                          type="button"
                          onClick={() => setViewImage({ src: asset.imageUrl!, alt: asset.name })}
                          className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800"
                          aria-label={`View ${asset.name} larger`}
                        >
                          <Image
                            src={asset.imageUrl!}
                            alt={asset.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                            onError={() => handleImageError(asset.id)}
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 shadow-sm dark:bg-slate-800">
                          <ImageIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
                          <h3 className="min-w-0 flex-1 break-words text-base font-bold leading-6 text-slate-900 dark:text-white">
                            {asset.name}
                          </h3>
                          <span className={`inline-flex max-w-full shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusColor(asset.status)}`}>
                            {asset.status}
                          </span>
                        </div>
                        {asset.itemCode && (
                          <p className="mt-1 break-all font-mono text-sm text-slate-500 dark:text-slate-400">{asset.itemCode}</p>
                        )}
                      </div>
                    </div>

                    <dl className="mt-4 grid min-w-0 grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 text-sm dark:border-slate-800 dark:bg-slate-950/35">
                      {[
                        { label: 'Type', value: asset.type },
                        { label: 'Qty', value: asset.quantity ?? '-' },
                        { label: 'Location', value: asset.location || '-' },
                        { label: 'Assigned', value: asset.assignedTo || 'Unassigned' },
                      ].map((item, index) => (
                        <div
                          key={item.label}
                          className={`min-w-0 px-3 py-3 ${index % 2 === 1 ? 'border-l border-slate-200 dark:border-slate-800' : ''} ${index > 1 ? 'border-t border-slate-200 dark:border-slate-800' : ''}`}
                        >
                          <dt className="text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{item.label}</dt>
                          <dd className="mt-0.5 min-h-5 break-words font-semibold leading-5 text-slate-900 dark:text-slate-100">{item.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className={`mt-4 grid min-w-0 gap-2 ${isAdmin ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem]' : 'grid-cols-2'}`}>
                      <Link
                        href={getAssetDetailHref(asset.id)}
                        onClick={(event) => rememberAssetReturnTarget(asset.id, event)}
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingAsset(asset)}
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-100 dark:ring-1 dark:ring-emerald-400/30 dark:hover:bg-emerald-500/30"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(asset.id)}
                          className="flex min-h-11 min-w-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-red-500/15 dark:text-red-200 dark:ring-1 dark:ring-red-400/20 dark:hover:bg-red-500/25"
                          aria-label={`Delete ${asset.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Asset</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Type</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Status</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Location</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Assigned</th>
                      <th className="px-6 py-5 text-right text-xs font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(assets) && assets.map((asset) => {
                      const isFocused = asset.id === focusedAssetId;

                      return (
                        <tr
                          key={asset.id}
                          id={getAssetListItemElementId(asset.id)}
                          tabIndex={isFocused ? -1 : undefined}
                          className={`scroll-mt-24 outline-none transition-colors ${
                            isFocused ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500' : 'hover:bg-slate-50/50'
                          }`}
                        >
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            {asset.imageUrl && !imageErrors.has(asset.id) ? (
                              <button
                                type="button"
                                onClick={() => setViewImage({ src: asset.imageUrl!, alt: asset.name })}
                                className="relative w-14 h-14 rounded-lg overflow-hidden shadow-sm bg-slate-100 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                aria-label={`View ${asset.name} larger`}
                              >
                                <Image
                                  src={asset.imageUrl!}
                                  alt={asset.name}
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                  onError={() => handleImageError(asset.id)}
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm">
                                <ImageIcon className="w-8 h-8 text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate">{asset.name}</div>
                              {asset.itemCode && (
                                <div className="text-sm font-mono text-slate-500 truncate">{asset.itemCode}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-md bg-slate-100 text-slate-800">
                            {asset.type}
                          </span>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-md font-semibold text-sm ring-1 ring-inset ${statusColor(asset.status)}`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-sm text-slate-700">{asset.location || '-'}</td>
                        <td className="px-6 py-6">
                          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-sm rounded-full font-medium">
                            {asset.assignedTo || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2 justify-end">
                            <Link
                              href={getAssetDetailHref(asset.id)}
                              onClick={(event) => rememberAssetReturnTarget(asset.id, event)}
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">View</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setEditingAsset(asset)}
                              aria-label={`Edit ${asset.name}`}
                              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDelete(asset.id)}
                                aria-label={`Delete ${asset.name}`}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-700">
                      Page {filters.page} of {totalPages}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button
                        onClick={() => handleFilterChange('page', filters.page - 1)}
                        disabled={filters.page === 1}
                        className={smsSecondaryButtonClass}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handleFilterChange('page', filters.page + 1)}
                        disabled={filters.page === totalPages}
                        className={smsSecondaryButtonClass}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* Create/Edit Modal */}
      <AssetFormModal
        isOpen={createModalOpen || !!editingAsset}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingAsset(null);
        }}
        onSave={handleSaveAsset}
        initialData={editingAsset || {}}
        title={editingAsset ? `Edit ${editingAsset.name}` : 'New Asset'}
        isEdit={!!editingAsset}
      />

      {/* Image lightbox modal */}
      <ImageModal
        src={viewImage?.src || ""}
        alt={viewImage?.alt || ""}
        isOpen={!!viewImage}
        onClose={() => setViewImage(null)}
      />
    </SmsPageShell>
  );
}

