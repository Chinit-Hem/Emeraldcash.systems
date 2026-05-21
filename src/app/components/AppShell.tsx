"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode, useEffect, useRef, useState } from "react";

import Sidebar from "@/app/components/Sidebar";
import { AuthUserProvider } from "@/app/components/AuthContext";
import { UIProvider } from "@/app/components/UIContext";
import { clearCachedUser, getCachedUser, setCachedUser } from "@/app/components/authCache";

type AppShellProps = {
  children: ReactNode;
};

// Warm up database connection on mount - helps with 0ms loading feel
function useConnectionWarmer() {
  useEffect(() => {
    // Ping serverless function to warm up connection in background
    fetch('/api/ping', {
      cache: 'no-store',
      credentials: 'include',
    }).catch(() => {
      // Ignore errors - this is just for warming up, non-blocking
    });
  }, []);
}

function useDesktopSidebar() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
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
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);
  const authChecked = useRef(false);

  // Warm up DB connection on mount
  useConnectionWarmer();

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
          // Only redirect if we don't have a cached user showing
          if (!cached) {
            setUser(null);
            if (!hasRedirected.current) {
              hasRedirected.current = true;
              router.replace("/login");
            }
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

  const getScrollKey = (path: string) => {
    const sp = searchParams?.toString?.() || "";
    return `vms_scroll:${path}:${sp}`;
  };

  // Close sidebar when pathname changes - use flushSync for immediate effect
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      // Schedule state update to avoid synchronous setState warning
      const timeoutId = setTimeout(() => setIsSidebarOpen(false), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [pathname]);

  // Persist/restore scroll position for the nested scroll container (<main />)
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const key = getScrollKey(pathname);

    const onScroll = () => {
      try {
        sessionStorage.setItem(key, String(el.scrollTop));
      } catch {
        // ignore quota/session errors
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    // Restore when we mount on this pathname (or return back)
    // Do it after paint so layout has settled.
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(key);
        if (saved != null) el.scrollTop = Number(saved) || 0;
      } catch {
        // ignore
      }
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);
      el.removeEventListener("scroll", onScroll);
    };
     
  }, [pathname]);

  // Neumorphism loading card
  const loadingCardClass = "neu-card max-w-md w-full";

  // Mobile-first header with Neumorphism
  const mobileHeaderClass = "lg:hidden fixed top-0 left-0 right-0 z-40 neu-card-sm !rounded-none !rounded-b-neu !p-0 safe-area-top";

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
    <div className="flex min-h-screen bg-transparent pb-safe lg:pb-0">
      <AuthUserProvider user={user}>
        {/* Desktop sidebar */}
        {isDesktopSidebar && (
          <div className="hidden lg:block">
              <Suspense fallback={null}>
              <Sidebar user={user} mode="desktop" />
            </Suspense>
          </div>
        )}

        {/* Mobile drawer - Neumorphism style */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-[60] lg:hidden"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsSidebarOpen(false);
            }}
          >
            <div
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            <div
              className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] h-full bg-neu-bg overflow-hidden shadow-neu-flat-lg"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <Suspense fallback={null}>
                <Sidebar
                  user={user}
                  onNavigate={() => setIsSidebarOpen(false)}
                  isVisible={true}
                  mode="drawer"
                />
              </Suspense>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0">
          {/* Mobile header - Fixed position with safe area support */}
          <header className={mobileHeaderClass}>
            <div className="h-14 px-4 flex items-center justify-between max-w-[100vw]">
              <button
                onClick={() => {
                  // iOS Safari: avoid touch default handling delays/double events
                  requestAnimationFrame(() => setIsSidebarOpen(true));
                }}
                className="neu-icon-btn touch-target"
                aria-label="Open navigation menu"
                type="button"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-3 min-w-0 flex-1 justify-center">
                <div className="relative w-9 h-9 flex items-center justify-center overflow-hidden flex-shrink-0 neu-icon-btn !rounded-full">
                  <Image
                    src="/logo.png"
                    alt="Emerald Cash"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-neu-text text-sm leading-tight truncate">Emerald Cash</span>
                  <span className="text-[10px] text-neu-green font-bold uppercase tracking-wider">VMS PRO</span>
                </div>
              </div>

              <div className="w-9 flex-shrink-0" aria-hidden="true" />
            </div>
          </header>

          {/* Main content - Add padding-top to account for fixed header on mobile */}
          <main ref={mainRef} className="flex-1 overflow-auto pt-4 lg:pt-0">
            {children}
          </main>
        </div>
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
