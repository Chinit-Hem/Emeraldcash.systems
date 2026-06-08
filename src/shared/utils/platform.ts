export function isIOSSafariBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  // Fast path: class is set very early in src/app/layout.tsx.
  if (document.documentElement.classList.contains("ios-safari")) return true;

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isIOSDevice =
    /iP(hone|ad|od)/i.test(ua) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  // iOS browsers share WebKit under the hood, and all of them need the same
  // rendering safeguards to prevent tab crashes on heavy UI.
  const isIOSWebKit = /AppleWebKit|WebKit/i.test(ua);

  return isIOSDevice && isIOSWebKit;
}

export function isCapacitorNativeApp(): boolean {
  if (typeof window === "undefined") return false;

  const capacitor = (window as Window & {
    Capacitor?: {
      getPlatform?: () => string;
      isNativePlatform?: () => boolean;
    };
  }).Capacitor;

  if (!capacitor) return false;

  if (typeof capacitor.isNativePlatform === "function") {
    return capacitor.isNativePlatform();
  }

  const platform = capacitor.getPlatform?.();
  return platform === "android" || platform === "ios";
}

export function isStandaloneAppDisplay(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  if (isCapacitorNativeApp()) return true;

  if (document.documentElement.classList.contains("pwa-standalone")) return true;

  const mediaQueries = [
    "(display-mode: standalone)",
    "(display-mode: fullscreen)",
    "(display-mode: minimal-ui)",
  ];

  if (mediaQueries.some((query) => window.matchMedia(query).matches)) return true;

  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  if (iosNavigator.standalone === true) return true;

  return document.referrer.startsWith("android-app://");
}
