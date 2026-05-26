"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SmsStats } from '@/systems/sms/types/sms-types';
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { translatePhrase, useTranslation } from "@/shared/utils/i18n";
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Package,
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

const actionToneStyles: Record<CardTone, { accent: string; iconBg: string; iconText: string; glow: string; ring: string; focus: string }> = {
  emerald: {
    accent: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/15',
    iconText: 'text-emerald-600 dark:text-emerald-300',
    glow: 'shadow-emerald-500/25',
    ring: 'ring-emerald-100 dark:ring-slate-700/80',
    focus: 'focus-visible:ring-emerald-500/40',
  },
  amber: {
    accent: 'bg-amber-400',
    iconBg: 'bg-amber-500/15 dark:bg-amber-500/15',
    iconText: 'text-amber-600 dark:text-amber-300',
    glow: 'shadow-amber-500/25',
    ring: 'ring-amber-100 dark:ring-slate-700/80',
    focus: 'focus-visible:ring-amber-500/40',
  },
  slate: {
    accent: 'bg-slate-400',
    iconBg: 'bg-slate-200/80 dark:bg-slate-700/70',
    iconText: 'text-slate-600 dark:text-slate-300',
    glow: 'shadow-slate-500/20',
    ring: 'ring-slate-200 dark:ring-slate-700/80',
    focus: 'focus-visible:ring-slate-500/40',
  },
  blue: {
    accent: 'bg-blue-500',
    iconBg: 'bg-blue-500/15 dark:bg-blue-500/15',
    iconText: 'text-blue-600 dark:text-blue-300',
    glow: 'shadow-blue-500/25',
    ring: 'ring-blue-100 dark:ring-slate-700/80',
    focus: 'focus-visible:ring-blue-500/40',
  },
  purple: {
    accent: 'bg-purple-500',
    iconBg: 'bg-purple-500/15 dark:bg-purple-500/15',
    iconText: 'text-purple-600 dark:text-purple-300',
    glow: 'shadow-purple-500/25',
    ring: 'ring-purple-100 dark:ring-slate-700/80',
    focus: 'focus-visible:ring-purple-500/40',
  },
  red: {
    accent: 'bg-red-500',
    iconBg: 'bg-red-500/15 dark:bg-red-500/15',
    iconText: 'text-red-600 dark:text-red-300',
    glow: 'shadow-red-500/25',
    ring: 'ring-red-100 dark:ring-slate-700/80',
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
  progress?: number;
  icon: LucideIcon;
  tone: CardTone;
}

function ActionCard({ href, title, description, value, progress = 100, icon: Icon, tone }: ActionCardProps) {
  const styles = actionToneStyles[tone];
  const progressWidth = Math.max(5, Math.min(100, progress));

  return (
    <Link
      href={href}
      className={`group relative flex min-h-[176px] flex-col justify-between overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm ring-1 ${styles.ring} transition-all duration-300 hover:-translate-y-1 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 dark:from-slate-900 dark:to-slate-800 dark:hover:from-slate-900 dark:hover:to-slate-800 ${styles.focus}`}
    >
      <div className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full ${styles.accent} opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-15`} />

      <div className="relative flex items-start justify-between gap-4">
        <span className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${styles.iconBg} ${styles.iconText} shadow-lg ${styles.glow} transition-transform duration-300 group-hover:scale-105`}>
          <Icon className="h-7 w-7" strokeWidth={2.1} />
        </span>

        <div className="min-w-0 text-right">
          {value !== undefined ? (
            <div className="truncate text-4xl font-bold leading-none tracking-tight text-slate-900 tabular-nums dark:text-slate-100 sm:text-[2.75rem]">
              {value.toLocaleString()}
            </div>
          ) : (
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${styles.iconBg} ${styles.iconText} transition-transform duration-300 group-hover:translate-x-1`}>
              <ArrowRight className="h-5 w-5" />
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-8">
        <h3 className="break-words text-xl font-bold leading-6 text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-3 min-w-0 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-950/40">
          <div
            className={`h-full rounded-full ${styles.accent} transition-all duration-500 group-hover:w-full`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
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
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-shadow duration-200 hover:shadow-md dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">{label}</p>
          <div className={`mt-3 text-3xl font-semibold leading-none ${styles.text}`}>
            {value.toLocaleString()}
          </div>
        </div>
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${styles.iconBg} ${styles.text}`}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
      </div>
      <div className={`mt-5 inline-flex min-h-7 items-center rounded-lg px-2.5 py-1 text-sm font-semibold ${styles.helperBg} ${styles.text}`}>
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
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false);
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
      progress: 100,
      description: t.manageInventory,
      icon: Package,
      tone: 'emerald',
    },
    {
      href: '/sms/transfer',
      title: t.transfers,
      description: t.sendReceive,
      progress: 62,
      icon: ArrowLeftRight,
      tone: 'amber',
    },
    {
      href: '/sms/pending',
      title: t.pending,
      value: pending,
      progress: pending > 0 ? Math.max(8, calculatePercentage(pending, Math.max(totalAssets, pending))) : 5,
      description: t.reviewRequests,
      icon: Clock,
      tone: 'slate',
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
    setNotificationError(null);
    setMarkingNotificationsRead(true);

    try {
      const response = await fetch('/api/sms/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to mark notifications as read');
      }

      setUnreadCount(0);
      setNotifications([]);
    } catch (err) {
      setNotificationError(err instanceof Error ? err.message : 'Failed to mark notifications as read');
    } finally {
      setMarkingNotificationsRead(false);
    }
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
            <div className='inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'>
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

        <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {actionCards.map((card) => (
            <ActionCard key={card.href} {...card} />
          ))}
        </div>

        {notifications.length > 0 && (
          <div className='mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'>
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
                onClick={() => void markNotificationsRead()}
                disabled={markingNotificationsRead}
                className='inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
              >
                <CheckCheck className='h-4 w-4' />
                {markingNotificationsRead ? tr('Marking...') : tr('Mark read')}
              </button>
            </div>
            {notificationError && (
              <p className='mb-4 text-sm font-medium text-red-600 dark:text-red-400'>{translatePhrase(notificationError, language)}</p>
            )}
            <div className='grid gap-3 md:grid-cols-3'>
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationHref(notification)}
                  className={`rounded-xl p-4 shadow-sm ring-1 transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
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
