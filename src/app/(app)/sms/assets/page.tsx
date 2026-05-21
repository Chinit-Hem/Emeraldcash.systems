"use client";

import { useAuthUser } from '@/app/components/AuthContext';
import { AlertCircle, ArrowLeft, Edit3, Eye, Filter, ImageIcon, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AssetFormModal from './components/AssetFormModal';
import ImageModal from './components/ImageModal';

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

type AssetFilters = {
  search: string;
  status: string;
  assignedTo: string;
  page: number;
  pageSize: number;
};

type AssetFilterKey = keyof AssetFilters;

export default function AssetsPage() {
  const user = useAuthUser();
  const isAdmin = user?.role === 'Admin';
  const [assets, setAssets] = useState<SmsAsset[]>([]);
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({
    search: '',
    status: '',
    assignedTo: '',
    page: 1,
    pageSize: 20
  });
  const [totalPages, setTotalPages] = useState(1);
const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<SmsAsset | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [viewImage, setViewImage] = useState<{ src: string; alt: string } | null>(null);

  // Track images that failed to load - reset when assets change
  useEffect(() => {
    setImageErrors(new Set());
  }, [assets]);

  // Handle image load error - show placeholder for broken images
  const handleImageError = useCallback((assetId: string) => {
    setImageErrors(prev => new Set(prev).add(assetId));
  }, []);

  const fetchAssets = useCallback(async (pageFilters: AssetFilters, signal?: AbortSignal) => {
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

  const handleFilterChange = <K extends AssetFilterKey>(key: K, value: AssetFilters[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? Number(value) : 1
    }));
  };

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void fetchAssets(filters, controller.signal);
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [filters, filtersKey, fetchAssets]);

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

  const handleReturn = async (asset: SmsAsset) => {
    if (!confirm(`Return ${asset.name} to stock?`)) return;

    try {
      const response = await fetch(`/api/sms/assets/${asset.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: asset.location || undefined,
          remark: 'Returned from asset inventory',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Return failed');
      }
      void fetchAssets(filters);
      void fetchStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Return failed');
    }
  };

  const statusColor = (status: string) => ({
    'Available': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    'In Use': 'bg-amber-100 text-amber-800 ring-amber-200',
    'Borrowed': 'bg-red-100 text-red-800 ring-red-200',
    'Out': 'bg-red-100 text-red-800 ring-red-200',
    'Not Returned': 'bg-slate-100 text-slate-800 ring-slate-200'
  }[status] || 'bg-slate-100 text-slate-800 ring-slate-200');

  const statCards = useMemo(() => {
    if (!stats) return [];

    return [
      { label: 'Total Assets', value: stats.totalAssets, color: 'from-emerald-600 to-emerald-700' },
      { label: 'Available', value: stats.available, color: 'from-emerald-500 to-emerald-600' },
      { label: 'In Use', value: stats.inUse, color: 'from-amber-500 to-amber-600' },
      { label: 'Borrowed', value: stats.borrowed, color: 'from-red-500 to-red-600' },
      { label: 'Out', value: stats.out, color: 'from-orange-500 to-orange-600' },
      { label: 'Not Returned', value: stats.notReturned, color: 'from-rose-500 to-rose-600' },
      {
        label: 'Today',
        value: stats.todayChange > 0 ? `+${stats.todayChange}` : stats.todayChange,
        color: 'from-violet-500 to-violet-600',
      },
    ];
  }, [stats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 px-4 py-4 sm:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <Link
              href="/sms"
              className="group flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/80 text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 sm:h-12 sm:w-12"
              aria-label="Back to SMS Dashboard"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold leading-tight bg-gradient-to-r from-slate-800 via-slate-700 to-emerald-800 bg-clip-text text-transparent sm:text-4xl">
                Asset Inventory
              </h1>
              <p className="mt-1 text-base leading-6 text-slate-600 sm:text-xl">
                Manage SMS equipment and resources
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 font-bold text-white shadow-md transition-colors hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.99] sm:w-auto sm:px-8"
            >
              <Plus className="w-5 h-5" />
              Add Asset
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-3 lg:grid-cols-7 lg:gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="min-h-[92px] rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm transition-shadow md:p-5 md:hover:shadow-lg"
              >
                <div className={`mb-2 bg-gradient-to-r ${card.color} bg-clip-text text-3xl font-bold leading-none text-transparent md:text-4xl`}>
                  {card.value}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:text-xs">
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm sm:mb-8 sm:p-6 md:shadow-lg">
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-end">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, code, location..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pl-12 text-base shadow-sm transition-colors focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 sm:h-14"
              />
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-52 lg:flex-none">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  title="Filter by asset status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-10 text-base shadow-sm transition-colors focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 sm:h-14"
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
                placeholder="Assigned to..."
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base shadow-sm transition-colors focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 sm:h-14 lg:w-48"
              />
            </div>
          </div>
        </div>

        {/* Assets */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-sm md:shadow-lg">
          {loading ? (
            <div className="p-8 text-center sm:p-12">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-emerald-600 sm:h-12 sm:w-12" />
              <p className="text-base text-slate-600 sm:text-lg">Loading assets...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center sm:p-12">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500 sm:h-16 sm:w-16" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Error</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={() => fetchAssets(filters)}
                className="min-h-11 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition-colors hover:bg-emerald-700"
              >
                Retry
              </button>
            </div>
          ) : !Array.isArray(assets) || assets.length === 0 ? (
            <div className="p-8 text-center sm:p-14">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 sm:h-24 sm:w-24">
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
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 font-bold text-white shadow-md transition-colors hover:from-emerald-700 hover:to-emerald-800 sm:w-auto sm:px-8"
              >
                <Plus className="w-5 h-5" />
                {filters.search ? 'Clear Filters & Add Asset' : 'Add First Asset'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {assets.map((asset) => (
                  <article
                    key={asset.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-4 flex items-start gap-3">
                      {asset.imageUrl && !imageErrors.has(asset.id) ? (
                        <button
                          type="button"
                          onClick={() => setViewImage({ src: asset.imageUrl!, alt: asset.name })}
                          className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          aria-label={`View ${asset.name} larger`}
                        >
                          <Image
                            src={asset.imageUrl!}
                            alt={asset.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            onError={() => handleImageError(asset.id)}
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 shadow-sm">
                          <ImageIcon className="h-6 w-6 text-slate-500" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-slate-900">{asset.name}</h3>
                        {asset.itemCode && (
                          <p className="truncate font-mono text-sm text-slate-500">{asset.itemCode}</p>
                        )}
                      </div>

                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Type</div>
                        <div className="truncate font-semibold text-slate-800">{asset.type}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Qty</div>
                        <div className="truncate font-semibold text-slate-800">{asset.quantity ?? '-'}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Location</div>
                        <div className="truncate font-semibold text-slate-800">{asset.location || '-'}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Assigned</div>
                        <div className="truncate font-semibold text-slate-800">{asset.assignedTo || 'Unassigned'}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/sms/assets/${asset.id}`}
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                      <button
                        onClick={() => setEditingAsset(asset)}
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="flex min-h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                          aria-label={`Delete ${asset.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Asset</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Assigned</th>
                      <th className="px-6 py-5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(assets) && assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            {asset.imageUrl && !imageErrors.has(asset.id) ? (
                              <button
                                type="button"
                                onClick={() => setViewImage({ src: asset.imageUrl!, alt: asset.name })}
                                className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md bg-slate-100 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                              <div className="w-14 h-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center shadow-md">
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
                          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-2xl bg-slate-100 text-slate-800">
                            {asset.type}
                          </span>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-2xl font-bold text-sm ring-2 ring-inset ${statusColor(asset.status)}`}>
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
                              href={`/sms/assets/${asset.id}`}
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">View</span>
                            </Link>
                            <button
                              onClick={() => setEditingAsset(asset)}
                              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(asset.id)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-xl transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
                        className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handleFilterChange('page', filters.page + 1)}
                        disabled={filters.page === totalPages}
                        className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  );
}

