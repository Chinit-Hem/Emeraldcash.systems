import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter, Kantumruy_Pro } from "next/font/google";
import { Suspense } from "react";
import "../styles/globals.css";
import { ThemeProvider } from "@/shared/hooks/theme-provider";
import { LanguageProvider } from "@/shared/hooks/LanguageContext";
import { NeuDashboardSkeleton } from "@/shared/components/skeletons/NeuDashboardSkeleton";
import PwaLifecycle from "@/shared/components/PwaLifecycle";

const inter = Inter({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-inter",
});

const kantumruyPro = Kantumruy_Pro({
  subsets: ["khmer", "latin"],
  weight: ["300", "400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-kantumruy-pro",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_APP_ORIGIN ||
  "http://localhost:3000";

const themeInitScript = `
  (function () {
    try {
      var modeKey = "vms.theme-mode";
      var legacyKeys = ["theme", "vms.theme"];
      var colors = { light: "#ecfdf5", dark: "#020617" };
      var mode = localStorage.getItem(modeKey);

      if (mode !== "light" && mode !== "dark") {
        for (var i = 0; i < legacyKeys.length; i++) {
          var legacy = localStorage.getItem(legacyKeys[i]);
          if (legacy === "light" || legacy === "dark") {
            mode = legacy;
            break;
          }
        }
      }

      if (mode !== "light" && mode !== "dark") mode = "light";
      var root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mode);
      root.dataset.theme = mode;
      root.dataset.themeMode = mode;

      root.style.colorScheme = mode;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", colors[mode]);
    } catch (_) {}
  })();
`;

const iosSafariGuardScript = `
  (function () {
    try {
      var ua = navigator.userAgent || "";
      var platform = navigator.platform || "";
      var maxTouchPoints = navigator.maxTouchPoints || 0;

      var isIOSDevice =
        /iP(hone|ad|od)/.test(ua) ||
        (platform === "MacIntel" && maxTouchPoints > 1);

      var isWebKitEngine = /AppleWebKit|WebKit/i.test(ua);
      if (!isIOSDevice || !isWebKitEngine) return;

      document.documentElement.classList.add("ios-safari");
    } catch (_) {}
  })();
`;

const languageInitScript = `
  (function () {
    try {
      var lang = localStorage.getItem("vms.language");
      if (lang !== "km" && lang !== "en") lang = "en";
      document.documentElement.lang = lang;
      document.documentElement.dir = "ltr";
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "Emerald Cash Systems",
  title: {
    default: "Emerald Cash Systems",
    template: "%s | Emerald Cash Systems",
  },
  description:
    "Vehicle inventory, stock management, and staff training tools for Emerald Cash operations.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Emerald Cash",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: "Emerald Cash Systems",
    title: "Emerald Cash Systems",
    description:
      "Vehicle inventory, stock management, and staff training tools for Emerald Cash operations.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Emerald Cash logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Emerald Cash Systems",
    description:
      "Vehicle inventory, stock management, and staff training tools for Emerald Cash operations.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// Separate viewport export for Next.js 14+
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#ecfdf5",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${kantumruyPro.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script id="ios-safari-guard" dangerouslySetInnerHTML={{ __html: iosSafariGuardScript }} />
        <script id="language-init" dangerouslySetInnerHTML={{ __html: languageInitScript }} />
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <PwaLifecycle />
        <Analytics />
        <SpeedInsights />
        <ThemeProvider>
          <LanguageProvider>
            <Suspense fallback={<NeuDashboardSkeleton />}>
              {children}
            </Suspense>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
