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
  "/api/auth/debug",
  "/api/health",
]);

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PUBLIC_FILE_REGEX =
  /\.(?:svg|png|jpe?g|gif|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf|eot|otf|mp4|webm)$/i;

function isPublicAsset(pathname: string): boolean {
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/apple-touch-icon-precomposed.png" ||
    pathname === "/site.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json"
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

function redirectToLogin(request: NextRequest): Response {
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

  // Use Web Response.redirect (Next.js 15 compatible) and avoid redirect caching.
  const response = Response.redirect(loginUrl, 302);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const userAgent = getClientUserAgent(request.headers);
  // Fallback for crypto.randomUUID on HTTP environments
  const requestId: string = request.headers.get("x-request-id") || crypto.randomUUID();

  try {
    // Allow CORS preflight to reach route handlers.
    if (request.method === "OPTIONS") {
      return NextResponse.next();
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
      const response = Response.redirect(new URL(target, request.url), 302);
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
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png|robots.txt|sitemap.xml|site.webmanifest|manifest.json|.*\\.(?:svg|png|jpe?g|gif|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf|eot|otf|mp4|webm)$).*)",
  ],
};
