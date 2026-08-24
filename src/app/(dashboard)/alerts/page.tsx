"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { useLanguage } from "@/shared/hooks/LanguageContext";
import type { AppNotification } from "@/shared/components/NotificationPanel";

export default function AlertsPage() {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const markAllRead = async () => {
    const response = await fetch("/api/notifications", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (response.ok) await load();
  };

  return <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6"><div className="mx-auto max-w-[1200px]"><div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{language === "km" ? "មជ្ឈមណ្ឌលសកម្មភាព" : "Activity centre"}</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{language === "km" ? "ការជូនដំណឹង" : "Notifications"}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{language === "km" ? "ការជូនដំណឹងពិតប្រាកដពីប្រព័ន្ធ" : "Real notifications from all accessible systems."}</p></div><button type="button" onClick={() => void markAllRead()} disabled={!notifications.some((notification) => !notification.readAt)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCheck className="h-4 w-4" />{language === "km" ? "អានទាំងអស់" : "Mark all read"}</button></div><div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">{loading ? <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</div> : null}{error ? <p className="p-6 text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}{!loading && !error && notifications.length ? notifications.map((notification) => <div key={`${notification.source}:${notification.id}`} className={`flex gap-4 border-b border-slate-100 p-5 last:border-b-0 dark:border-slate-800 ${!notification.readAt ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Bell className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 dark:text-white">{notification.title}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{notification.message}</p><p className="mt-2 text-xs text-slate-400"><span className="mr-2 font-semibold uppercase">{notification.source}</span>{new Date(notification.createdAt).toLocaleString()}</p></div>{!notification.readAt ? <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" /> : null}</div>) : null}{!loading && !error && !notifications.length ? <div className="p-12 text-center text-slate-500 dark:text-slate-400"><Bell className="mx-auto mb-3 h-10 w-10" /><p>{language === "km" ? "គ្មានការជូនដំណឹង" : "No notifications yet"}</p></div> : null}</div></div></div>;
}
