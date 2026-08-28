"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { useOptionalAuthUser } from "@/shared/hooks/AuthContext";
import { hasAppPermission } from "@/shared/utils/permissions";
import { cn } from "@/shared/utils/ui";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Car,
  CheckCircle2,
  CircleAlert,
  Database,
  GraduationCap,
  HandCoins,
  Loader2,
  Plus,
  type LucideIcon,
  UserRound,
  Users,
} from "lucide-react";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
};

type UsersResponse = {
  ok: boolean;
  users?: Array<{ username: string; role: string }>;
};

type VmsStats = {
  total?: number;
  noImageCount?: number;
  countsByCondition?: {
    New?: number;
    Used?: number;
  };
};

type LmsStats = {
  total_staff?: number;
  total_lessons?: number;
  overall_completion_rate?: number;
};

type SmsStats = {
  totalAssets?: number;
  pendingTransfers?: number;
  unreadNotifications?: number;
};

type LoanDashboardStats = {
  stats?: {
    activeLoans?: number;
    pendingApprovals?: number;
  };
};

type HealthStatus = "connected" | "disconnected" | "error" | "hit" | "miss";

type HealthStats = {
  database: { status: HealthStatus };
  cache: { status: HealthStatus };
  cloudinary: { status: HealthStatus };
};

type NotificationsData = {
  notifications?: Array<{
    id: string;
    source: "sms" | "vms" | "loan" | "lms" | "hr";
    title: string;
    message: string;
    type: string;
    readAt: string | null;
    createdAt: string;
    href: string;
  }>;
  unreadCount?: number;
};

type SystemKey = "vms" | "lms" | "sms" | "loan" | "hr";
type MetricValue = number | string | undefined;

type SystemCardDefinition = {
  key: SystemKey;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  visible: boolean;
  theme: {
    icon: string;
    title: string;
    button: string;
    card: string;
  };
};

type SystemMetric = {
  value: MetricValue;
  label: string;
};

function formatMetric(value: MetricValue | undefined) {
  if (value === undefined || value === null || value === "") return "—";
  return typeof value === "number" ? value.toLocaleString() : value;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconClass,
  cardClass,
  change,
  helper,
  negative = false,
}: {
  label: string;
  value: MetricValue;
  icon: LucideIcon;
  iconClass: string;
  cardClass: string;
  change?: string;
  helper: string;
  negative?: boolean;
}) {
  return (
    <article className={cn(
      "rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 dark:ring-slate-800",
      cardClass,
    )}>
      <div className="flex items-start gap-3">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1", iconClass)}>
          <Icon className="h-7 w-7" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formatMetric(value)}</p>
        </div>
      </div>
      <div className={cn("mt-5 flex items-center gap-2 text-xs font-semibold", negative ? "text-red-500" : "text-emerald-600 dark:text-emerald-400")}>
        {change ? (negative ? <ArrowDownRight className="h-4 w-4" aria-hidden="true" /> : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />) : null}
        {change ? <span>{change}</span> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        <span className="font-medium text-slate-400 dark:text-slate-500">{helper}</span>
      </div>
    </article>
  );
}

