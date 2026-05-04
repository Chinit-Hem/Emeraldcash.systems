import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "../styles/globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/LanguageContext";
import { InstantNavigationProvider } from "@/app/components/InstantNavigationProvider";
import { NeuDashboardSkeleton } from "@/app/components/skeletons/NeuDashboardSkeleton";

const themeInitScript = `
  (function () {
    try {
      var modeKey = "vms.theme-mode";
      var legacyKeys = ["theme", "vms.theme"];
      var mode = localStorage.getItem(modeKey);

      if (mode !== "light" && mode !== "dark" && mode !== "system") {
        for (var i = 0; i < legacyKeys.length; i++) {
          var legacy = localStorage.getItem(legacyKeys[i]);
          if (legacy === "light" || legacy === "dark") {
            mode = legacy;
            break;
          }
        }
      }

      if (!mode) mode = "system";
      var isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var resolved = mode === "system" ? (isDark ? "dark" : "light") : mode;
      var root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.dataset.theme = resolved;
      root.dataset.themeMode = mode;
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

export const metadata: Metadata = {
  title: "Emerald Cash VMS",
  description: "Vehicle Management System by Emerald Cash",
  icons: {
    icon: "/favicon.ico",
  },
};

// Separate viewport export for Next.js 14+
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecfdf5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@300;400;700&display=swap"
        />
        <link
          id="kantumruy-font"
          href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        <noscript>
          <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@300;400;700&display=swap" rel="stylesheet" />
        </noscript>
        <script id="ios-safari-guard" dangerouslySetInnerHTML={{ __html: iosSafariGuardScript }} />
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <InstantNavigationProvider>
              <Suspense fallback={<NeuDashboardSkeleton />}>
                {children}
              </Suspense>
            </InstantNavigationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
