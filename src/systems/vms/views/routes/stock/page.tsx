 "use client";

import { useEffect, useState } from 'react';
import { GlassCard } from '@/shared/components/ui/glass/GlassCard';
import { Alert } from '@/shared/components/ui';
import { GlassInput } from '@/shared/components/ui/glass/GlassInput';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

type StockStats = {
  total_items: number;
  total_quantity: number;
  low_stock_items: number;
};

type StockItem = {
  model_key: string;
  brand?: string;
  model?: string;
  year?: number | string;
  location?: string;
  available?: number;
  quantity?: number;
  reserved?: number;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function StockPage() {
  const [stockStats, setStockStats] = useState<StockStats>({ total_items: 0, total_quantity: 0, low_stock_items: 0 });
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [form, setForm] = useState({ modelKey: '', location: 'Warehouse A', quantity: 0, minStock: 5 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const locations = ['Warehouse A', 'Showroom', 'Parking Lot'];

  const fetchStock = async () => {
    try {
      setError('');
      const res = await fetch('/api/stock');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setStockStats(data.stats || {});
        setStockItems(data.data || []);
      } else {
        setError(data.error || 'Unknown API error');
      }
    } catch (e: unknown) {
      console.error('Fetch stock error:', e);
      setError(getErrorMessage(e, 'Failed to load stock data'));
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

const handleAdjust = async (modelKey: string, delta: number) => {
    setLoading(true);
    try {
      setError('');
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust', modelKey, quantity: delta, reason: `Quick adjust ${delta > 0 ? '+' : ''}${delta}`, location: 'Warehouse A', userId: 1 })
      });
      if (!res.ok) throw new Error('Adjustment API failed');
      fetchStock();
    } catch (e: unknown) {
      console.error('Adjust error:', e);
      setError(getErrorMessage(e, 'Quick adjust failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (modelKey: string) => {
    setLoading(true);
    try {
      setError('');
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return', modelKey, quantity: 1, reason: 'Returned to inventory', location: 'Warehouse A', userId: 1 })
      });
      if (!res.ok) throw new Error('Return API failed');
      fetchStock();
    } catch (e: unknown) {
      console.error('Return error:', e);
      setError(getErrorMessage(e, 'Return failed'));
    } finally {
      setLoading(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.modelKey || form.quantity === 0) {
      setError('Please enter model key and quantity');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust', modelKey: form.modelKey, quantity: form.quantity, reason: 'Manual adjustment', location: form.location, userId: 1 })
      });
      if (!res.ok) throw new Error('Adjustment failed');
      fetchStock();
      setForm({ modelKey: '', location: 'Warehouse A', quantity: 0, minStock: 5 });
    } catch (e: unknown) {
      console.error('Submit error:', e);
      setError(getErrorMessage(e, 'Manual adjustment failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
<div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex-1">Stock Management</h1>
        <Link href="/stock/edit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md whitespace-nowrap">
          + New Adjustment
        </Link>
        <Link href="/stock/edit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md whitespace-nowrap">
          Return Stock
        </Link>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <div>{error}</div>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
<GlassCard className="p-6 text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-1">{stockStats.total_items}</div>
            <div className="text-sm text-slate-500 uppercase tracking-wide">Total Items</div>
          </GlassCard>
<GlassCard className="p-6 text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-1">{stockStats.total_quantity}</div>
            <div className="text-sm text-slate-500 uppercase tracking-wide">Total Quantity</div>
          </GlassCard>
<GlassCard className="bg-amber-50 border-amber-200 p-6 text-center">
            <div className="text-3xl font-bold text-amber-600 mb-1">{stockStats.low_stock_items}</div>
            <div className="text-sm text-amber-700 uppercase tracking-wide font-medium">Low Stock Alerts</div>
          </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Adjustment Form */}
<GlassCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">Adjust Stock</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <GlassInput
                  placeholder="Model Key (e.g., toyota_camry_2023_new_white)"
                  value={form.modelKey}
                  onChange={(e) => setForm({...form, modelKey: e.target.value})}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Location</label>
                  <select
                    value={form.location}
                    onChange={(e) => setForm({...form, location: e.target.value})}
                    title="Stock location"
                    aria-label="Stock location"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <GlassInput
                  type="number"
                  placeholder="Quantity (+ to add, - to remove)"
                  value={form.quantity}
                  onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || 0})}
                />
                <GlassInput
                  type="number"
                  placeholder="Min Stock Level (optional)"
                  value={form.minStock}
                  onChange={(e) => setForm({...form, minStock: parseInt(e.target.value) || 5})}
                />
                <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded-lg font-medium shadow-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Adjusting...' : 'Adjust Stock'}
                </button>
              </form>
            </div>
          </GlassCard>

        {/* Current Stock */}
<GlassCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">Current Stock ({stockItems.length} items)</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stockItems.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">No stock items found. Use the form to create/adjust.</p>
                ) : (
                  stockItems.map((item) => (
                    <div key={item.model_key} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate" title={item.model_key}>{item.brand} {item.model} ({item.year})</div>
                        <div className="text-sm text-slate-500">{item.location} • Available: {item.available || item.quantity} • Reserved: {item.reserved || 0}</div>
                      </div>
<div className="flex gap-2 ml-4 flex-shrink-0">
                        <button onClick={() => handleAdjust(item.model_key, 1)} className="px-3 py-1 text-sm border bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium shadow-sm transition-all" disabled={loading}>
                          +1
                        </button>
                        <button onClick={() => handleAdjust(item.model_key, -1)} className="px-3 py-1 text-sm border bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium shadow-sm transition-all" disabled={loading}>
                          -1
                        </button>
                        <button onClick={() => handleReturn(item.model_key)} className="px-3 py-1 text-sm border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium shadow-sm transition-all" disabled={loading} title="Return stock">
                          Return
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlassCard>
      </div>
    </div>
  );
}

