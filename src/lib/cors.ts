import { NextRequest } from "next/server";

function isPrivateDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "::1" || hostname === "[::1]") {
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
  } catch {
    return false;
  }
}

/**
 * Builds CORS headers for cross-origin requests.
 * This utility is shared between API routes and middleware.
 */
export function buildCorsHeaders(req: NextRequest): Headers {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  const vercelOrigin = vercelUrl
    ? vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`
    : "";
  const requestOrigin = req.headers.get("origin")?.trim().replace(/\/+$/, "") || "";
  const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [];
  const allowedOrigins = new Set(
    [appOrigin, vercelOrigin, ...trustedOrigins]
      .map((origin) => origin?.trim().replace(/\/+$/, ""))
      .filter((origin): origin is string => Boolean(origin))
  );

  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://127.0.0.1:3000");
    const devLanIp = process.env.DEV_LAN_IP?.trim();
    if (devLanIp) {
      allowedOrigins.add(`http://${devLanIp}:3000`);
    }
  }

  const allowedOrigin =
    requestOrigin &&
    (allowedOrigins.has(requestOrigin) ||
      (process.env.NODE_ENV !== "production" && isPrivateDevelopmentOrigin(requestOrigin)))
      ? requestOrigin
      : appOrigin || vercelOrigin || "";

  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });

  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}
