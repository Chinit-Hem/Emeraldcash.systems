"use client";

import { Bell, CheckCheck, FileText, ShieldAlert, ArrowLeftRight, X } from "lucide-react";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { cn } from "@/shared/utils/ui";

export type AppNotification = {
  id: string;
  source: "sms" | "vms" | "loan" | "lms" | "hr";
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  href: string;
};

export type NotificationPriority = "urgent" | "action" | "info";
export type NotificationCategory = "report" | "loan" | "other";

export function notificationPriority(notification: AppNotification): NotificationPriority {
  const value = `${notification.type} ${notification.title}`.toLowerCase();
  if (value.includes("return") || value.includes("reject") || value.includes("overdue") || value.includes("exception")) return "urgent";
  if (value.includes("report") || value.includes("submit") || value.includes("approval") || value.includes("approve")) return "action";
  return "info";
}

export function notificationCategory(notification: AppNotification): NotificationCategory {
  if (`${notification.type} ${notification.title}`.toLowerCase().includes("report")) return "report";
  return notification.source === "loan" ? "loan" : "other";
}

export function notificationActionLabel(notification: AppNotification, language: string) {
  const isReport = notificationCategory(notification) === "report";
  const needsReview = /submit|review|return/.test(`${notification.type} ${notification.title}`.toLowerCase());
  if (language === "km") return isReport && needsReview ? "ពិនិត្យរបាយការណ៍" : isReport ? "បើករបាយការណ៍" : "បើក";
  return isReport && needsReview ? "Review report" : isReport ? "Open report" : "Open";
}

const notificationIcons: Record<string, typeof Bell> = {
  transfer_request: ArrowLeftRight,
  transfer_accepted: CheckCheck,
  transfer_rejected: ShieldAlert,
  return_request: ArrowLeftRight,
  return_approved: CheckCheck,
  return_rejected: ShieldAlert,
};

function relativeTime(value: string, language: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return language === "km" ? "ឥឡូវនេះ" : "Just now";
  if (minutes < 60) return language === "km" ? `${minutes} នាទីមុន` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return language === "km" ? `${hours} ម៉ោងមុន` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return language === "km" ? `${days} ថ្ងៃមុន` : `${days}d ago`;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  onClose,
  onMarkAllRead,
  onClear,
  onViewAll,
  onOpen,
}: {
  notifications: AppNotification[];
  unreadCount?: number;
  loading: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onClear: () => void;
  onViewAll: () => void;
  onOpen: (notification: AppNotification) => void;
}) {
  const { language } = useLanguage();
  const unreadTotal = unreadCount ?? notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="flex max-h-[70dvh] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <div><h3 className="font-semibold text-slate-800 dark:text-slate-100">{language === "km" ? "ការជូនដំណឹង" : "Notifications"}</h3>{unreadTotal ? <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">{unreadTotal} {language === "km" ? "មិនទាន់អាន" : "unread"}</p> : null}</div>
        <div className="flex items-center gap-1"><button type="button" onClick={onMarkAllRead} disabled={!unreadTotal} className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-300 dark:hover:bg-emerald-950/30">{language === "km" ? "អានទាំងអស់" : "Mark all read"}</button><button type="button" onClick={onClear} disabled={!notifications.length} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-950/30">{language === "km" ? "សម្អាត" : "Clear"}</button><button type="button" onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={language === "km" ? "បិទ" : "Close"}><X className="h-5 w-5" /></button></div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {loading ? <div className="p-8 text-center text-sm text-slate-500">{language === "km" ? "កំពុងផ្ទុក..." : "Loading notifications…"}</div> : null}
        {!loading && notifications.length ? notifications.map((notification) => {
          const Icon = notificationIcons[notification.type] ?? FileText;
          const unread = !notification.readAt;
          const priority = notificationPriority(notification);
          const priorityClass = priority === "urgent" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" : priority === "action" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" : "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300";
          const priorityLabel = priority === "urgent" ? (language === "km" ? "បន្ទាន់" : "Urgent") : priority === "action" ? (language === "km" ? "ត្រូវអនុវត្ត" : "Action") : (language === "km" ? "ព័ត៌មាន" : "Info");
          return <button type="button" key={`${notification.source}:${notification.id}`} onClick={() => onOpen(notification)} className={cn("flex w-full gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50", unread && "bg-emerald-50/50 dark:bg-emerald-500/10")}><span className="mt-1 text-slate-500"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{notification.title}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityClass}`}>{priorityLabel}</span></span><span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{notification.message}</span><span className="mt-2 flex items-center gap-2 text-xs text-slate-400"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">{notification.source}</span>{relativeTime(notification.createdAt, language)}<span className="ml-auto font-semibold text-emerald-700 dark:text-emerald-300">{notificationActionLabel(notification, language)} →</span></span></span>{unread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Unread" /> : null}</button>;
        }) : null}
        {!loading && !notifications.length ? <div className="p-8 text-center text-slate-500 dark:text-slate-400"><Bell className="mx-auto mb-2 h-10 w-10" /><p>{language === "km" ? "គ្មានការជូនដំណឹងថ្មី" : "No notifications yet"}</p></div> : null}
      </div>
      <footer className="border-t border-slate-200 p-2 dark:border-slate-700"><button type="button" onClick={onViewAll} className="h-9 w-full rounded-lg px-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30">{language === "km" ? "មើលទាំងអស់" : "View all"}</button></footer>
    </div>
  );
}
