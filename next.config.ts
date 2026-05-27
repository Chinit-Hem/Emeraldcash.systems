import type { NextConfig } from 'next';

const devLanIp = process.env.DEV_LAN_IP?.trim() || "192.168.0.68";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' data: https://script.google.com https://script.googleusercontent.com https://*.googleapis.com https://*.googleusercontent.com https://api.cloudinary.com https://www.youtube.com https://*.youtube.com https: ws: wss: *.localhost:* localhost:*", // 🚀 FIX: Enhanced HMR and websocket support
  "frame-src 'self' https://vercel.live https://www.youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://*.youtube-nocookie.com",
  "child-src 'self' https://vercel.live https://www.youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://*.youtube-nocookie.com",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const authSensitivePageHeaders = [
  { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate" },
  { key: "Pragma", value: "no-cache" },
  { key: "Vary", value: "Cookie, User-Agent" },
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

  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/vehicles/edge",
          destination: "/api/vehicles",
        },
        {
          source: "/api/vehicles/stats",
          destination: "/api/dashboard/stats",
        },
        {
          source: "/api/vehicles/create",
          destination: "/api/vehicles",
        },
        {
          source: "/api/vehicles/clear-cache",
          destination: "/api/vehicles-cache",
        },
      ],
    };
  },
};

export default nextConfig;
