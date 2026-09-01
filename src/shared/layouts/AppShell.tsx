"use client";

import type { User } from "@/shared/types/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import MobileBottomNav from "@/shared/components/MobileBottomNav";
import MobileBackHandler from "@/shared/components/MobileBackHandler";
import { AppSidebar, MobileDrawer } from "@/shared/components/sidebar/index";
import TopBar from "@/shared/components/TopBar";
import { AuthUserProvider } from "@/shared/hooks/AuthContext";
import { UIProvider } from "@/shared/hooks/UIContext";
import { clearCachedUser, getCachedUser, setCachedUser } from "@/shared/utils/authCache";

type AppShellProps = {
  children: ReactNode;
};

const LAST_APP_LOCATION_KEY = "emerald-cash.last-app-location";

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

  // OPTIMIZATION: Show UI immediately with cached user, check auth in background
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loading, setLoading] = useState(false); // Changed: default false for 0ms load feel
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCompact, setIsSidebarCompact] = useState(true);
  const [isSidebarPreferenceLoaded, setIsSidebarPreferenceLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);
  const authChecked = useRef(false);
  const currentLocationRef = useRef("/");
  const sidebarPreferenceKey = "emerald-cash.sidebar.collapsed.v2";
  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);
  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    const query = searchParams?.toString?.() || "";
    const currentLocation = query ? `${pathname}?${query}` : pathname;
    currentLocationRef.current = currentLocation;
    try {
      window.sessionStorage.setItem(LAST_APP_LOCATION_KEY, currentLocation);
    } catch {
      // Navigation still works when session storage is unavailable.
    }
  }, [pathname, searchParams]);

  const handleLogout = useCallback(() => {
    if (!window.confirm("Are you sure you want to log out?")) return;

    void (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        clearCachedUser();
        window.location.assign("/login");
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const storedPreference = window.localStorage.getItem(sidebarPreferenceKey);
      setIsSidebarCompact(storedPreference === null ? true : storedPreference === "true");
    } catch {
      // Keep the compact default when storage is unavailable.
    } finally {
      setIsSidebarPreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isSidebarPreferenceLoaded) return;
    try {
      window.localStorage.setItem(sidebarPreferenceKey, String(isSidebarCompact));
    } catch {
      // Storage may be disabled in private browsing; the current session still works.
    }
  }, [isSidebarCompact, isSidebarPreferenceLoaded]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "b") return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;

      event.preventDefault();
      if (isDesktopSidebar) {
        setIsSidebarCompact((current) => !current);
      } else {
        setIsSidebarOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDesktopSidebar]);

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
            const redirectPath = currentLocationRef.current || "/";
            router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
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
    let restoreTimer: number | null = null;
    let restoreAttempts = 0;
    let restored = false;
    let savedScrollTop = 0;

    try {
      const saved = sessionStorage.getItem(scrollKey);
      const parsed = saved === null ? 0 : Number(saved);
      savedScrollTop = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      // Keep the top position when session storage is unavailable.
    }

    const saveScrollPosition = () => {
      if (!restored) return;
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

    // Reports and grids load asynchronously. Wait until the nested content is
    // tall enough before restoring, otherwise the browser clamps scrollTop to 0.
    const restoreScrollPosition = () => {
      restoreAttempts += 1;
      const maximumScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      if (maximumScrollTop < savedScrollTop && restoreAttempts < 150) {
        restoreTimer = window.setTimeout(restoreScrollPosition, 100);
        return;
      }

      el.scrollTo({
        top: Math.min(savedScrollTop, maximumScrollTop),
        behavior: "auto",
      });
      restored = true;
    };

    restoreTimer = window.setTimeout(restoreScrollPosition, 0);
    window.addEventListener("pagehide", saveScrollPosition);
    window.addEventListener("beforeunload", saveScrollPosition);

    return () => {
      saveScrollPosition();
      if (restoreTimer !== null) window.clearTimeout(restoreTimer);
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", saveScrollPosition);
      window.removeEventListener("beforeunload", saveScrollPosition);
    };

  }, [scrollKey]);

  // Neumorphism loading card
  const loadingCardClass = "neu-card max-w-md w-full";

  const bottomPaddingClass = "pb-0";

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
    <div className={`flex h-dvh max-h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-transparent ${bottomPaddingClass} xl:pb-0`}>
      <AuthUserProvider user={user}>
        <MobileBackHandler isMenuOpen={isSidebarOpen} onCloseMenu={closeSidebar} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop sidebar (render ONLY once) */}
          {isDesktopSidebar && (
            <Suspense fallback={null}>
              <AppSidebar
                user={user}
                mode="desktop"
                collapsed={isSidebarCompact}
                onToggleCollapse={() => setIsSidebarCompact((state) => !state)}
                onLogout={handleLogout}
              />
            </Suspense>
          )}

          <div className="flex min-h-0 flex-1 min-w-0 flex-col">
            <TopBar
              user={user}
              showMenuButton={!isDesktopSidebar}
              onMenuClick={() => {
                if (isDesktopSidebar) {
                  setIsSidebarCompact((state) => !state);
                } else {
                  openSidebar();
                }
              }}
            />

            {/* Main content */}
            <main
              ref={mainRef}
              data-app-scroll-container="true"
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-0"
            >
              {children}
            </main>
          </div>
        </div>

        <MobileDrawer open={isSidebarOpen} onClose={closeSidebar}>
          <Suspense fallback={null}>
            <AppSidebar user={user} onNavigate={closeSidebar} onLogout={handleLogout} mode="drawer" />
          </Suspense>
        </MobileDrawer>

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
