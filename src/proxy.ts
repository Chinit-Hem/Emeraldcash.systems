import { NextRequest, NextResponse } from "next/server";

import {
  getClientIp,
  getClientUserAgent,
  getSessionFromRequestEdge,
  validateSessionEdge,
} from "@/lib/auth-edge";
import { globalLogger } from "@/lib/logger";
import { buildCorsHeaders } from "@/lib/cors";

const PUBLIC_PAGE_ROUTES = new Set(["/login"]);
const PUBLIC_API_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/ping",
]);

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const RATE_LIMIT_STATE_MAX_KEYS = 20_000;
const PUBLIC_FILE_REGEX =
  /\.(?:svg|png|jpe?g|gif|ico|webp|avif|css|js|map|txt|xml|html|woff2?|ttf|eot|otf|mp4|webm)$/i;

type RateLimitRule = {
  name: string;
  methods?: string[];
  paths?: string[];
  prefixes?: string[];
  limit: number;
  windowMs: number;
  blockMs: number;
};

type RateLimitEntry = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};

const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    name: "auth-login",
    methods: ["POST"],
    paths: ["/api/auth/login"],
    limit: 20,
    windowMs: 60 * 1000,
    blockMs: 5 * 60 * 1000,
  },
  {
    name: "auth-password",
    methods: ["POST"],
    paths: ["/api/auth/change-password"],
    limit: 10,
    windowMs: 60 * 1000,
    blockMs: 10 * 60 * 1000,
  },
  {
    name: "uploads",
    methods: ["POST"],
    paths: ["/api/auth/upload-avatar", "/api/cloudinary-signature", "/api/upload", "/api/loan/contact-image", "/api/loan/operation-report-image"],
    prefixes: ["/api/sms/assets/upload"],
    limit: 30,
    windowMs: 60 * 1000,
    blockMs: 5 * 60 * 1000,
  },
  {
    name: "api-general",
    prefixes: ["/api/"],
    limit: 300,
    windowMs: 60 * 1000,
    blockMs: 60 * 1000,
  },
];

const rateLimitState = new Map<string, RateLimitEntry>();

function isPublicAsset(pathname: string): boolean {
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/apple-touch-icon-precomposed.png" ||
    pathname === "/offline.html" ||
    pathname === "/sw.js" ||
    pathname === "/site.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest"
  ) {
    return true;
  }

  return PUBLIC_FILE_REGEX.test(pathname);
}

function isPublicApiRoute(pathname: string): boolean {
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return true;
    }
  }
  return false;
}

function getFirstHeaderValue(headers: Headers, name: string): string {
  return headers.get(name)?.split(",")[0]?.trim() ?? "";
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function isPrivateDevelopmentHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return true;
  }

  const ipv4Parts = hostname.split(".");
  if (ipv4Parts.length !== 4) return false;

  const octets = ipv4Parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function getConfiguredAllowedHosts(): Set<string> {
  return new Set(
    (process.env.ALLOWED_HOSTS?.split(",") ?? [])
      .map(normalizeHost)
      .filter(Boolean)
  );
}

function hasAllowedHost(request: NextRequest): boolean {
  if (!IS_PRODUCTION) return true;

  const allowedHosts = getConfiguredAllowedHosts();
  if (allowedHosts.size === 0) return true;

  const forwardedHost = getFirstHeaderValue(request.headers, "x-forwarded-host");
  const host = forwardedHost || getFirstHeaderValue(request.headers, "host");
  return allowedHosts.has(normalizeHost(host));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

function hasValidOriginSecret(request: NextRequest): boolean {
  if (!IS_PRODUCTION) return true;

  const expectedSecret = process.env.CLOUDFLARE_ORIGIN_SECRET?.trim();
  if (!expectedSecret) return true;

  const providedSecret =
    request.headers.get("x-origin-secret") ||
    request.headers.get("x-cloudflare-origin-secret") ||
    "";

  return timingSafeEqual(providedSecret, expectedSecret);
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  if (IS_PRODUCTION) return false;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    const devLanIp = process.env.DEV_LAN_IP?.trim();

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (isPrivateDevelopmentHostname(hostname) ||
        (devLanIp ? hostname === devLanIp : false))
    );
  } catch {
    return false;
  }
}

