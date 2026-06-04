"use client";

import { useEffect } from "react";

export default function PwaLifecycle() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations?.().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      }).catch(() => {
        // Ignore local development cleanup failures.
      });
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // The app remains fully usable without a service worker.
      });
    }, { once: true });
  }, []);

  return null;
}
