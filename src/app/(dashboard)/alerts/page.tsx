"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, Check, CheckCheck, Filter, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { notificationActionLabel, notificationCategory, notificationPriority, type AppNotification } from "@/shared/components/NotificationPanel";
import { useLanguage } from "@/shared/hooks/LanguageContext";

type NotificationFilter = "all" | "unread" | "report" | "loan" | "other";

export default function AlertsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications?limit=100", { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null) as { success?: boolean; data?: { notifications?: AppNotification[] }; error?: string } | null;
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Could not load notifications");
      setNotifications(payload.data?.notifications ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (notification?: AppNotification) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notification ? { notifications: [{ source: notification.source, id: notification.id }] } : {}),
    });
    if (response.ok) {
      if (notification) setNotifications((items) => items.map((item) => item.source === notification.source && item.id === notification.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
      else await load();
    }
  };

  const filteredNotifications = useMemo(() => notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !notification.readAt;
    return notificationCategory(notification) === filter;
  }), [filter, notifications]);
  const filterOptions: Array<{ value: NotificationFilter; label: string }> = [
    { value: "all", label: language === "km" ? "ទាំងអស់" : "All" },
    { value: "unread", label: language === "km" ? "មិនទាន់អាន" : "Unread" },
    { value: "report", label: language === "km" ? "របាយការណ៍" : "Reports" },
    { value: "loan", label: language === "km" ? "កម្ចី" : "Loans" },
    { value: "other", label: language === "km" ? "ផ្សេងៗ" : "Other" },
  ];

  return <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6"><div className="mx-auto max-w-[1200px]">
    <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{language === "km" ? "មជ្ឈមណ្ឌលសកម្មភាព" : "Activity centre"}</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{language === "km" ? "ការជូនដំណឹង" : "Notifications"}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{language === "km" ? "ការជូនដំណឹងដែលអ្នកអាចចូលប្រើ និងអនុវត្តបាន។" : "Actionable notifications available to your role."}</p></div><button type="button" onClick={() => void markRead()} disabled={!notifications.some((notification) => !notification.readAt)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCheck className="h-4 w-4" />{language === "km" ? "អានទាំងអស់" : "Mark all read"}</button></header>
    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><Filter className="h-4 w-4" />{language === "km" ? "ចម្រោះ" : "Filter"}</span>{filterOptions.map((option) => <button key={option.value} type="button" onClick={() => setFilter(option.value)} className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${filter === option.value ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>{option.label}</button>)}</div>
    <section className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {loading ? <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</div> : null}
      {error ? <p className="p-6 text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      {!loading && !error && filteredNotifications.map((notification) => {
        const priority = notificationPriority(notification);
        const priorityClass = priority === "urgent" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" : priority === "action" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" : "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300";
        const priorityLabel = priority === "urgent" ? (language === "km" ? "បន្ទាន់" : "Urgent") : priority === "action" ? (language === "km" ? "ត្រូវអនុវត្ត" : "Action") : (language === "km" ? "ព័ត៌មាន" : "Info");
        return <article key={`${notification.source}:${notification.id}`} className={`flex gap-4 border-b border-slate-100 p-5 last:border-b-0 dark:border-slate-800 ${!notification.readAt ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}><span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${priorityClass}`}><Bell className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900 dark:text-white">{notification.title}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass}`}>{priorityLabel}</span>{!notification.readAt ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{language === "km" ? "ថ្មី" : "New"}</span> : null}</div><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{notification.message}</p><p className="mt-2 text-xs text-slate-400"><span className="mr-2 font-semibold uppercase">{notification.source}</span>{new Date(notification.createdAt).toLocaleString()}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => { if (!notification.readAt) void markRead(notification); router.push(notification.href); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{notificationActionLabel(notification, language)}<ArrowRight className="h-4 w-4" /></button>{!notification.readAt ? <button type="button" onClick={() => void markRead(notification)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Check className="h-4 w-4" />{language === "km" ? "សម្គាល់ថាបានអាន" : "Mark read"}</button> : null}</div></div></article>;
      })}
      {!loading && !error && !filteredNotifications.length ? <div className="p-12 text-center text-slate-500 dark:text-slate-400"><Bell className="mx-auto mb-3 h-10 w-10" /><p>{language === "km" ? "គ្មានការជូនដំណឹងតាមចម្រោះនេះ" : "No notifications in this filter."}</p></div> : null}
    </section>
  </div></div>;
}
