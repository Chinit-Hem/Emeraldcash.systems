import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = !isProduction;
const devLanIp = process.env.DEV_LAN_IP?.trim() || "192.168.0.68";

const devConnectSources = isDevelopment
  ? [
      "http://localhost:*",
      "http://127.0.0.1:*",
      "http://[::1]:*",
      `http://${devLanIp}:*`,
      "ws://localhost:*",
      "ws://127.0.0.1:*",
      "ws://[::1]:*",
      `ws://${devLanIp}:*`,
    ]
  : [];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "object-src 'none'",
  "form-action 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopment
      ? ["'unsafe-eval'", "https:", "blob:"]
      : [
          "https://vercel.live",
          "https://www.youtube.com",
          "https://s.ytimg.com",
          "https://challenges.cloudflare.com",
        ]),
  ].join(" "),
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "media-src 'self' data: blob: https:",
  [
    "connect-src",
    "'self'",
    "data:",
    "https://script.google.com",
    "https://script.googleusercontent.com",
    "https://*.googleapis.com",
    "https://*.googleusercontent.com",
    "https://api.cloudinary.com",
    "https://res.cloudinary.com",
    "https://www.youtube.com",
    "https://*.youtube.com",
    "https://*.youtube-nocookie.com",
    "https://*.googlevideo.com",
    "https://challenges.cloudflare.com",
    "https://vitals.vercel-insights.com",
    ...devConnectSources,
  ].join(" "),
  "frame-src 'self' https://vercel.live https://www.youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://*.youtube-nocookie.com https://challenges.cloudflare.com",
  "child-src 'self' https://vercel.live https://www.youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://*.youtube-nocookie.com https://challenges.cloudflare.com",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

const authSensitivePageHeaders = [
  { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate" },
  { key: "Pragma", value: "no-cache" },
  { key: "Vary", value: "Cookie, User-Agent" },
];

const apiNoStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, private" },
  { key: "Pragma", value: "no-cache" },
];

const publicAppAssetHeaders = [
  { key: "Cache-Control", value: "public, max-age=86400" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['@neondatabase/serverless'],
  generateEtags: true,
  poweredByHeader: false,
  devIndicators: false,

  // Build optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },

  // ⚡️ FIX: Allow HMR and cross-origin requests from your network IP
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "[::1]",
    "192.168.0.102",
    "http://192.168.0.102",
    "192.168.0.68",
    "192.168.0.117",
    "192.168.0.107",
    "http://192.168.0.107",
    "192.168.1.3",
    "http://192.168.1.3",
    "192.168.1.204",
    "http://192.168.1.204",
    "192.168.1.5",
    "192.168.1.100",
    "192.168.195.1",
    "192.168.1.7",
    devLanIp || ""
  ].filter(Boolean),

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', 
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/api/:path*",
        headers: apiNoStoreHeaders,
      },
      {
        source: "/manifest.webmanifest",
        headers: publicAppAssetHeaders,
      },
      {
        source: "/favicon.ico",
        headers: publicAppAssetHeaders,
      },
      {
        source: "/icon-192.png",
        headers: publicAppAssetHeaders,
      },
      {
        source: "/icon-512.png",
        headers: publicAppAssetHeaders,
      },
      {
        source: "/apple-touch-icon.png",
        headers: publicAppAssetHeaders,
      },
      {
        source: "/apple-touch-icon-precomposed.png",
        headers: publicAppAssetHeaders,
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/login",
        headers: authSensitivePageHeaders,
      },
      {
        source: "/dashboard",
        headers: authSensitivePageHeaders,
      },
      {
        source: "/",
        headers: authSensitivePageHeaders,
      },
      {
        source: "/vehicles/:path*",
        headers: authSensitivePageHeaders,
      },
      {
        source: "/settings/:path*",
        headers: authSensitivePageHeaders,
      },
    ];
  },

};

export default nextConfig;
