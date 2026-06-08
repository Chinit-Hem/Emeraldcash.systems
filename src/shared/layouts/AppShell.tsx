"use client";

import type { User } from "@/shared/types/types";
import Image from "next/image";
import { Menu } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import MobileBottomNav from "@/shared/components/MobileBottomNav";
import MobileBackHandler from "@/shared/components/MobileBackHandler";
import Sidebar from "@/shared/components/Sidebar";
import { AuthUserProvider } from "@/shared/hooks/AuthContext";
import { UIProvider } from "@/shared/hooks/UIContext";
import { clearCachedUser, getCachedUser, setCachedUser } from "@/shared/utils/authCache";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { useStandaloneDisplayMode } from "@/shared/hooks/useStandaloneDisplayMode";

type AppShellProps = {
  children: ReactNode;
};

function useDesktopSidebar() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsDesktop(mediaQuery.matches);

    update();
    mediaQuery.addEventListener?.("change", update);

    return () => {
      mediaQuery.removeEventListener?.("change", update);
    };
  }, []);

  return isDesktop;
}

function AppShellContent({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktopSidebar = useDesktopSidebar();
  const isStandaloneApp = useStandaloneDisplayMode();
  const { language } = useLanguage();
  const systemsLabel = language === "km" ? "ប្រព័ន្ធ" : "Systems";
  const openMenuLabel = language === "km" ? "បើកម៉ឺនុយ" : "Open menu";

  // OPTIMIZATION: Show UI immediately with cached user, check auth in background
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loading, setLoading] = useState(false); // Changed: default false for 0ms load feel
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarClosing, setIsSidebarClosing] = useState(false);
  const [hasOpenedSidebar, setHasOpenedSidebar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);
  const authChecked = useRef(false);
  const closeSidebarTimer = useRef<number | null>(null);
  const drawerId = "mobile-navigation-drawer";
  const openSidebar = useCallback(() => {
    if (closeSidebarTimer.current !== null) {
      window.clearTimeout(closeSidebarTimer.current);
      closeSidebarTimer.current = null;
    }
    setIsSidebarClosing(false);
    setHasOpenedSidebar(true);
    setIsSidebarOpen(true);
  }, []);
  const closeSidebar = useCallback(() => {
    if (!isSidebarOpen) return;

    if (closeSidebarTimer.current !== null) {
      window.clearTimeout(closeSidebarTimer.current);
    }

    setIsSidebarOpen(false);
    setIsSidebarClosing(true);
    closeSidebarTimer.current = window.setTimeout(() => {
      setIsSidebarClosing(false);
      closeSidebarTimer.current = null;
    }, 220);
  }, [isSidebarOpen]);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    const defer =
      typeof queueMicrotask === "function"
        ? queueMicrotask
        : (callback: () => void) => Promise.resolve().then(callback);

    // Already have cached user - show UI immediately
    const cached = getCachedUser();
    if (cached && !authChecked.current) {
      setUser(cached);
      // Don't set loading false because we're showing UI immediately
    }

    async function checkAuth() {
      try {
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!isActive) {
          return;
        }

        authChecked.current = true;
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok || !data?.user) {
          clearCachedUser();
          setUser(null);
          if (!hasRedirected.current) {
            hasRedirected.current = true;
            router.replace("/login");
          }
          return;
        }

        setCachedUser(data.user as User);
        setUser(data.user as User);
        setError(null);
      } catch (err) {
        if (!isActive) return;

        // Auth check failed - if we have cached user, keep showing them
        // If no cached user, show error
        const isAbortError = err instanceof Error && err.name === "AbortError";
        if (!cached) {
          setError(
            isAbortError
              ? "Connection timed out. Please check your network and try again."
              : "Connection failed. Please check your network and try again."
          );
        }
      }
    }

    // Run server check in background (non-blocking UI)
    // Use setTimeout to allow UI to render first
    setTimeout(() => {
      checkAuth();
    }, 0);

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (closeSidebarTimer.current !== null) {
        window.clearTimeout(closeSidebarTimer.current);
      }
    };
  }, []);

  const mainRef = useRef<HTMLElement | null>(null);

  const scrollKey = useMemo(() => {
    const sp = searchParams?.toString?.() || "";
    return `vms_scroll:${pathname}:${sp}`;
  }, [pathname, searchParams]);

  // Close sidebar when pathname changes - use flushSync for immediate effect
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      closeSidebar();
    }
  }, [closeSidebar, pathname]);

  // Persist/restore scroll position for the nested scroll container.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    let pendingFrame: number | null = null;

    const saveScrollPosition = () => {
      try {
        sessionStorage.setItem(scrollKey, String(el.scrollTop));
      } catch {
        // ignore quota/session errors
      }
    };

    const onScroll = () => {
      if (pendingFrame !== null) return;
      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = null;
        saveScrollPosition();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    // Restore when we mount on this pathname (or return back)
    // Do it after paint so layout has settled.
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(scrollKey);
        el.scrollTop = saved != null ? Number(saved) || 0 : 0;
      } catch {
        // ignore
      }
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }
      el.removeEventListener("scroll", onScroll);
    };

  }, [scrollKey]);

  // Neumorphism loading card
  const loadingCardClass = "neu-card max-w-md w-full";

  // Mobile-first header with Neumorphism
  const mobileHeaderClass = "xl:hidden fixed top-0 left-0 right-0 z-40 neu-card-sm !rounded-none !rounded-b-neu !p-0 safe-area-top";
  const bottomPaddingClass = isStandaloneApp ? "pb-safe" : "pb-0";
  const shouldShowSidebarLayer = isSidebarOpen || isSidebarClosing;

  // Loading state - Neumorphism
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neu-bg">
        <div className="neu-card text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-neu-bg-dark border-t-neu-green animate-spin" />
          <p className="text-neu-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state - Neumorphism
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neu-bg">
        <div className={`p-8 ${loadingCardClass} text-center`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full neu-icon-btn text-neu-red flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-neu-text mb-2">Connection Error</h1>
          <p className="text-neu-text-muted mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="neu-btn-green w-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className={`flex h-dvh min-h-screen overflow-hidden bg-transparent ${bottomPaddingClass} xl:pb-0`}>
      <AuthUserProvider user={user}>
        <MobileBackHandler isMenuOpen={isSidebarOpen} onCloseMenu={closeSidebar} />

        {/* Desktop sidebar */}
        {isDesktopSidebar && (
          <div className="hidden xl:block">
              <Suspense fallback={null}>
              <Sidebar user={user} mode="desktop" />
            </Suspense>
          </div>
        )}

        {/* Mobile drawer */}
        <div
          className={`fixed inset-0 z-[60] xl:hidden ${shouldShowSidebarLayer ? "visible" : "invisible"} ${isSidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeSidebar();
          }}
          {...(!isSidebarOpen ? { "aria-hidden": "true" as const } : {})}
        >
          <div
            className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeSidebar}
            aria-hidden="true"
          />
          <div
            id={drawerId}
            className={`absolute inset-y-0 left-0 h-full w-[280px] max-w-[85vw] overflow-hidden bg-neu-bg shadow-neu-flat-lg transition-[opacity,transform] duration-[220ms] ease-out will-change-[opacity,transform] motion-reduce:transition-none ${isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"}`}
            role="dialog"
            {...(isSidebarOpen ? { "aria-modal": "true" as const } : {})}
            aria-label="Navigation menu"
          >
            <Suspense fallback={null}>
              {hasOpenedSidebar ? (
                <Sidebar
                  user={user}
                  onNavigate={closeSidebar}
                  isVisible={isSidebarOpen}
                  mode="drawer"
                />
              ) : null}
            </Suspense>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 min-w-0 flex-col pt-14 xl:pt-0">
          {/* Mobile header - Fixed position with safe area support */}
          <header
            className={`${mobileHeaderClass} transition-opacity duration-150 ${shouldShowSidebarLayer ? "pointer-events-none opacity-0" : "opacity-100"}`}
            {...(shouldShowSidebarLayer ? { "aria-hidden": "true" as const } : {})}
          >
            <div className="relative h-14 px-4 flex items-center justify-center max-w-[100vw]">
              <div className="flex min-w-0 translate-y-1 items-center justify-center gap-3">
                <div className="relative w-9 h-9 flex items-center justify-center overflow-hidden flex-shrink-0 neu-icon-btn !rounded-full !bg-white dark:!bg-white">
                  <Image
                    src="/logo.png"
                    alt=""
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-neu-text text-sm leading-tight truncate">Emerald Cash</span>
                  <span className="text-sm font-bold leading-tight text-emerald-700 dark:text-emerald-300">{systemsLabel}</span>
                </div>
              </div>
              {!isStandaloneApp ? (
                <button
                  type="button"
                  className="neu-icon-btn absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 text-neu-text-muted"
                  onClick={openSidebar}
                  aria-label={openMenuLabel}
                  aria-controls={drawerId}
                  {...{ "aria-expanded": isSidebarOpen ? "true" as const : "false" as const }}
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </header>

          {/* Main content - Add padding-top to account for fixed header on mobile */}
          <main
            ref={mainRef}
            data-app-scroll-container="true"
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-0"
          >
            {children}
          </main>
        </div>

        <MobileBottomNav user={user} isMenuOpen={isSidebarOpen} onOpenMenu={openSidebar} />
      </AuthUserProvider>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <UIProvider>
      <AppShellContent>{children}</AppShellContent>
    </UIProvider>
  );
}
