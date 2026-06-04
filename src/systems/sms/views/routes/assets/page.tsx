"use client";

import { AlertCircle, ArrowUpDown, Eye, Filter, ImageIcon, Loader2, Package, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { getAppScrollSnapshot, restoreAppScrollSnapshot } from '@/shared/utils/appScroll';
import AssetFormModal from '@/systems/sms/components/assets/AssetFormModal';
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
  DEFAULT_ASSET_LIST_FILTERS,
  getAssetListItemElementId,
  getStoredAssetListScrollSnapshot,
  parseAssetListFilters,
  rememberAssetListScrollSnapshot,
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
  createdBy?: string | null;
  imageUrl?: string;
  description?: string | null;
  refId?: string | null;
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

const statusLabels: Record<SmsAsset['status'], string> = {
  Available: 'Available',
  'In Use': 'Assigned',
  Borrowed: 'Borrowed',
  Out: 'Sent Out',
  'Not Returned': 'Overdue Return',
};

const sortOptions = [
  { value: 'updated_desc', label: 'Latest Update' },
  { value: 'created_desc', label: 'Newest Added' },
  { value: 'name_asc', label: 'Name' },
  { value: 'status_asc', label: 'Status' },
  { value: 'quantity_desc', label: 'Quantity' },
  { value: 'location_asc', label: 'Location' },
] as const;

export default function AssetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<SmsAsset[]>([]);
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetListFilters>(() =>
    parseAssetListFilters(searchParams)
  );
  const [totalPages, setTotalPages] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const focusedAssetId = searchParams.get(SMS_ASSET_FOCUS_PARAM) ?? '';
  const shouldOpenCreateModal = searchParams.get('action') === 'new';

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
        ...(pageFilters.type && { type: pageFilters.type }),
        ...(pageFilters.category && { category: pageFilters.category }),
        ...(pageFilters.location && { location: pageFilters.location }),
        ...(pageFilters.assignedTo && { assigned_to: pageFilters.assignedTo }),
        ...(pageFilters.createdBy && { created_by: pageFilters.createdBy }),
        ...(pageFilters.sort && { sort: pageFilters.sort })
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
    if (shouldOpenCreateModal) {
      setCreateModalOpen(true);
    }
  }, [shouldOpenCreateModal]);

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
      const nextPath = buildAssetListPath(nextFilters);
      const scrollSnapshot = getAppScrollSnapshot();

      rememberAssetListScrollSnapshot(nextPath, scrollSnapshot);
      setFilters(nextFilters);
      router.replace(nextPath, { scroll: false });
    },
    [filters, router]
  );

  const rememberAssetReturnTarget = useCallback(
    (assetId: string) => {
      const returnPath = buildAssetListPath(filters, assetId);

      rememberAssetListScrollSnapshot(returnPath, getAppScrollSnapshot());
      window.history.replaceState(
        window.history.state,
        '',
        returnPath
      );

      return returnPath;
    },
    [filters]
  );

  const navigateToAssetDetail = useCallback(
    (assetId: string) => {
      const returnPath = rememberAssetReturnTarget(assetId);
      router.push(buildAssetDetailPath(assetId, returnPath), { scroll: false });
    },
    [rememberAssetReturnTarget, router]
  );

  const handleAssetItemKeyDown = useCallback(
    (assetId: string, event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      navigateToAssetDetail(assetId);
    },
    [navigateToAssetDetail]
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadAssets = () => {
      void fetchAssets(filters, controller.signal);
    };

    if (!filters.search.trim()) {
      loadAssets();
      return () => {
        controller.abort();
      };
    }

    const timeout = setTimeout(loadAssets, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [filters, fetchAssets]);

  useLayoutEffect(() => {
    if (loading || assets.length === 0) {
      return;
    }

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const storedScrollSnapshot = getStoredAssetListScrollSnapshot(currentPath);

    if (storedScrollSnapshot) {
      restoreAppScrollSnapshot(storedScrollSnapshot);
    }

    if (!focusedAssetId) {
      return;
    }

    const focusTarget = () => {
      const target = document.getElementById(getAssetListItemElementId(focusedAssetId));
      if (!target) return;

      if (!storedScrollSnapshot) {
        target.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
      target.focus({ preventScroll: true });
    };

    focusTarget();
    const focusFrame = window.requestAnimationFrame(focusTarget);

    return () => window.cancelAnimationFrame(focusFrame);
  }, [assets, focusedAssetId, loading]);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);

    if (shouldOpenCreateModal) {
      router.replace(buildAssetListPath(filters), { scroll: false });
    }
  }, [filters, router, shouldOpenCreateModal]);

  const handleSaveAsset = async (data: Omit<SmsAsset, 'id'>): Promise<{ success: boolean; error?: string; errors?: Record<string, string> }> => {
    try {
      const response = await fetch('/api/sms/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        void fetchAssets(filters);
        void fetchStats();
        closeCreateModal();
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
      { label: 'Total Assets', value: stats.totalAssets, helper: 'All inventory', color: 'text-slate-800', badge: 'bg-slate-100' },
      { label: 'Available', value: stats.available, helper: 'Ready in stock', color: 'text-emerald-700', badge: 'bg-emerald-50' },
      { label: 'Assigned', value: stats.inUse, helper: 'Currently in use', color: 'text-amber-700', badge: 'bg-amber-50' },
      { label: 'Sent Out', value: stats.borrowed + stats.out, helper: `${stats.borrowed} borrowed / ${stats.out} out`, color: 'text-blue-700', badge: 'bg-blue-50' },
      { label: 'Overdue Return', value: stats.notReturned, helper: 'Needs follow-up', color: 'text-rose-700', badge: 'bg-rose-50' },
      { label: 'Pending Transfers', value: stats.pendingTransfers, helper: 'Waiting approval', color: 'text-purple-700', badge: 'bg-purple-50' },
    ];
  }, [stats]);

  const hasActiveFilters = !areAssetListFiltersEqual(
    filters,
    { ...DEFAULT_ASSET_LIST_FILTERS, page: filters.page, pageSize: filters.pageSize }
  );

  const clearFilters = useCallback(() => {
    const nextFilters = {
      ...DEFAULT_ASSET_LIST_FILTERS,
      pageSize: filters.pageSize,
    };

    router.replace(buildAssetListPath(nextFilters), { scroll: false });
  }, [filters.pageSize, router]);

  return (
    <SmsPageShell>
      <SmsPageHeader
        title="Asset Inventory"
        description="Track SMS stock, assignments, locations, and transfer status."
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
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 xl:gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="min-h-[104px] rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow md:hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className={`mb-3 inline-flex rounded-md px-2 py-1 text-2xl font-semibold leading-none ${card.badge} ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {card.label}
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-400">
                  {card.helper}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className={`${smsPanelClass} mb-6 p-4 sm:p-5`}>
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="relative min-w-0 lg:col-span-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                title="Search assets"
                placeholder="Search name, code, location, assigned person..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={`${smsInputClass} pl-12`}
              />
            </div>
            <div className="relative lg:col-span-2">
              <Filter className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <select
                title="Filter by asset status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={`${smsSelectClass} pl-12`}
              >
                <option value="">All Status</option>
                <option value="Available">Available</option>
                <option value="In Use">Assigned</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Out">Sent Out</option>
                <option value="Not Returned">Overdue Return</option>
              </select>
            </div>
            <input
              type="text"
              title="Filter by type"
              placeholder="Type..."
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className={`${smsInputClass} lg:col-span-2`}
            />
            <input
              type="text"
              title="Filter by category"
              placeholder="Category..."
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className={`${smsInputClass} lg:col-span-2`}
            />
            <input
              type="text"
              title="Filter by location"
              placeholder="Location..."
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className={`${smsInputClass} lg:col-span-2`}
            />
            <input
              type="text"
              title="Filter by assigned person"
              placeholder="Assigned to..."
              value={filters.assignedTo}
              onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              className={`${smsInputClass} lg:col-span-2`}
            />
            <input
              type="text"
              title="Filter by creator"
              placeholder="Created by..."
              value={filters.createdBy}
              onChange={(e) => handleFilterChange('createdBy', e.target.value)}
              className={`${smsInputClass} lg:col-span-2`}
            />
            <div className="relative lg:col-span-2">
              <ArrowUpDown className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <select
                title="Sort assets"
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className={`${smsSelectClass} pl-12`}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <select
              title="Assets per page"
              value={filters.pageSize}
              onChange={(e) => handleFilterChange('pageSize', e.target.value)}
              className={`${smsSelectClass} lg:col-span-2`}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className={`${smsSecondaryButtonClass} lg:col-span-2`}
            >
              Clear Filters
            </button>
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
                {hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first asset.'
                }
              </p>
              <button
                type="button"
                onClick={() => {
                  if (hasActiveFilters) {
                    clearFilters();
                  }
                  setCreateModalOpen(true);
                }}
                className={`${smsPrimaryButtonClass} w-full sm:w-auto`}
              >
                <Plus className="w-5 h-5" />
                {hasActiveFilters ? 'Clear Filters & Add Asset' : 'Add First Asset'}
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
                      role="link"
                      tabIndex={0}
                      aria-label={`View ${asset.name} details`}
                      onClick={() => navigateToAssetDetail(asset.id)}
                      onKeyDown={(event) => handleAssetItemKeyDown(asset.id, event)}
                      className={`scroll-mt-24 min-w-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700/80 dark:bg-slate-900/80 ${
                        isFocused ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                      }`}
                    >
                    <div className="flex min-w-0 items-start gap-3">
                      {asset.imageUrl && !imageErrors.has(asset.id) ? (
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-sm dark:bg-slate-800">
                          <Image
                            src={asset.imageUrl!}
                            alt={asset.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                            onError={() => handleImageError(asset.id)}
                            loading="lazy"
                          />
                        </div>
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
                            {statusLabels[asset.status]}
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
                        { label: 'Category', value: asset.category || '-' },
                        { label: 'Quantity', value: asset.quantity ?? '-' },
                        { label: 'Location', value: asset.location || '-' },
                        { label: 'Assigned To', value: asset.assignedTo || '-' },
                        { label: 'Created By', value: asset.createdBy || '-' },
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
                    <div className="mt-4 flex justify-end">
                      <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                        <Eye className="h-4 w-4" />
                        View
                      </span>
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
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Code</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Type / Category</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Status</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Qty</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Location</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-slate-600">Assigned To</th>
                      <th className="px-6 py-5 text-right text-xs font-semibold text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(assets) && assets.map((asset) => {
                      const isFocused = asset.id === focusedAssetId;

                      return (
                        <tr
                          key={asset.id}
                          id={getAssetListItemElementId(asset.id)}
                          role="link"
                          tabIndex={0}
                          aria-label={`View ${asset.name} details`}
                          onClick={() => navigateToAssetDetail(asset.id)}
                          onKeyDown={(event) => handleAssetItemKeyDown(asset.id, event)}
                          className={`scroll-mt-24 cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                            isFocused ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500' : 'hover:bg-slate-50/50'
                          }`}
                        >
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            {asset.imageUrl && !imageErrors.has(asset.id) ? (
                              <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-slate-100 shadow-sm">
                                <Image
                                  src={asset.imageUrl!}
                                  alt={asset.name}
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                  onError={() => handleImageError(asset.id)}
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm">
                                <ImageIcon className="w-8 h-8 text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate">{asset.name}</div>
                              <div className="text-sm text-slate-500 truncate">{asset.description || asset.refId || 'Asset details'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className="font-mono text-sm text-slate-600">{asset.itemCode || '-'}</span>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="w-fit rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                              {asset.type}
                            </span>
                            <span className="text-xs text-slate-500">{asset.category || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-md font-semibold text-sm ring-1 ring-inset ${statusColor(asset.status)}`}>
                            {statusLabels[asset.status]}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-sm font-semibold text-slate-700">{asset.quantity ?? '-'}</td>
                        <td className="px-6 py-6 text-sm text-slate-700">{asset.location || '-'}</td>
                        <td className="px-6 py-6">
                          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
                            {asset.assignedTo || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigateToAssetDetail(asset.id);
                            }}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
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

      {/* Create Modal */}
      <AssetFormModal
        isOpen={createModalOpen}
        onClose={closeCreateModal}
        onSave={handleSaveAsset}
        initialData={{}}
        title="New Asset"
        isEdit={false}
      />
    </SmsPageShell>
  );
}

