"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SmsStats } from '@/lib/sms-types';
import { useLanguage } from "@/lib/LanguageContext";
import { translatePhrase, useTranslation } from "@/lib/i18n";
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  History,
  Package,
  RotateCcw,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface SmsNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  assetId?: string | null;
  transferId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

type CardTone = 'emerald' | 'amber' | 'slate' | 'blue' | 'purple' | 'red';

const actionToneStyles: Record<CardTone, { text: string; iconBg: string; arrowBg: string; ring: string; focus: string }> = {
  emerald: {
    text: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    arrowBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    ring: 'ring-emerald-100 dark:ring-emerald-500/20',
    focus: 'focus-visible:ring-emerald-500/40',
  },
  amber: {
    text: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-50 dark:bg-amber-500/15',
    arrowBg: 'bg-amber-50 dark:bg-amber-500/15',
    ring: 'ring-amber-100 dark:ring-amber-500/20',
    focus: 'focus-visible:ring-amber-500/40',
  },
  slate: {
    text: 'text-slate-700 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    arrowBg: 'bg-slate-100 dark:bg-slate-800',
    ring: 'ring-slate-200 dark:ring-slate-700',
    focus: 'focus-visible:ring-slate-500/40',
  },
  blue: {
    text: 'text-blue-700 dark:text-blue-300',
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    arrowBg: 'bg-blue-50 dark:bg-blue-500/15',
    ring: 'ring-blue-100 dark:ring-blue-500/20',
    focus: 'focus-visible:ring-blue-500/40',
  },
  purple: {
    text: 'text-purple-700 dark:text-purple-300',
    iconBg: 'bg-purple-50 dark:bg-purple-500/15',
    arrowBg: 'bg-purple-50 dark:bg-purple-500/15',
    ring: 'ring-purple-100 dark:ring-purple-500/20',
    focus: 'focus-visible:ring-purple-500/40',
  },
  red: {
    text: 'text-red-700 dark:text-red-300',
    iconBg: 'bg-red-50 dark:bg-red-500/15',
    arrowBg: 'bg-red-50 dark:bg-red-500/15',
    ring: 'ring-red-100 dark:ring-red-500/20',
    focus: 'focus-visible:ring-red-500/40',
  },
};

const metricToneStyles: Record<CardTone, { text: string; iconBg: string; helperBg: string }> = {
  emerald: {
    text: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    helperBg: 'bg-emerald-50 dark:bg-emerald-500/15',
  },
  amber: {
    text: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-50 dark:bg-amber-500/15',
    helperBg: 'bg-amber-50 dark:bg-amber-500/15',
  },
  slate: {
    text: 'text-slate-700 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    helperBg: 'bg-slate-100 dark:bg-slate-800',
  },
  blue: {
    text: 'text-blue-700 dark:text-blue-300',
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    helperBg: 'bg-blue-50 dark:bg-blue-500/15',
  },
  purple: {
    text: 'text-purple-700 dark:text-purple-300',
    iconBg: 'bg-purple-50 dark:bg-purple-500/15',
    helperBg: 'bg-purple-50 dark:bg-purple-500/15',
  },
  red: {
    text: 'text-red-700 dark:text-red-300',
    iconBg: 'bg-red-50 dark:bg-red-500/15',
    helperBg: 'bg-red-50 dark:bg-red-500/15',
  },
};

interface ActionCardProps {
  href: string;
  title: string;
  description: string;
  value?: number;
  icon: LucideIcon;
  tone: CardTone;
}

