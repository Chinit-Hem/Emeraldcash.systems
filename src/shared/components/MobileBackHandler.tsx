"use client";

import { Capacitor } from "@capacitor/core";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { dispatchMobileBackRequest } from "@/shared/utils/mobileBack";

type MobileBackHandlerProps = {
  isMenuOpen: boolean;
  onCloseMenu: () => void;
  homeHref?: string;
};

const ROUTE_STACK_KEY = "emeraldcash.mobile.routeStack";
const MAX_ROUTE_STACK_SIZE = 40;

function getRouteHref(pathname: string | null, searchParams: URLSearchParams | null) {
  const path = pathname || "/";
  const query = searchParams?.toString();
  return query ? `${path}?${query}` : path;
}

function readRouteStack(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(ROUTE_STACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && value.startsWith("/"))
      : [];
  } catch {
    return [];
  }
}

function writeRouteStack(stack: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify(stack.slice(-MAX_ROUTE_STACK_SIZE)));
  } catch {
    // Session storage can be unavailable in some embedded/mobile modes.
  }
}

function isAppRoot(href: string, homeHref: string) {
  const path = href.split("?")[0] || "/";
  return path === homeHref || path === "/dashboard";
}

export default function MobileBackHandler({
  isMenuOpen,
  onCloseMenu,
  homeHref = "/",
}: MobileBackHandlerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = useMemo(
    () => getRouteHref(pathname, searchParams),
    [pathname, searchParams]
  );
  const skipNextRecordRef = useRef(false);

  useEffect(() => {
    if (skipNextRecordRef.current) {
      skipNextRecordRef.current = false;
      return;
    }

    const stack = readRouteStack();
    const lastHref = stack.at(-1);
    if (lastHref === currentHref) return;

    writeRouteStack([...stack, currentHref]);
  }, [currentHref]);

  const goBackInsideApp = useCallback(() => {
    if (isMenuOpen) {
      onCloseMenu();
      return;
    }

    if (dispatchMobileBackRequest()) {
      return;
    }

    const stack = readRouteStack();
    const normalizedStack = stack.at(-1) === currentHref ? stack : [...stack, currentHref];
    const previousStack = normalizedStack.slice(0, -1);
    const previousHref = previousStack.at(-1);

    if (previousHref && previousHref !== currentHref) {
      writeRouteStack(previousStack);
      skipNextRecordRef.current = true;
      router.push(previousHref);
      return;
    }

    if (!isAppRoot(currentHref, homeHref)) {
      writeRouteStack([homeHref]);
      skipNextRecordRef.current = true;
      router.push(homeHref);
      return;
    }

    writeRouteStack([homeHref]);
  }, [currentHref, homeHref, isMenuOpen, onCloseMenu, router]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let removeListener: (() => void) | null = null;

    import("@capacitor/app")
      .then(async ({ App }) => {
        const handle = await App.addListener("backButton", () => {
          goBackInsideApp();
        });

        if (cancelled) {
          void handle.remove();
          return;
        }

        removeListener = () => {
          void handle.remove();
        };
      })
      .catch(() => {
        // Web/PWA builds continue to use the browser's normal history behavior.
      });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [goBackInsideApp]);

  return null;
}
