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
