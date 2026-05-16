"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SmsStats } from '@/lib/sms-types';
import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { Bell, CheckCheck } from 'lucide-react';

interface StatsData extends SmsStats {
  totalTodayChange: number;
}

interface SmsNotification {
  id: number;
  title: string;
  message: string;
  transferId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export default function SmsDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<SmsNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const [response, notificationResponse] = await Promise.all([
        fetch('/api/sms/stats', { signal }),
        fetch('/api/sms/notifications?limit=3', { signal }),
      ]);
      const data = await response.json();
      const notificationData = await notificationResponse.json().catch(() => ({}));
      
      if (data.success) {
        setStats({
          ...data.data,
          totalTodayChange: 2
        });
        setUnreadCount(data.data?.unreadNotifications || 0);
        if (notificationData.success) {
          setNotifications(notificationData.data?.notifications || []);
          setUnreadCount(notificationData.data?.unreadCount || data.data?.unreadNotifications || 0);
        }
      } else {
        setError(data.error || 'Failed to load stats');
      }
    } catch (_err) {
      if (signal?.aborted) return;
      setError('Failed to fetch stats');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchStats(controller.signal);
    return () => controller.abort();
  }, [fetchStats]);

  const calculatePercentage = (part: number, total: number) => {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  };

  if (error) {
    return (
      <div className='p-6'>
        <div className='bg-amber-100 border border-amber-200 rounded-3xl p-8 text-center'>
          <h1 className='text-3xl font-bold mb-4'>SMS - {t.sms}</h1>
          <p className='text-amber-800 mb-4'>{error}</p>
          <button 
            onClick={() => void fetchStats()}
            className='bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all'
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  const totalAssets = stats?.totalAssets || 0;
  const available = stats?.available || 0;
  const inUse = stats?.inUse || 0;
  const borrowed = stats?.borrowed || 0;
  const pending = stats?.pendingTransfers || 0;
  const markNotificationsRead = async () => {
    await fetch('/api/sms/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setUnreadCount(0);
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  };

  return (
    <div className='p-6'>

      {loading && (
        <div className='mb-4 h-1 overflow-hidden rounded-full bg-slate-100'>
          <div className='h-full w-1/3 animate-pulse rounded-full bg-emerald-500' />
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <Link href='/sms/assets' className='group p-8 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-200/50 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 block relative overflow-hidden'>
          <div className='absolute top-4 right-4 w-20 h-20 bg-emerald-500 rounded-2xl -rotate-12 opacity-20'></div>
          <div className='relative z-10'>
            <h3 className='text-2xl font-bold mb-3 bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent'>{t.assets}</h3>
            <div className='text-emerald-700 font-semibold text-lg mb-1'>{totalAssets}</div>
            <p className='text-slate-600'>{t.manageInventory}</p>
          </div>
        </Link>
        <Link href='/sms/transfer' className='group p-8 bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-200/50 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 block relative overflow-hidden'>
          <div className='absolute top-4 right-4 w-20 h-20 bg-amber-500 rounded-2xl opacity-20'></div>
          <div className='relative z-10'>
            <h3 className='text-2xl font-bold mb-3 bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent'>{t.transfers}</h3>
            <p className='text-slate-600'>{t.sendReceive}</p>
          </div>
        </Link>
        <Link href='/sms/pending' className='group p-8 bg-gradient-to-br from-slate-500/10 to-slate-600/10 border border-slate-200/50 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 block relative overflow-hidden'>
          <div className='absolute top-4 right-4 w-20 h-20 bg-slate-500 rounded-2xl opacity-20'></div>
          <div className='relative z-10'>
            <h3 className='text-2xl font-bold mb-3 bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent'>{t.pending}</h3>
            <div className='text-amber-600 font-semibold text-lg mb-1'>{pending}</div>
            <p className='text-slate-600'>{t.reviewRequests}</p>
          </div>
        </Link>
        <Link href='/sms/history' className='group p-8 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-200/50 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 block relative overflow-hidden md:col-span-2 lg:col-span-1'>
          <div className='absolute top-4 right-4 w-20 h-20 bg-purple-500 rounded-2xl opacity-20'></div>
          <div className='relative z-10'>
            <h3 className='text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent'>{t.history}</h3>
            <p className='text-slate-600'>{t.auditTrail}</p>
          </div>
        </Link>
      </div>

      {notifications.length > 0 && (
        <div className='mb-8 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl backdrop-blur-xl'>
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600'>
                <Bell className='h-5 w-5' />
              </div>
              <div>
                <h2 className='font-bold text-slate-900'>Transfer Inbox</h2>
                <p className='text-sm text-slate-500'>{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</p>
              </div>
            </div>
            <button
              type='button'
              onClick={markNotificationsRead}
              className='inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
            >
              <CheckCheck className='h-4 w-4' />
              Mark read
            </button>
          </div>
          <div className='grid gap-3 md:grid-cols-3'>
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href='/sms/pending'
                className={`rounded-2xl border p-4 transition hover:bg-slate-50 ${
                  notification.readAt ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/70'
                }`}
              >
                <div className='mb-1 text-sm font-bold text-slate-900'>{notification.title}</div>
                <p className='line-clamp-2 text-sm text-slate-600'>{notification.message}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6'>
        <div className='p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl text-center group hover:-translate-y-1 transition-all duration-300'>
          <div className='text-4xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent mb-2'>{totalAssets}</div>
          <div className='text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1'>{t.totalAssets}</div>
          <div className='text-emerald-600 font-bold text-sm'>
            +{stats?.totalTodayChange || 0} {t.today}
          </div>
        </div>
        <div className='p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl text-center group hover:-translate-y-1 transition-all duration-300'>
          <div className='text-4xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent mb-2'>{available}</div>
          <div className='text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1'>{t.available}</div>
          <div className='text-emerald-600 font-bold text-sm'>{calculatePercentage(available, totalAssets)}%</div>
        </div>
        <div className='p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl text-center group hover:-translate-y-1 transition-all duration-300'>
          <div className='text-4xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent mb-2'>{inUse}</div>
          <div className='text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1'>{t.inUse}</div>
          <div className='text-amber-600 font-bold text-sm'>{calculatePercentage(inUse, totalAssets)}%</div>
        </div>
        <div className='p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl text-center group hover:-translate-y-1 transition-all duration-300'>
          <div className='text-4xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent mb-2'>{borrowed}</div>
          <div className='text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1'>{t.borrowed}</div>
          <div className='text-red-600 font-bold text-sm'>{calculatePercentage(borrowed, totalAssets)}%</div>
        </div>
      </div>
    </div>
  );
}