function ActionCard({ href, title, description, value, icon: Icon, tone }: ActionCardProps) {
  const styles = actionToneStyles[tone];

  return (
    <Link
      href={href}
      className={`group flex min-h-[156px] flex-col justify-between rounded-lg bg-white p-5 shadow-sm ring-1 ${styles.ring} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 dark:bg-slate-900 ${styles.focus}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className={`break-words text-lg font-semibold leading-6 ${styles.text}`}>{title}</h3>
          {value !== undefined && (
            <div className={`mt-3 text-2xl font-semibold leading-none ${styles.text}`}>
              {value.toLocaleString()}
            </div>
          )}
        </div>
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md ${styles.iconBg} ${styles.text}`}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="min-w-0 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${styles.arrowBg} ${styles.text} transition-transform duration-200 group-hover:translate-x-0.5`}>
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone: CardTone;
}

function MetricCard({ label, value, helper, icon: Icon, tone }: MetricCardProps) {
  const styles = metricToneStyles[tone];

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-shadow duration-200 hover:shadow-md dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">{label}</p>
          <div className={`mt-3 text-3xl font-semibold leading-none ${styles.text}`}>
            {value.toLocaleString()}
          </div>
        </div>
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md ${styles.iconBg} ${styles.text}`}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
      </div>
      <div className={`mt-5 inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-sm font-semibold ${styles.helperBg} ${styles.text}`}>
        {helper}
      </div>
    </div>
  );
}

function getNotificationHref(notification: SmsNotification): string {
  if (notification.type === 'transfer_request' || notification.type === 'return_request') {
    return '/sms/pending';
  }

  if (notification.assetId) {
    return `/sms/assets/${notification.assetId}`;
  }

  return '/sms/history';
}

export default function SmsDashboard() {
  const [stats, setStats] = useState<SmsStats | null>(null);
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
        fetch('/api/sms/notifications?unreadOnly=true&limit=3', { signal }),
      ]);
      const data = await response.json();
      const notificationData = await notificationResponse.json().catch(() => ({}));
      
      if (data.success) {
        setStats(data.data ?? null);
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
      <div className='min-h-screen bg-slate-50 px-4 py-6 sm:p-6 lg:p-8 dark:bg-slate-950'>
        <div className='mx-auto max-w-7xl rounded-lg bg-white p-6 shadow-sm ring-1 ring-amber-200 dark:bg-slate-900 dark:ring-amber-500/30'>
          <div className='mx-auto flex max-w-md flex-col items-center text-center'>
            <span className='mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'>
              <AlertCircle className='h-5 w-5' />
            </span>
            <h1 className='mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100'>SMS - {t.sms}</h1>
            <p className='mb-5 text-sm text-amber-800 dark:text-amber-200'>{error}</p>
            <button
              onClick={() => void fetchStats()}
              className='rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40'
            >
              {t.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAssets = stats?.totalAssets || 0;
  const available = stats?.available || 0;
  const inUse = stats?.inUse || 0;
  const borrowed = stats?.borrowed || 0;
  const pending = stats?.pendingTransfers || 0;
  const todayChange = stats?.todayChange || 0;
  const formatPercentage = (value: number) => `${value}%`;
  const tr = (value: string) => translatePhrase(value, language);
  const actionCards: ActionCardProps[] = [
    {
      href: '/sms/assets',
      title: t.assets,
      value: totalAssets,
      description: t.manageInventory,
      icon: Package,
      tone: 'emerald',
    },
    {
      href: '/sms/transfer',
      title: t.transfers,
      description: t.sendReceive,
      icon: ArrowLeftRight,
      tone: 'amber',
    },
    {
      href: '/sms/pending',
      title: t.pending,
      value: pending,
      description: t.reviewRequests,
      icon: Clock,
      tone: 'slate',
    },
    {
      href: '/sms/return',
      title: tr('Return to Stock'),
      description: tr('Upload photo and note'),
      icon: RotateCcw,
      tone: 'blue',
    },
    {
      href: '/sms/history',
      title: t.history,
      description: t.auditTrail,
      icon: History,
      tone: 'purple',
    },
  ];

  const metricCards: MetricCardProps[] = [
    {
      label: t.totalAssets,
      value: totalAssets,
      helper: `${todayChange > 0 ? '+' : ''}${todayChange.toLocaleString()} ${t.today}`,
      icon: TrendingUp,
      tone: 'emerald',
    },
    {
      label: t.available,
      value: available,
      helper: formatPercentage(calculatePercentage(available, totalAssets)),
      icon: CheckCircle2,
      tone: 'emerald',
    },
    {
      label: t.inUse,
      value: inUse,
      helper: formatPercentage(calculatePercentage(inUse, totalAssets)),
      icon: Activity,
      tone: 'amber',
    },
    {
      label: t.borrowed,
      value: borrowed,
      helper: formatPercentage(calculatePercentage(borrowed, totalAssets)),
      icon: Users,
      tone: 'red',
    },
  ];

  const markNotificationsRead = async () => {
    await fetch('/api/sms/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setUnreadCount(0);
    setNotifications([]);
  };

  return (
    <div className='min-h-screen bg-slate-50 px-4 py-5 sm:p-6 lg:p-8 dark:bg-slate-950'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-emerald-700'>SMS</p>
            <h1 className='mt-1 text-2xl font-semibold leading-tight text-slate-950 dark:text-slate-100'>{t.sms}</h1>
            <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400'>{t.manageInventory}</p>
          </div>

          <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center'>
            <div className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'>
              <Bell className='h-4 w-4 text-blue-600' />
              <span>{translatePhrase(`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`, language)}</span>
            </div>
          </div>
        </div>

        {loading && (
          <div className='mb-4 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800'>
            <div className='h-full w-1/3 animate-pulse rounded-full bg-emerald-500' />
          </div>
        )}

        <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'>
          {actionCards.map((card) => (
            <ActionCard key={card.href} {...card} />
          ))}
        </div>

        {notifications.length > 0 && (
          <div className='mb-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'>
                  <Bell className='h-5 w-5' />
                </div>
                <div>
                  <h2 className='font-semibold text-slate-900 dark:text-slate-100'>{tr('Transfer Inbox')}</h2>
                  <p className='text-sm text-slate-500 dark:text-slate-400'>
                    {translatePhrase(`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`, language)}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={markNotificationsRead}
                className='inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
              >
                <CheckCheck className='h-4 w-4' />
                {tr('Mark read')}
              </button>
            </div>
            <div className='grid gap-3 md:grid-cols-3'>
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationHref(notification)}
                  className={`rounded-lg p-4 shadow-sm ring-1 transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    notification.readAt ? 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-700' : 'bg-blue-50 ring-blue-100 dark:bg-blue-500/15 dark:ring-blue-500/20'
                  }`}
                >
                  <div className='mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100'>{notification.title}</div>
                  <p className='line-clamp-2 text-sm text-slate-600 dark:text-slate-400'>{notification.message}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {metricCards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
}