function SystemModuleCard({
  system,
  metrics,
}: {
  system: SystemCardDefinition;
  metrics: SystemMetric[];
}) {
  const Icon = system.icon;

  return (
    <Link
      href={system.href}
      prefetch
      className={cn(
        "group flex min-h-[320px] flex-col rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 dark:ring-slate-800",
        system.theme.card,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-105", system.theme.icon)}>
          <Icon className="h-8 w-8" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className={cn("text-xl font-bold", system.theme.title)}>{system.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{system.description}</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{formatMetric(metric.value)}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
          </div>
        ))}
      </div>

      <span className={cn("mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity group-hover:opacity-90", system.theme.button)}>
        Open {system.title}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function healthStatusLabel(status?: HealthStatus) {
  if (!status) return "Unavailable";
  if (status === "connected" || status === "hit") return "Healthy";
  if (status === "miss") return "Not cached";
  return "Issue detected";
}

function healthStatusClass(status?: HealthStatus) {
  if (!status) return "text-slate-500 dark:text-slate-400";
  if (status === "connected" || status === "hit") return "text-emerald-600 dark:text-emerald-400";
  if (status === "miss") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function SystemHealthCard({ health, loading }: { health: HealthStats | null; loading: boolean }) {
  const healthServices = [
    { name: "Database", status: health?.database.status },
    { name: "Vehicle cache", status: health?.cache.status },
    { name: "Cloudinary", status: health?.cloudinary.status },
  ];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
      <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">System Health</h2>
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking live services…
          </div>
        ) : healthServices.map((service) => (
          <div key={service.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              {service.name}
            </span>
            <span className={cn("text-sm font-semibold", healthStatusClass(service.status))}>{healthStatusLabel(service.status)}</span>
          </div>
        ))}
      </div>
      <Link href="/system-health" className="mt-7 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
        View full health <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function RecentAlertsCard({ notifications, loading }: { notifications: NotificationsData["notifications"]; loading: boolean }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
      <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Recent Alerts</h2>
      <div className="mt-6 space-y-4">
        {loading ? <div className="flex items-center gap-2 py-4 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading alerts…</div> : null}
        {!loading && notifications?.length ? notifications.slice(0, 4).map((alert) => {
          const unread = !alert.readAt;
          return (
            <div key={`${alert.source}:${alert.id}`} className="flex items-center gap-3">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", unread ? "bg-orange-50 text-orange-500 dark:bg-orange-500/10" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>
                {unread ? <CircleAlert className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{alert.title}</p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{relativeTime(alert.createdAt)}</p>
              </div>
              <span className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold",
                unread ? "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
              )}>
                {unread ? "Unread" : "Read"}
              </span>
            </div>
          );
        }) : null}
        {!loading && !notifications?.length ? <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No alerts yet.</p> : null}
      </div>
      <Link href="/alerts" className="mt-7 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
        View all alerts <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function QuickActionsCard({ role }: { role?: string }) {
  const actions = [
    { label: "Add Employee", href: "/settings?tab=users", icon: Users, visible: hasAppPermission(role, "users:create"), tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
    { label: "New Vehicle", href: "/vehicles?action=new", icon: Car, visible: hasAppPermission(role, "vehicles:create"), tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
    { label: "Create Loan", href: "/loan?newLoan=1", icon: HandCoins, visible: hasAppPermission(role, "loans:create"), tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
    { label: "New Asset", href: "/sms/assets?action=new", icon: Plus, visible: hasAppPermission(role, "sms:create"), tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
  ].filter((action) => action.visible);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
      <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Quick Actions</h2>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} className="group flex min-h-40 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-2 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-emerald-500/40">
              <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", action.tone)}>
                <Icon className="h-7 w-7 transition-transform group-hover:scale-105" aria-hidden="true" />
              </span>
              <span className="mt-3 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function SystemHubSelectorPage() {
  const user = useOptionalAuthUser();
  const { language } = useLanguage();
  const role = user?.role;
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [vmsStats, setVmsStats] = useState<VmsStats | null>(null);
  const [lmsStats, setLmsStats] = useState<LmsStats | null>(null);
  const [smsStats, setSmsStats] = useState<SmsStats | null>(null);
  const [loanStats, setLoanStats] = useState<LoanDashboardStats | null>(null);
  const [users, setUsers] = useState<UsersResponse["users"]>();
  const [health, setHealth] = useState<HealthStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationsData["notifications"]>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const refreshDate = () => setCurrentDate(new Date());
    refreshDate();
    const intervalId = window.setInterval(refreshDate, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchJson<T>(url: string) {
      try {
        const response = await fetch(url, { credentials: "include", cache: "no-store" });
        const json = await response.json() as ApiResponse<T>;
        return json.success ? (json.data ?? null) : null;
      } catch {
        return null;
      }
    }

    async function fetchUsers() {
      try {
        const response = await fetch("/api/auth/users", { credentials: "include", cache: "no-store" });
        const json = await response.json() as UsersResponse;
        return json.ok ? (json.users ?? []) : null;
      } catch {
        return null;
      }
    }

    async function loadStats() {
      setIsLoading(true);
      const [vms, lms, sms, loan, userList, healthData, notificationData] = await Promise.all([
        fetchJson<VmsStats>("/api/dashboard/stats"),
        fetchJson<LmsStats>("/api/lms/dashboard"),
        fetchJson<SmsStats>("/api/sms/stats"),
        fetchJson<LoanDashboardStats>("/api/loan/dashboard"),
        fetchUsers(),
        fetchJson<HealthStats>("/api/health"),
        fetchJson<NotificationsData>("/api/notifications?limit=4"),
      ]);

      if (cancelled) return;
      setVmsStats(vms);
      setLmsStats(lms);
      setSmsStats(sms);
      setLoanStats(loan);
      setUsers(userList ?? undefined);
      setHealth(healthData);
      setNotifications(notificationData?.notifications);
      setIsLoading(false);
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const systems = useMemo(() => {
    const definitions: SystemCardDefinition[] = [
      {
        key: "vms",
        title: "VMS",
        description: "Vehicle Management",
        href: "/vms",
        icon: Car,
        visible: hasAppPermission(role, "vehicles:view"),
        theme: {
          icon: "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
          title: "text-emerald-700 dark:text-emerald-300",
          button: "bg-emerald-600 hover:bg-emerald-700",
          card: "hover:bg-emerald-50/70 hover:ring-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:ring-emerald-500/50",
        },
      },
      {
        key: "lms",
        title: "LMS",
        description: "Learning Center",
        href: "/lms",
        icon: GraduationCap,
        visible: hasAppPermission(role, "lms:view"),
        theme: {
          icon: "bg-violet-50 text-violet-600 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
          title: "text-violet-700 dark:text-violet-300",
          button: "bg-violet-600 hover:bg-violet-700",
          card: "hover:bg-violet-50/70 hover:ring-violet-300 dark:hover:bg-violet-500/10 dark:hover:ring-violet-500/50",
        },
      },
      {
        key: "sms",
        title: "SMS",
        description: "Asset Inventory",
        href: "/sms/assets",
        icon: Boxes,
        visible: hasAppPermission(role, "sms:view"),
        theme: {
          icon: "bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30",
          title: "text-orange-700 dark:text-orange-300",
          button: "bg-orange-500 hover:bg-orange-600",
          card: "hover:bg-orange-50/70 hover:ring-orange-300 dark:hover:bg-orange-500/10 dark:hover:ring-orange-500/50",
        },
      },
      {
        key: "loan",
        title: "Loan",
        description: "Loan Management",
        href: "/loan",
        icon: HandCoins,
        visible: hasAppPermission(role, "loans:view"),
        theme: {
          icon: "bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30",
          title: "text-blue-700 dark:text-blue-300",
          button: "bg-blue-600 hover:bg-blue-700",
          card: "hover:bg-blue-50/70 hover:ring-blue-300 dark:hover:bg-blue-500/10 dark:hover:ring-blue-500/50",
        },
      },
      {
        key: "hr",
        title: "HR",
        description: "Human Resources",
        href: "/hr",
        icon: UserRound,
        visible: hasAppPermission(role, "users:view"),
        theme: {
          icon: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
          title: "text-rose-700 dark:text-rose-300",
          button: "bg-rose-600 hover:bg-rose-700",
          card: "hover:bg-rose-50/70 hover:ring-rose-300 dark:hover:bg-rose-500/10 dark:hover:ring-rose-500/50",
        },
      },
    ];

    return definitions.filter((system) => system.visible);
  }, [role]);

  const systemMetrics: Record<SystemKey, SystemMetric[]> = {
    vms: [
      { value: vmsStats?.total, label: "Total Vehicles" },
      { value: vmsStats?.noImageCount, label: "Vehicles Missing Photos" },
    ],
    lms: [
      { value: lmsStats?.total_staff, label: "Active Learners" },
      { value: lmsStats?.overall_completion_rate === undefined ? undefined : `${lmsStats.overall_completion_rate}%`, label: "Completion Rate" },
    ],
    sms: [
      { value: smsStats?.totalAssets, label: "Total Assets" },
      { value: smsStats?.pendingTransfers, label: "Pending Transfers" },
    ],
    loan: [
      { value: loanStats?.stats?.activeLoans, label: "Active Loans" },
      { value: loanStats?.stats?.pendingApprovals, label: "Pending Approvals" },
    ],
    hr: [
      { value: users?.length, label: "Registered Employees" },
      { value: users ? new Set(users.map((user) => user.role)).size : undefined, label: "Roles In Use" },
    ],
  };

  const isKhmer = language === "km";
  const dateLabel = currentDate
    ? new Intl.DateTimeFormat(isKhmer ? "km-KH" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(currentDate)
    : "";
  const displayName = user?.full_name || user?.username || "there";
  const totalUsers = users?.length;
  const openAlerts = smsStats?.unreadNotifications;
  const totalAssets = smsStats?.totalAssets;
  const activeLoans = loanStats?.stats?.activeLoans;

  return (
    <div className="ec-dark-scope min-h-screen bg-[#f8fafc] px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {isKhmer ? `សូមស្វាគមន៍មកវិញ ${displayName}! 👋` : `Welcome back, ${displayName}! 👋`}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              {isKhmer ? "នេះជាអ្វីដែលកំពុងកើតឡើងក្នុងប្រព័ន្ធរបស់អ្នកថ្ងៃនេះ។" : "Here’s what’s happening across your systems today."}
            </p>
          </div>
          <time dateTime={currentDate?.toISOString()} className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            {isKhmer ? "ថ្ងៃនេះ៖" : "Today:"} {dateLabel || " "}
          </time>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total Users" value={totalUsers} icon={Users} iconClass="bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" cardClass="hover:bg-emerald-50/70 hover:ring-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:ring-emerald-500/50" helper="Registered accounts" />
          <KpiCard label="Available Systems" value={systems.length} icon={Database} iconClass="bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20" cardClass="hover:bg-indigo-50/70 hover:ring-indigo-300 dark:hover:bg-indigo-500/10 dark:hover:ring-indigo-500/50" helper="Available to your role" />
          <KpiCard label="Unread Alerts" value={openAlerts} icon={AlertTriangle} iconClass="bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20" cardClass="hover:bg-orange-50/70 hover:ring-orange-300 dark:hover:bg-orange-500/10 dark:hover:ring-orange-500/50" helper="From asset notifications" />
          <KpiCard label="Total Assets" value={totalAssets} icon={Boxes} iconClass="bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" cardClass="hover:bg-emerald-50/70 hover:ring-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:ring-emerald-500/50" helper="In asset inventory" />
          <KpiCard label="Active Loans" value={activeLoans} icon={HandCoins} iconClass="bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20" cardClass="hover:bg-amber-50/70 hover:ring-amber-300 dark:hover:bg-amber-500/10 dark:hover:ring-amber-500/50" helper="Current loan portfolio" />
        </div>

        {systems.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {systems.map((system) => (
              <SystemModuleCard key={system.key} system={system} metrics={systemMetrics[system.key]} />
            ))}
          </div>
        ) : (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">No accessible systems</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your account does not have permission to open a system yet.</p>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SystemHealthCard health={health} loading={isLoading} />
          <RecentAlertsCard notifications={notifications} loading={isLoading} />
          <QuickActionsCard role={role} />
        </div>
      </div>
    </div>
  );
}