function getTrustedOrigins(request: NextRequest): Set<string> {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  const vercelOrigin = vercelUrl
    ? vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`
    : "";
  const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [];

  return new Set(
    [
      new URL(request.url).origin,
      appOrigin,
      vercelOrigin,
      ...trustedOrigins,
    ]
      .filter((origin): origin is string => Boolean(origin?.trim()))
      .map(normalizeOrigin)
  );
}

function hasTrustedMutationOrigin(request: NextRequest): boolean {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return !IS_PRODUCTION;

  const normalizedOrigin = normalizeOrigin(origin);
  return (
    getTrustedOrigins(request).has(normalizedOrigin) ||
    isLocalDevelopmentOrigin(normalizedOrigin)
  );
}

function matchesRateLimitRule(rule: RateLimitRule, request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  const pathname = request.nextUrl.pathname;

  if (rule.methods && !rule.methods.includes(method)) return false;
  if (rule.paths?.includes(pathname)) return true;
  return rule.prefixes?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}

function getRateLimitRule(request: NextRequest): RateLimitRule | null {
  return RATE_LIMIT_RULES.find((rule) => matchesRateLimitRule(rule, request)) ?? null;
}

function pruneRateLimitState(now = Date.now()): void {
  for (const [key, entry] of rateLimitState) {
    if (entry.blockedUntil <= now && now - entry.windowStart > 10 * 60 * 1000) {
      rateLimitState.delete(key);
    }
  }

  while (rateLimitState.size > RATE_LIMIT_STATE_MAX_KEYS) {
    const oldestKey = rateLimitState.keys().next().value as string | undefined;
    if (!oldestKey) break;
    rateLimitState.delete(oldestKey);
  }
}

function checkRateLimit(request: NextRequest): { limited: boolean; retryAfter?: number } {
  const rule = getRateLimitRule(request);
  if (!rule) return { limited: false };

  const now = Date.now();
  pruneRateLimitState(now);

  const clientIp = getClientIp(request.headers);
  const key = `${rule.name}:${clientIp}`;
  const current = rateLimitState.get(key);

  if (current?.blockedUntil && current.blockedUntil > now) {
    return {
      limited: true,
      retryAfter: Math.ceil((current.blockedUntil - now) / 1000),
    };
  }

  if (!current || now - current.windowStart >= rule.windowMs) {
    rateLimitState.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
    return { limited: false };
  }

  current.count += 1;
  if (current.count > rule.limit) {
    current.blockedUntil = now + rule.blockMs;
    return {
      limited: true,
      retryAfter: Math.ceil(rule.blockMs / 1000),
    };
  }

  return { limited: false };
}

function getSafeRedirectPath(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path === "/login" || path.startsWith("/login?")) return null;
  if (path === "/api/auth/login" || path.startsWith("/api/auth/login?")) return null;
  return path;
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return false;

  try {
    const session = await getSessionFromRequestEdge(sessionCookie);
    return Boolean(session && validateSessionEdge(session));
  } catch {
    return false;
  }
}

function hasSessionSecretConfigured(): boolean {
  return Boolean(process.env.SESSION_SECRET?.trim());
}

function isIosDevice(userAgent: string): boolean {
  return /\b(iPhone|iPad|iPod)\b/i.test(userAgent);
}

function getRequestId(request: NextRequest): string {
  const existingRequestId = request.headers.get("x-request-id");
  if (existingRequestId) return existingRequestId;

  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  const requestedPath = getSafeRedirectPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  // Prevent redirect loops: don't add redirect param if already coming from login
  const isComingFromLogin = request.headers.get("referer")?.includes("/login");
  const alreadyHasRedirect = request.nextUrl.searchParams.has("redirect");

  if (requestedPath && !isComingFromLogin && !alreadyHasRedirect) {
    loginUrl.searchParams.set("redirect", requestedPath);
  }

  const response = NextResponse.redirect(loginUrl, 302);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const requestId = getRequestId(request);

  try {
    const userAgent = getClientUserAgent(request.headers);

    if (!hasAllowedHost(request) || !hasValidOriginSecret(request)) {
      globalLogger.warn("Blocked request before origin checks", {
        pathname,
        requestId,
        ip: getClientIp(request.headers),
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Forbidden.",
          requestId,
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
            "X-Request-ID": requestId,
          },
        }
      );
    }

    // Allow CORS preflight to reach route handlers.
    if (request.method === "OPTIONS") {
      return NextResponse.next();
    }

    const routeRateLimit = checkRateLimit(request);
    if (routeRateLimit.limited) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many requests. Please try again later.",
          requestId,
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(routeRateLimit.retryAfter ?? 60),
            "X-Request-ID": requestId,
            ...Object.fromEntries(buildCorsHeaders(request)),
          },
        }
      );
    }

    // Reject cross-site state-changing API requests before any route handler runs.
    if (pathname.startsWith("/api/") && !hasTrustedMutationOrigin(request)) {
      globalLogger.warn("Blocked API request with untrusted origin", {
        pathname,
        requestId,
        ip: getClientIp(request.headers),
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Forbidden request origin.",
          requestId,
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
            "X-Request-ID": requestId,
            ...Object.fromEntries(buildCorsHeaders(request)),
          },
        }
      );
    }

    // ⚡️ PERF: Check public routes BEFORE expensive authentication logic
    if (isPublicAsset(pathname) || isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }

    // Prevent unstable session behavior in production when secret is missing.
    if (IS_PRODUCTION && !hasSessionSecretConfigured()) {
      globalLogger.error("SESSION_SECRET missing in production", new Error("Auth misconfiguration"), {
        pathname,
        requestId,
      });

      if (pathname.startsWith("/api/") && !isPublicApiRoute(pathname)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Server configuration error. Please contact support.",
            requestId,
          },
          { status: 500, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId, ...Object.fromEntries(buildCorsHeaders(request)) } }
        );
      }

      // Allow login page to render and recover, but avoid app route access.
      if (!PUBLIC_PAGE_ROUTES.has(pathname)) {
        return redirectToLogin(request);
      }
    }

    // Perform authentication check once
    // The authenticated check should be performed once and then used.
    const authenticated = await isAuthenticated(request);

    // If the path is public, no authentication is needed.
    if (isPublicAsset(pathname) || isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }
    // API routes: return JSON 401 instead of page redirects.
    if (pathname.startsWith("/api/")) {
      if (!authenticated) {
        globalLogger.warn("Unauthorized API access attempt", {
          pathname,
          requestId,
          ip: getClientIp(request.headers),
        });

        return NextResponse.json(
          {
            ok: false,
            error: "Unauthorized. Please log in.",
            requestId,
          },
          { status: 401, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId, ...Object.fromEntries(buildCorsHeaders(request)) } }
        );
      }

      // Add request ID to response for API routes
      const response = NextResponse.next();
      response.headers.set("X-Request-ID", requestId);
      return response;
    }

    // Login page is public, but authenticated users should not stay on it.
    if (PUBLIC_PAGE_ROUTES.has(pathname)) {
      if (!authenticated) return NextResponse.next();

      // Safari/iOS WebKit can loop on middleware-level redirects when session storage
      // is in a transient state. Let client-side auth flow navigate after /api/auth/me.
      if (isIosDevice(userAgent)) {
        return NextResponse.next();
      }

      const redirectParam = getSafeRedirectPath(
        request.nextUrl.searchParams.get("redirect")
      );
      const target = redirectParam || "/";
      const response = NextResponse.redirect(new URL(target, request.url), 302);
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("X-Request-ID", requestId);
      return response;
    }

    // All other app routes are protected.
    if (!authenticated) {
      return redirectToLogin(request);
    }

    // Add request ID to all responses
    const response = NextResponse.next();
    response.headers.set("X-Request-ID", requestId);
    return response;
  } catch (err) {
    // Global middleware error handler
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err : new Error(String(err));

    globalLogger.error("Middleware error", error, {
      pathname,
      requestId,
      durationMs: duration,
    });

    // Return appropriate error response based on route type
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: "An internal error occurred. Our team has been notified.",
          requestId,
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
            "X-Request-ID": requestId, ...Object.fromEntries(buildCorsHeaders(request))
          }
        }
      );
    }

    // For page routes, redirect to error page
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png|robots.txt|sitemap.xml|site.webmanifest|manifest.json|manifest.webmanifest|.*\\.(?:svg|png|jpe?g|gif|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf|eot|otf|mp4|webm)$).*)",
  ],
};
