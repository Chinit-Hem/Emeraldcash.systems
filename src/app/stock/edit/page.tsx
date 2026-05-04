"use client";

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function StockEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modelKey = searchParams.get('modelKey') || '';

  const [form, setForm] = useState({
    modelKey: modelKey,
    location: 'Warehouse A',
    quantity: 0,
    minStock: 5,
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const locations = ['Warehouse A', 'Showroom', 'Parking Lot'];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelKey: form.modelKey,
          delta: form.quantity,
          reason: form.reason || `Adjustment ${form.quantity > 0 ? '+' : ''}${form.quantity}`,
          location: form.location,
          userId: 1
        })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/stock'), 1500);
      } else {
        // TODO: Add error toast
        console.error('API error:', await res.text());
      }
    } catch (e) {
      console.error('Adjust error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-6 lg:p-8 max-w-2xl mx-auto'>
      <button
        onClick={() => router.back()}
        className='inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-6 lg:mb-8'
      >
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
        </svg>
        Back to Stock
      </button>

      <div className='bg-white rounded-2xl shadow-xl p-8'>
        <h1 className='text-3xl font-bold text-slate-800 mb-2'>Adjust Stock</h1>
        <p className='text-slate-600 mb-8'>Edit inventory for <span className='font-mono font-semibold text-emerald-600'>{form.modelKey}</span></p>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='space-y-2'>
            <label className='block text-sm font-semibold uppercase tracking-wider text-slate-500'>Model Key</label>
            <input
              value={form.modelKey}
              onChange={(e) => setForm({...form, modelKey: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono text-sm uppercase"
              required
            />
          </div>

          <div className='grid md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <label className='block text-sm font-semibold uppercase tracking-wider text-slate-500'>Location</label>
              <select
                value={form.location}
                onChange={(e) => setForm({...form, location: e.target.value})}
                className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all'
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className='space-y-2'>
              <label className='block text-sm font-semibold uppercase tracking-wider text-slate-500'>Quantity Change</label>
              <input
                type='number'
                value={form.quantity}
                onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-lg"
                placeholder='+10 or -5'
                required
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='block text-sm font-semibold uppercase tracking-wider text-slate-500'>Minimum Stock Level</label>
            <input
              type='number'
              value={form.minStock}
              onChange={(e) => setForm({...form, minStock: parseInt(e.target.value) || 5})}
              className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all'
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <label className='block text-sm font-semibold uppercase tracking-wider text-slate-500'>Reason (Optional)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({...form, reason: e.target.value})}
              className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all h-24'
              placeholder='Adjustment reason for audit trail...'
              rows={3}
            />
          </div>

          <div className='flex gap-4 pt-4 border-t border-slate-200'>
            <button
              type='submit'
              disabled={loading || form.quantity === 0}
              className='flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed'
            >
              {loading ? (
                <>
                  <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
                  Adjusting...
                </>
              ) : (
                `Adjust Stock ${form.quantity > 0 ? '+' : ''}${form.quantity}`
              )}
            </button>
            <button
              type='button'
              onClick={() => router.back()}
              disabled={loading}
              className='flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-bold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-200'
            >
              Cancel
            </button>
          </div>

          {success && (
            <div className='mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium text-center animate-in fade-in-50 slide-in-from-top-2'>
              Stock adjusted successfully! Redirecting...
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

