"use client";

import { useAuthUser } from '@/shared/hooks/AuthContext';
import { hasAppPermission } from '@/shared/utils/permissions';
import { AlertCircle, ArrowLeftRight, ArrowUpDown, Clock, Eye, Filter, History, ImageIcon, Loader2, Package, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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
  const user = useAuthUser();
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
  const canCreateAsset = hasAppPermission(user.role, 'sms:create');
  const canTransferAsset = hasAppPermission(user.role, 'sms:transfer');

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
    if (shouldOpenCreateModal && canCreateAsset) {
      setCreateModalOpen(true);
    }
  }, [canCreateAsset, shouldOpenCreateModal]);

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
      { label: 'Available', value: stats.available, helper: 'Ready in inventory', color: 'text-emerald-700', badge: 'bg-emerald-50' },
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
  const hasAdvancedFilters = Boolean(
    filters.type || filters.category || filters.location || filters.assignedTo || filters.createdBy
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
        description="Track SMS assets, assignments, locations, and transfer status."
        icon={Package}
        tone="emerald"
        backHref={null}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            {canTransferAsset && (
              <Link href="/sms/transfer" className={smsSecondaryButtonClass}>
                <ArrowLeftRight className="h-4 w-4" />
                Move
              </Link>
            )}
            {canTransferAsset && (
              <Link href="/sms/pending" className={smsSecondaryButtonClass}>
                <Clock className="h-4 w-4" />
                Review Requests
              </Link>
            )}
            <Link href="/sms/history" className={smsSecondaryButtonClass}>
              <History className="h-4 w-4" />
              History
            </Link>
            {canCreateAsset && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className={`${smsPrimaryButtonClass} w-full sm:w-auto`}
            >
              <Plus className="h-4 w-4" />
              Add Asset
            </button>
            )}
          </div>
        }
      />

        {/* Stats Cards */}
        {stats && (
          <div className="mb-4 grid grid-cols-3 gap-2 xl:grid-cols-6">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="min-h-[70px] rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200 transition-shadow md:hover:shadow-md sm:min-h-[82px] sm:p-3 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className={`mb-1.5 inline-flex rounded-md px-1.5 py-0.5 text-lg font-semibold leading-none sm:mb-2 sm:px-2 sm:py-1 sm:text-xl ${card.badge} ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-[11px] font-medium leading-4 text-slate-500 sm:text-xs">
                  {card.label}
                </div>
                <div className="mt-0.5 hidden text-[11px] font-medium text-slate-400 sm:block">
                  {card.helper}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className={`${smsPanelClass} sticky top-3 z-20 mb-4 p-3 sm:static sm:p-4`}>
          <div className="grid gap-2 lg:grid-cols-12">
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
            <div className="relative lg:col-span-3">
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
              className={`${smsSelectClass} lg:col-span-1`}
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
          <details open={hasAdvancedFilters} className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden dark:text-slate-200">
              <span className="inline-flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                More filters
              </span>
              {hasAdvancedFilters && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-100">
                  Active
                </span>
              )}
            </summary>
            <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-800">
              <input
                type="text"
                title="Filter by type"
                placeholder="Type..."
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className={smsInputClass}
              />
              <input
                type="text"
                title="Filter by category"
                placeholder="Category..."
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className={smsInputClass}
              />
              <input
                type="text"
                title="Filter by location"
                placeholder="Location..."
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className={smsInputClass}
              />
              <input
                type="text"
                title="Filter by assigned person"
                placeholder="Assigned to..."
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                className={smsInputClass}
              />
              <input
                type="text"
                title="Filter by creator"
                placeholder="Created by..."
                value={filters.createdBy}
                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                className={smsInputClass}
              />
            </div>
          </details>
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
                  : canCreateAsset
                    ? 'Get started by adding your first asset.'
                    : 'No SMS assets are available yet.'
                }
              </p>
              {(hasActiveFilters || canCreateAsset) && (
                <button
                  type="button"
                  onClick={() => {
                    if (hasActiveFilters) {
                      clearFilters();
                      return;
                    }
                    if (canCreateAsset) {
                      setCreateModalOpen(true);
                    }
                  }}
                  className={`${smsPrimaryButtonClass} w-full sm:w-auto`}
                >
                  <Plus className="w-5 h-5" />
                  {hasActiveFilters ? 'Clear Filters' : 'Add First Asset'}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-2 p-2 md:hidden">
                {assets.map((asset) => {
                  const isFocused = asset.id === focusedAssetId;

                  return (
                    <article
                      key={asset.id}
                      id={getAssetListItemElementId(asset.id)}
                      role="link"
                      tabIndex={0}
                      aria-label="View asset details"
                      onClick={() => navigateToAssetDetail(asset.id)}
                      onKeyDown={(event) => handleAssetItemKeyDown(asset.id, event)}
                      className={`scroll-mt-24 min-w-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700/80 dark:bg-slate-900/80 ${
                        isFocused ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                      }`}
                    >
                    <div className="flex min-w-0 items-start gap-2.5">
                      {asset.imageUrl && !imageErrors.has(asset.id) ? (
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-sm dark:bg-slate-800">
                          <Image
                            src={asset.imageUrl!}
                            alt={asset.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            onError={() => handleImageError(asset.id)}
                            loading="lazy"
                            data-no-translate
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 shadow-sm dark:bg-slate-800">
                          <ImageIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start gap-2">
                          <h3 className="min-w-0 flex-1 truncate text-sm font-bold leading-5 text-slate-900 dark:text-white">
                            <span data-no-translate>{asset.name}</span>
                          </h3>
                          <span className={`inline-flex max-w-full shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${statusColor(asset.status)}`}>
                            {statusLabels[asset.status]}
                          </span>
                        </div>
                        <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                          {asset.itemCode ? (
                            <span data-no-translate>{asset.itemCode}</span>
                          ) : (
                            <span>{asset.type}</span>
                          )}
                        </p>
                        <div className="mt-1.5 flex min-w-0 flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                            Qty {asset.quantity ?? '-'}
                          </span>
                          <span className="max-w-[8rem] truncate rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                            {asset.location ? <span data-no-translate>{asset.location}</span> : 'No location'}
                          </span>
                          <span className="max-w-[9rem] truncate rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                            {asset.assignedTo ? <span data-no-translate>{asset.assignedTo}</span> : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Asset</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type / Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Assigned To</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
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
                          aria-label="View asset details"
                          onClick={() => navigateToAssetDetail(asset.id)}
                          onKeyDown={(event) => handleAssetItemKeyDown(asset.id, event)}
                          className={`scroll-mt-24 cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                            isFocused ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500' : 'hover:bg-slate-50/50'
                          }`}
                        >
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-3">
                            {asset.imageUrl && !imageErrors.has(asset.id) ? (
                              <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-slate-100 shadow-sm">
                                <Image
                                  src={asset.imageUrl!}
                                  alt={asset.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                  onError={() => handleImageError(asset.id)}
                                  loading="lazy"
                                  data-no-translate
                                />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 shadow-sm">
                                <ImageIcon className="h-5 w-5 text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate" data-no-translate>{asset.name}</div>
                              <div className="max-w-[18rem] truncate text-xs text-slate-500">
                                {asset.description || asset.refId ? (
                                  <span data-no-translate>{asset.description || asset.refId}</span>
                                ) : (
                                  'Asset details'
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="font-mono text-xs text-slate-600" data-no-translate>{asset.itemCode || '-'}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                              <span>{asset.type}</span>
                            </span>
                            <span className="text-xs text-slate-500">{asset.category || '-'}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColor(asset.status)}`}>
                            {statusLabels[asset.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{asset.quantity ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700" data-no-translate>{asset.location || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800" data-no-translate>
                            {asset.assignedTo || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigateToAssetDetail(asset.id);
                            }}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
      {canCreateAsset && (
        <AssetFormModal
          isOpen={createModalOpen}
          onClose={closeCreateModal}
          onSave={handleSaveAsset}
          initialData={{}}
          title="New Asset"
          isEdit={false}
        />
      )}
    </SmsPageShell>
  );
}

