"use client";

import Image from "next/image";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { translatePhrase, useTranslation } from "@/shared/utils/i18n";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";

const SHOW_LOGIN_DEBUG = process.env.NODE_ENV !== "production";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
const TURNSTILE_ENABLED = Boolean(TURNSTILE_SITE_KEY);
const LAST_APP_LOCATION_KEY = "emerald-cash.last-app-location";

type TurnstileRenderOptions = {
  sitekey: string
  theme?: "auto" | "light" | "dark";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

// Safe client-side only hook to prevent hydration mismatches
function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // Defer state update to avoid cascading render warning
    Promise.resolve().then(() => {
      setIsMounted(true);
    });
  }, []);
  return isMounted;
}

// Warm up the database connection after the user shows login intent.
function useConnectionWarmer() {
  const hasWarmedRef = useRef(false);

  return useCallback(() => {
    if (hasWarmedRef.current) return;
    hasWarmedRef.current = true;

    fetch('/api/ping', { 
      cache: 'no-store',
      credentials: 'include',
    }).catch(() => {
      // Ignore errors - this is just for warming up
    });
  }, []);
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMounted = useIsMounted();
  const usernameInputId = "login-username";
  const passwordInputId = "login-password";
  const rememberInputId = "login-remember";
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const brandName = translatePhrase("Emerald Cash", language);
  const showPasswordLabel = translatePhrase("Show password", language);
  const hidePasswordLabel = translatePhrase("Hide password", language);
  const copyrightText = translatePhrase("© 2024 Emerald Cash", language);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [turnstileScriptReady, setTurnstileScriptReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const warmConnection = useConnectionWarmer();

  // Load remembered username (client-side only)
  useEffect(() => {
    if (!isMounted) return;
    try {
      const remembered = localStorage.getItem("ec_remember_username");
      if (remembered) {
        setUsername(remembered);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage access errors in restricted browser modes.
    }
  }, [isMounted]);

  useEffect(() => {
    if (
      !TURNSTILE_ENABLED ||
      !isMounted ||
      !turnstileScriptReady ||
      !turnstileContainerRef.current ||
      !window.turnstile ||
      turnstileWidgetIdRef.current
    ) {
      return;
    }

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "auto",
      callback: (token) => {
        setTurnstileToken(token);
        setError("");
      },
      "expired-callback": () => {
        setTurnstileToken("");
      },
      "error-callback": () => {
        setTurnstileToken("");
        setError("Security check failed to load. Please refresh and try again.");
      },
    });

    return () => {
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
      turnstileWidgetIdRef.current = null;
    };
  }, [isMounted, turnstileScriptReady]);

  // Development-only session diagnostics, kept free of cookie values.
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const submitGuardRef = useRef(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;

    setError("");
    setSuccess("");
    setDebugInfo(null);
    setLoading(true);


    try {
      const trimmedUsername = username.trim();
      if (TURNSTILE_ENABLED && !turnstileToken) {
        throw new Error("Security check required. Please try again.");
      }
      
      // Step 1: Login
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: trimmedUsername, 
          password,
          ...(TURNSTILE_ENABLED ? { turnstileToken } : {}),
        }),
        credentials: "include",
      });

      const loginData = await loginRes.json();
      
      if (!loginRes.ok || !loginData.ok) {
        throw new Error(loginData.error || "Login failed");
      }

      setSuccess(translatePhrase("Login successful! Verifying session...", language));

      // Step 2: Verify session with retry logic
      let meData = null;
      let meRes = null;
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        meRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Accept": "application/json",
          },
        });
        
        meData = await meRes.json();
        
        if (meRes.ok && meData.ok) {
          break; // Success!
        }
        
        lastError = meData.error || `HTTP ${meRes.status}`;
        if (SHOW_LOGIN_DEBUG) {
          console.warn(`[LOGIN] Session check attempt ${4 - retries} failed:`, lastError);
        }
        retries--;
      }
      
      if (retries === 0 && (!meRes?.ok || !meData?.ok)) {
        if (SHOW_LOGIN_DEBUG) {
          const debug = {
            userAgent: navigator.userAgent,
            loginStatus: loginRes.status,
            meStatus: meRes?.status,
            meOk: Boolean(meData?.ok),
            lastError,
            timestamp: new Date().toISOString(),
          };
          setDebugInfo(JSON.stringify(debug, null, 2));
        }
        throw new Error(`Session verification failed: ${lastError}`);
      }

      // Save username if remember me is checked (client-side only)
      if (isMounted) {
        try {
          if (rememberMe) {
            localStorage.setItem("ec_remember_username", trimmedUsername);
          } else {
            localStorage.removeItem("ec_remember_username");
          }
        } catch {
          // Ignore storage errors; login can continue without remember-me persistence.
        }
      }

      // Redirect to original destination when safe, otherwise app home.
      // Keep legacy /dashboard links working by mapping them to root.
      const requestedRedirect = searchParams.get("redirect");
      let rememberedRedirect: string | null = null;
      try {
        rememberedRedirect = window.sessionStorage.getItem(LAST_APP_LOCATION_KEY);
      } catch {
        // Continue with the URL redirect or app home when storage is unavailable.
      }
      const preferredRedirect = requestedRedirect || rememberedRedirect;
      const safeRedirect =
        preferredRedirect &&
        preferredRedirect.startsWith("/") &&
        !preferredRedirect.startsWith("//") &&
        !preferredRedirect.startsWith("/login")
          ? preferredRedirect
          : "/";

      // Default post-login destination must be the ERP Home hub.
      // Keep legacy "/dashboard" working by mapping it to "/".
      const redirectTo =
        safeRedirect === "/dashboard" ? "/" : safeRedirect;

      router.replace(redirectTo);
    } catch (err) {
      submitGuardRef.current = false;
      if (TURNSTILE_ENABLED) {
        setTurnstileToken("");
        window.turnstile?.reset(turnstileWidgetIdRef.current ?? undefined);
      }
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
      submitGuardRef.current = false;
    }
  

  }


  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),transparent_36%,rgba(37,99,235,0.06))] dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.12),transparent_42%,rgba(59,130,246,0.08))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent dark:via-emerald-500/40" />
      
      <div className="w-full max-w-[400px] relative z-10">
        {/* Glassmorphism Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-[0_18px_70px_rgba(2,6,23,0.55)]">
          
          {/* Header - Emerald Gradient */}
          <div className="relative h-32 bg-gradient-to-br from-emerald-500 to-emerald-600 overflow-visible">
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
            
            {/* Logo */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-lg shadow-emerald-500/25 flex items-center justify-center p-2 ring-4 ring-white/60 dark:bg-white dark:ring-slate-800/80">
                <Image
                  src="/logo.png"
                  alt={brandName}
                  width={64}
                  height={64}
                  priority
                  sizes="64px"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-10 pb-6 px-6">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-slate-950 dark:text-white">
                {brandName}
              </h1>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.vehicleManagementSystem}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label htmlFor={usernameInputId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.usernameLabel}
                </label>
                <input
                  id={usernameInputId}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={warmConnection}
                  placeholder={t.enterUsername}
                  autoComplete="username"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 shadow-sm backdrop-blur-sm transition-all placeholder:text-slate-400 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400/70 dark:focus:ring-emerald-400/20"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor={passwordInputId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <input
                    id={passwordInputId}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={warmConnection}
                    placeholder={t.enterPassword}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 pr-12 text-slate-900 shadow-sm backdrop-blur-sm transition-all placeholder:text-slate-400 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400/70 dark:focus:ring-emerald-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
                    aria-controls={passwordInputId}
                    {...(showPassword ? { "aria-pressed": "true" as const } : { "aria-pressed": "false" as const })}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* t.rememberMe */}
              <label htmlFor={rememberInputId} className="flex items-center gap-2 cursor-pointer">
                <input
                  id={rememberInputId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-800"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">{t.rememberMe}</span>
              </label>

              {TURNSTILE_ENABLED && (
                <>
                  <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                    strategy="afterInteractive"
                    onReady={() => setTurnstileScriptReady(true)}
                    onError={() => setError("Security check failed to load. Please refresh and try again.")}
                  />
                  <div
                    ref={turnstileContainerRef}
                    className="flex min-h-[70px] items-center justify-center"
                  />
                </>
              )}

              {/* Success message */}
              {success && (
                <div role="status" aria-live="polite" className="rounded-xl border border-emerald-200/70 bg-emerald-50/90 p-3 text-center text-sm text-emerald-700 backdrop-blur-sm dark:border-emerald-800/70 dark:bg-emerald-900/25 dark:text-emerald-300">
                  {success}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div role="alert" className="rounded-xl border border-red-200/70 bg-red-50/90 p-3 text-center text-sm text-red-700 backdrop-blur-sm dark:border-red-800/70 dark:bg-red-900/25 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Debug info for troubleshooting */}
              {debugInfo && (
                <div className="mt-4">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                      Debug Info (tap to expand)
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-slate-600 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                      {debugInfo}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(debugInfo);
                          alert("Debug info copied to clipboard!");
                        } else {
                          alert("Clipboard API is not available in this browser.");
                        }
                      }}
                      className="mt-2 text-xs text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      Copy to clipboard
                    </button>
                  </details>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (TURNSTILE_ENABLED && !turnstileToken)}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t.signingIn : t.signIn}
              </button>
            </form>

            {/* Footer */}
            <footer className="mt-6 flex items-center justify-center border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-xs text-slate-400 dark:text-slate-500">{copyrightText}</p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  const { language } = useLanguage();
  const preparingLoginText = translatePhrase("Preparing login...", language);

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-[400px]">
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-lg p-8">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{preparingLoginText}</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
