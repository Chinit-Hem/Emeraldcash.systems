"use client";

import type { User } from "@/shared/types/types";
import Image from "next/image";
import {
  Bell,
  Boxes,
  Car,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  Grid2X2,
  Languages,
  Landmark,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NotificationPanel, type AppNotification } from "./NotificationPanel";
import { ChatPanel } from "./ChatPanel";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { clearCachedUser } from "@/shared/utils/authCache";
import { hasAppPermission } from "@/shared/utils/permissions";
import { DateInput } from "./DateInput";

type TopBarProps = {
  user?: User | null;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
};

export default function TopBar({
  user,
  onMenuClick = () => {},
  showMenuButton = true,
  title,
  subtitle,
  actions,
  showBack,
  onBack,
}: TopBarProps) {
  const router = useRouter();
  const { language, toggleLanguage } = useLanguage();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [isSystemsMenuOpen, setIsSystemsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [workingDate, setWorkingDate] = useState("");
  const canReadNotifications = Boolean(user?.username);
  const displayDate = useMemo(() => workingDate ? new Intl.DateTimeFormat(language === "km" ? "km-KH" : "en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Phnom_Penh" }).format(new Date(`${workingDate}T12:00:00+07:00`)) : "—", [language, workingDate]);

  const bellButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const systemsButtonRef = useRef<HTMLButtonElement | null>(null);
  const systemsMenuRef = useRef<HTMLDivElement | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const dateMenuRef = useRef<HTMLDivElement | null>(null);
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);
  const chatButtonRef = useRef<HTMLButtonElement | null>(null);
  const chatMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRequestRef = useRef<Promise<void> | null>(null);
  const notificationsLoadedRef = useRef(false);
  const notificationsLoadedAtRef = useRef(0);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const loadNotifications = useCallback((force = false): Promise<void> => {
    if (!canReadNotifications) {
      setNotifications([]);
      setNotificationUnreadCount(0);
      notificationsLoadedRef.current = false;
      return Promise.resolve();
    }
    if (!force && notificationsLoadedRef.current && Date.now() - notificationsLoadedAtRef.current < 15_000) return Promise.resolve();
    if (notificationsRequestRef.current) return notificationsRequestRef.current;

    if (!notificationsLoadedRef.current) setNotificationsLoading(true);
    const request = (async () => {
      try {
        const response = await fetch("/api/notifications?limit=20", { credentials: "include", cache: "no-store" });
        const payload = await response.json().catch(() => null) as { success?: boolean; data?: { notifications?: AppNotification[]; unreadCount?: number } } | null;
        if (response.ok && payload?.success) {
          setNotifications(payload.data?.notifications ?? []);
          setNotificationUnreadCount(Number(payload.data?.unreadCount ?? 0));
          notificationsLoadedRef.current = true;
          notificationsLoadedAtRef.current = Date.now();
        }
      } finally {
        setNotificationsLoading(false);
      }
    })().finally(() => {
      if (notificationsRequestRef.current === request) notificationsRequestRef.current = null;
    });
    notificationsRequestRef.current = request;
    return request;
  }, [canReadNotifications]);

  const markNotificationsRead = useCallback(async (notification?: AppNotification) => {
    if (!canReadNotifications) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => !notification || (item.source === notification.source && item.id === notification.id) ? { ...item, readAt: item.readAt || readAt } : item));
    setNotificationUnreadCount((current) => notification ? Math.max(0, current - (notification.readAt ? 0 : 1)) : 0);
    const response = await fetch("/api/notifications", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notification ? { notifications: [{ source: notification.source, id: notification.id }] } : {}) });
    if (!response.ok) await loadNotifications(true);
  }, [canReadNotifications, loadNotifications]);

  const loadChatUnread = useCallback(async () => {
    if (!user?.username) {
      setChatUnreadCount(0);
      return;
    }
    try {
      const response = await fetch("/api/chat", { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null) as { success?: boolean; data?: { unreadCount?: number } } | null;
      if (response.ok && payload?.success) setChatUnreadCount(Number(payload.data?.unreadCount ?? 0));
    } catch {
      // The chat button remains usable if the service is temporarily unavailable.
    }
  }, [user?.username]);

  useEffect(() => {
    const savedDate = window.localStorage.getItem("emerald-cash.working-date");
    if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) {
      setWorkingDate(savedDate);
      return;
    }
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) setWorkingDate(`${year}-${month}-${day}`);
  }, []);

  useEffect(() => {
    if (workingDate) window.localStorage.setItem("emerald-cash.working-date", workingDate);
  }, [workingDate]);

  useEffect(() => {
    void loadNotifications();
    const refresh = window.setInterval(() => void loadNotifications(true), 60_000);
    return () => window.clearInterval(refresh);
  }, [loadNotifications]);

  useEffect(() => {
    void loadChatUnread();
    const refresh = window.setInterval(() => void loadChatUnread(), 60_000);
    return () => window.clearInterval(refresh);
  }, [loadChatUnread]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const withinBell = bellButtonRef.current?.contains(target);
      const withinDropdown = dropdownRef.current?.contains(target);

      if (!withinBell && !withinDropdown) setIsNotificationsOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNotificationsOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isSystemsMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (!systemsButtonRef.current?.contains(target) && !systemsMenuRef.current?.contains(target)) {
        setIsSystemsMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSystemsMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSystemsMenuOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (!accountButtonRef.current?.contains(target) && !accountMenuRef.current?.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!isDateMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !dateButtonRef.current?.contains(target) && !dateMenuRef.current?.contains(target)) setIsDateMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isDateMenuOpen]);

  useEffect(() => {
    if (!isChatOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !chatButtonRef.current?.contains(target) && !chatMenuRef.current?.contains(target)) setIsChatOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setIsChatOpen(false); };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("pointerdown", onPointerDown); window.removeEventListener("keydown", onKeyDown); };
  }, [isChatOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const update = () => {
      const btn = bellButtonRef.current;
      if (!btn) return;

      const r = btn.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: r.bottom + 8,
        left: r.right,
        transform: "translateX(-100%)",
        zIndex: 250,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isNotificationsOpen]);

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const goToAccountPage = (path: string) => {
    setIsAccountMenuOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    const message = language === "km" ? "តើអ្នកប្រាកដជាចង់ចាកចេញឬទេ?" : "Are you sure you want to log out?";
    if (!window.confirm(message)) return;

    setIsAccountMenuOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearCachedUser();
      window.location.assign("/login");
    }
  };

  const displayedRole = user && user.role.trim().toLocaleLowerCase() === "staff" && user.position?.trim() ? user.position.trim() : user?.role;
  const roleLabel = user
    ? language === "km"
      ? ({
          Admin: "អ្នកគ្រប់គ្រង",
          "System Administrator": "អ្នកគ្រប់គ្រងប្រព័ន្ធ",
          "Branch Manager": "អ្នកគ្រប់គ្រងសាខា",
          "Manager / Approver": "អ្នកគ្រប់គ្រង / អ្នកអនុម័ត",
          "Loan Operations": "ប្រតិបត្តិការឥណទាន",
          "Loan Specialist": "អ្នកឯកទេសផ្ដល់កម្ចី",
          Accountant: "គណនេយ្យករ",
          "Assistant Accountant": "ជំនួយការគណនេយ្យ",
          "Credit / Approver": "ឥណទាន / អ្នកអនុម័ត",
          Finance: "ហិរញ្ញវត្ថុ",
          "Human Resources": "ធនធានមនុស្ស",
          "IT Support": "ជំនួយ IT",
          "Risk & Compliance": "ហានិភ័យ និងអនុលោមភាព",
          Marketing: "ទីផ្សារ",
          "Intern / Read Only": "ហាត់ការ / អានតែប៉ុណ្ណោះ",
          "Executive Viewer": "អ្នកគ្រប់គ្រងមើលទិន្នន័យ",
          Staff: "បុគ្គលិក",
        } as Record<string, string>)[displayedRole || user.role] || displayedRole || user.role
      : displayedRole || ""
    : "";
  const displayUserName = user && user.full_name?.trim() && user.full_name.trim().toLocaleLowerCase() !== roleLabel.trim().toLocaleLowerCase() ? user.full_name : user?.username || "";

  const systems = [
    {
      label: language === "km" ? "គ្រប់គ្រងយានយន្ត" : "Vehicle Management",
      href: "/vms",
      icon: Car,
      visible: hasAppPermission(user?.role, "vehicles:view"),
      tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    {
      label: language === "km" ? "មជ្ឈមណ្ឌលសិក្សា" : "Learning Center",
      href: "/lms",
      icon: GraduationCap,
      visible: hasAppPermission(user?.role, "lms:view"),
      tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
    },
    {
      label: language === "km" ? "សារពើភ័ណ្ឌទ្រព្យសម្បត្តិ" : "Asset Inventory",
      href: "/sms/dashboard",
      icon: Boxes,
      visible: hasAppPermission(user?.role, "sms:view"),
      tone: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300",
    },
    {
      label: language === "km" ? "គ្រប់គ្រងប្រាក់កម្ចី" : "Loan Management",
      href: "/loan",
      icon: Landmark,
      visible: hasAppPermission(user?.role, "loans:view"),
      tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    },
    {
      label: language === "km" ? "ធនធានមនុស្ស" : "Human Resources",
      href: "/hr",
      icon: UserRound,
      visible: hasAppPermission(user?.role, "settings:view"),
      tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    },
  ].filter((system) => system.visible);

  const goToSystem = (href: string) => {
    setIsSystemsMenuOpen(false);
    router.push(href);
  };

  return (
    <header className="sticky left-0 right-0 top-0 z-40 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-xl transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/95 print:hidden">
      <div className="mx-auto flex h-full max-w-[1920px] items-center gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {showBack ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label={language === "km" ? "ត្រឡប់ក្រោយ" : "Go back"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            ) : showMenuButton ? (
              <>
                <button
                  type="button"
                  onClick={onMenuClick}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label={language === "km" ? "បើក ឬបិទម៉ឺនុយ" : "Toggle navigation"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                  </svg>
                </button>

              </>
            ) : null}

            <div className="flex min-w-0 items-center gap-3 xl:hidden">
              <div className="relative flex h-9 w-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white px-2 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-white dark:text-white">
                <Image
                  src="/logo-horizontal.png"
                  alt="Emerald Cash logo"
                  width={86}
                  height={36}
                  className="h-auto w-full object-contain"
                  priority
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-col gap-0.5">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    Emerald Cash
                  </p>
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                    Systems
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden min-w-0 xl:block">
            {title ? (
              <div className="space-y-1">
                <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mx-auto hidden min-w-[280px] max-w-xl flex-1 items-center justify-center md:flex">
            <label className="relative flex h-9 w-full max-w-[460px] items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                placeholder={language === "km" ? "ស្វែងរក..." : "Search anything..."}
                className="h-full w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-16 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-500/60 dark:focus:ring-emerald-500/10"
              />
              <span className="pointer-events-none absolute right-2 hidden rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm lg:inline dark:border-slate-700 dark:bg-slate-950">
                Ctrl + K
              </span>
            </label>
          </div>

          <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
            {actions}

            {hasAppPermission(user?.role, "loans:create") ? <button type="button" onClick={() => router.push("/loan?view=loans&newLoan=1")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:px-3" title={language === "km" ? "បង្កើតកម្ចីថ្មី" : "Quick create loan"}><Plus className="h-4 w-4" /><span className="hidden xl:inline">{language === "km" ? "បង្កើតថ្មី" : "Create"}</span></button> : null}

            {systems.length > 0 ? (
              <div className="relative">
                <button
                  ref={systemsButtonRef}
                  type="button"
                  onClick={() => setIsSystemsMenuOpen((current) => !current)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-3"
                  aria-label={language === "km" ? "ម៉ឺនុយប្រព័ន្ធ" : "Systems menu"}
                  aria-expanded={isSystemsMenuOpen}
                  aria-haspopup="menu"
                >
                  <Grid2X2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isSystemsMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>

                {isSystemsMenuOpen ? (
                  <div
                    ref={systemsMenuRef}
                    role="menu"
                    aria-label={language === "km" ? "ជ្រើសរើសប្រព័ន្ធ" : "Choose a system"}
                    className="absolute right-0 top-[calc(100%+0.75rem)] z-[260] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
                  >
                    {systems.map((system) => {
                      const Icon = system.icon;
                      return (
                        <button
                          key={system.href}
                          type="button"
                          onClick={() => goToSystem(system.href)}
                          role="menuitem"
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${system.tone}`}>
                            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-100">{system.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="relative hidden lg:block">
              <button
                ref={dateButtonRef}
                type="button"
                onClick={() => setIsDateMenuOpen((current) => !current)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={language === "km" ? "កាលបរិច្ឆេទការងារ" : "Working date"}
                aria-expanded={isDateMenuOpen}
              >
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span className="hidden xl:inline text-slate-400">{language === "km" ? "ថ្ងៃធ្វើការ" : "Business Date"}</span><span>{displayDate}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isDateMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {isDateMenuOpen ? <div ref={dateMenuRef} className="absolute right-0 top-[calc(100%+0.75rem)] z-[260] w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{language === "km" ? "កាលបរិច្ឆេទការងារ" : "Working date"}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{language === "km" ? "ជ្រើសរើសកាលបរិច្ឆេទសម្រាប់ការងារ" : "Choose the date you are working with."}</p><DateInput title={language === "km" ? "កាលបរិច្ឆេទការងារ" : "Working date"} value={workingDate} onChange={setWorkingDate} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><button type="button" onClick={() => { const now = new Date(); const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now); const year = parts.find((part) => part.type === "year")?.value; const month = parts.find((part) => part.type === "month")?.value; const day = parts.find((part) => part.type === "day")?.value; if (year && month && day) setWorkingDate(`${year}-${month}-${day}`); }} className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">{language === "km" ? "ប្រើថ្ងៃនេះ" : "Use today"}</button></div> : null}
            </div>

            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={language === "km" ? "ប្ដូរភាសា" : "Toggle language"}
            >
              <Languages className="h-4 w-4" />
            </button>

            <div className="relative hidden sm:block">
              <button
                ref={chatButtonRef}
                type="button"
                onClick={() => { setIsChatOpen((current) => !current); void loadChatUnread(); }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label={language === "km" ? "សារ" : "Messages"}
                aria-expanded={isChatOpen}
              >
                <MessageSquare className="h-4 w-4" />
                {chatUnreadCount > 0 ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white">{chatUnreadCount > 9 ? "9+" : chatUnreadCount}</span> : null}
              </button>
              {isChatOpen && user ? <div ref={chatMenuRef} className="absolute right-0 top-[calc(100%+0.75rem)] z-[260]"><ChatPanel currentUsername={user.username} onClose={() => setIsChatOpen(false)} onUnreadCountChange={setChatUnreadCount} /></div> : null}
            </div>

            <button
              type="button"
              ref={bellButtonRef}
              onClick={() => { setIsNotificationsOpen((value) => !value); void loadNotifications(); }}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={`${language === "km" ? "ការជូនដំណឹង" : "Notifications"}${notificationUnreadCount ? ` (${notificationUnreadCount})` : ""}`}
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="h-4 w-4" />

              {notificationUnreadCount > 0 ? <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white ring-2 ring-white dark:ring-slate-900">{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</span> : null}
            </button>

            {isNotificationsOpen && (
              <div ref={dropdownRef} style={dropdownStyle}>
                <NotificationPanel notifications={notifications} unreadCount={notificationUnreadCount} loading={notificationsLoading} onClose={() => setIsNotificationsOpen(false)} onMarkAllRead={() => void markNotificationsRead()} onViewAll={() => { setIsNotificationsOpen(false); router.push("/alerts"); }} onOpen={(notification) => { if (!notification.readAt) void markNotificationsRead(notification); setIsNotificationsOpen(false); router.push(notification.href); }} />
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  ref={accountButtonRef}
                  type="button"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-1.5 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label={language === "km" ? "ប្រវត្តិរូប" : "Profile menu"}
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Image
                      src={user.profile_picture || "/logo-horizontal.png"}
                      alt={user.full_name || user.username}
                      width={32}
                      height={32}
                      className={`h-8 w-8 ${user.profile_picture ? "object-cover" : "bg-white object-contain p-1"}`}
                      priority
                    />
                  </div>
                  <div className="hidden min-w-0 max-w-[130px] flex-col truncate sm:flex">
                    <span className="truncate text-xs font-semibold leading-4 text-slate-900 dark:text-white">
                      {displayUserName}
                    </span>
                    <span className="truncate text-[10px] leading-3 text-slate-500 dark:text-slate-400">
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronDown className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform sm:block ${isAccountMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isAccountMenuOpen ? (
                  <div
                    ref={accountMenuRef}
                    role="menu"
                    aria-label={language === "km" ? "ម៉ឺនុយគណនី" : "Account menu"}
                    className="absolute right-0 top-[calc(100%+0.75rem)] z-[260] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
                  >
                    <span aria-hidden="true" className="absolute -top-2 right-6 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />

                    <div className="relative flex items-center gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 ring-4 ring-emerald-50/80 dark:bg-emerald-500/15 dark:ring-emerald-500/10">
                        <Image
                          src={user.profile_picture || "/logo-horizontal.png"}
                          alt={user.full_name || user.username}
                          width={64}
                          height={64}
                          className={`h-16 w-16 ${user.profile_picture ? "object-cover" : "bg-white object-contain p-2"}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">{displayUserName}</p>
                        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">@{user.username} · {roleLabel}</p>
                        <button
                          type="button"
                          onClick={() => goToAccountPage("/settings")}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                          role="menuitem"
                        >
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                          {language === "km" ? "ប្រវត្តិរូបខ្ញុំ" : "My profile"}
                        </button>
                      </div>
                    </div>

                    <div className="p-2">
                      {["admin", "system administrator"].includes(user.role.trim().toLocaleLowerCase()) ? (
                        <button
                          type="button"
                          onClick={() => goToAccountPage("/admin/users")}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          role="menuitem"
                        >
                          <UsersRound className="h-5 w-5 text-slate-400" aria-hidden="true" />
                          <span className="flex-1">{language === "km" ? "គ្រប់គ្រងគណនី" : "Manage accounts"}</span>
                          <ChevronDown className="h-4 w-4 -rotate-90 text-slate-400" aria-hidden="true" />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => goToAccountPage("/settings")}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        role="menuitem"
                      >
                        <Settings2 className="h-5 w-5 text-slate-400" aria-hidden="true" />
                        <span className="flex-1">{language === "km" ? "ការកំណត់" : "Settings"}</span>
                        <ChevronDown className="h-4 w-4 -rotate-90 text-slate-400" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        role="menuitem"
                      >
                        <LogOut className="h-5 w-5" aria-hidden="true" />
                        <span>{language === "km" ? "ចាកចេញ" : "Log out"}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {language === "km" ? "ចូល" : "Login"}
              </button>
            )}
          </div>
      </div>
    </header>
  );
}
