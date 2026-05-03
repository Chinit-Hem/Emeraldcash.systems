"use client";

import { AlertCircle, ArrowLeft, Edit3, Eye, Filter, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AssetFormModal from './components/AssetFormModal';

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
  status: 'Available' | 'In Use' | 'Borrowed';
}

interface SmsStats {
  totalAssets: number;
  available: number;
  inUse: number;
  borrowed: number;
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

export default function AssetsPage() {
  const [assets, setAssets] = useState<SmsAsset[]>([]);
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assignedTo: '',
    page: 1,
    pageSize: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<SmsAsset | null>(null);

  const fetchAssets = useCallback(async (pageFilters = filters) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pageFilters.page.toString(),
        pageSize: pageFilters.pageSize.toString(),
        ...(pageFilters.search && { search: pageFilters.search }),
        ...(pageFilters.status && { status: pageFilters.status }),
        ...(pageFilters.assignedTo && { assignedTo: pageFilters.assignedTo })
      });

      const response = await fetch(`/api/sms/assets?${params}`);
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
      setError(`Failed to fetch assets: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setAssets([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
    fetchStats();
    fetchAssets();
  }, [fetchAssets, fetchStats]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page
    }));
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAssets();
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters, fetchAssets]);

  const handleSaveAsset = async (data: Omit<SmsAsset, 'id'>): Promise<{ success: boolean; error?: string }> => {
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
        fetchAssets();
        fetchStats();
        setCreateModalOpen(false);
        setEditingAsset(null);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (_err) {
      return { success: false, error: 'Save failed' };
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('Delete this asset?')) return;

    try {
      const response = await fetch(`/api/sms/assets/${assetId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchAssets();
        fetchStats();
      }
    } catch (_err) {
      alert('Delete failed');
    }
  };

  const statusColor = (status: string) => ({
    'Available': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    'In Use': 'bg-amber-100 text-amber-800 ring-amber-200',
    'Borrowed': 'bg-red-100 text-red-800 ring-red-200'
  }[status] || 'bg-slate-100 text-slate-800 ring-slate-200');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/sms"
              className="group p-3 -m-3 rounded-2xl bg-slate-100/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-slate-600 hover:text-slate-900"
              aria-label="Back to SMS Dashboard"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-emerald-800 bg-clip-text text-transparent mb-2">
                Asset Inventory
              </h1>
              <p className="text-xl text-slate-600">
                Manage SMS equipment and resources
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-3xl font-bold shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transform hover:-translate-y-1 transition-all whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add Asset
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="group p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer">
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent mb-3">
                {stats.totalAssets}
              </div>
              <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Total Assets</div>
            </div>
            <div className="group p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all">
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent mb-3">
                {stats.available}
              </div>
              <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Available</div>
            </div>
            <div className="group p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all">
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent mb-3">
                {stats.inUse}
              </div>
              <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">In Use</div>
            </div>
            <div className="group p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent mb-3">
                {stats.borrowed}
              </div>
              <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Borrowed</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets by name or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-12 pr-6 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/50 backdrop-blur-sm shadow-inner transition-all"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="pl-12 pr-6 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/50 backdrop-blur-sm shadow-inner transition-all"
                >
                  <option value="">All Status</option>
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Borrowed">Borrowed</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Assigned to..."
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                className="px-6 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/50 backdrop-blur-sm shadow-inner transition-all w-48"
              />
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-lg text-slate-600">Loading assets...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Error</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={() => fetchAssets()}
                className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
              >
                Retry
              </button>
            </div>
          ) : !Array.isArray(assets) || assets.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-24 h-24 bg-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-slate-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">No assets found</h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                {filters.search || filters.status || filters.assignedTo 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by adding your first asset.'
                }
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-3xl font-bold shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transform hover:-translate-y-1 transition-all inline-flex items-center gap-3"
              >
                <Plus className="w-5 h-5" />
                {filters.search ? 'Clear Filters & Add Asset' : 'Add First Asset'}
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
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
                            {asset.imageUrl ? (
                              <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md bg-slate-100">
                                <Image 
                                  src={asset.imageUrl!} 
                                  alt={asset.name} 
                                  fill 
                                  sizes="56px" 
                                  className="object-cover" 
                                />
                              </div>
                            ) : (
                              <div className="w-14 h-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center shadow-md">
                                <div className="w-8 h-8 text-slate-500" />
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
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">View</span>
                            </Link>
                            <button
                              onClick={() => setEditingAsset(asset)}
                              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-6 bg-slate-50/50 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-700">
                      Page {filters.page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFilterChange('page', (filters.page - 1).toString())}
                        disabled={filters.page === 1}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handleFilterChange('page', (filters.page + 1).toString())}
                        disabled={filters.page === totalPages}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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
    </div>
  );
}

