export type AppScrollSnapshot = {
  scrollX: number;
  scrollY: number;
};

const APP_SCROLL_CONTAINER_SELECTOR = '[data-app-scroll-container="true"]';
const APP_SHELL_SCROLL_STORAGE_PREFIX = "vms_scroll:";

export function getAppScrollContainer() {
  if (typeof document === "undefined") return null;

  return document.querySelector<HTMLElement>(APP_SCROLL_CONTAINER_SELECTOR);
}

export function getAppScrollSnapshot(): AppScrollSnapshot {
  const container = getAppScrollContainer();

  if (container) {
    return {
      scrollX: container.scrollLeft,
      scrollY: container.scrollTop,
    };
  }

  if (typeof window === "undefined") {
    return { scrollX: 0, scrollY: 0 };
  }

  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

export function restoreAppScrollSnapshot(snapshot: AppScrollSnapshot) {
  const container = getAppScrollContainer();

  if (container) {
    container.scrollTo({
      left: snapshot.scrollX,
      top: snapshot.scrollY,
      behavior: "auto",
    });
    return;
  }

  if (typeof window !== "undefined") {
    window.scrollTo({
      left: snapshot.scrollX,
      top: snapshot.scrollY,
      behavior: "auto",
    });
  }
}

export function rememberAppScrollSnapshot(
  storageKey: string,
  snapshot: AppScrollSnapshot = getAppScrollSnapshot()
) {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // Ignore browser storage failures.
  }
}

export function getRememberedAppScrollSnapshot(storageKey: string) {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const rawSnapshot = sessionStorage.getItem(storageKey);
    if (!rawSnapshot) return null;

    const parsedSnapshot = JSON.parse(rawSnapshot) as Partial<AppScrollSnapshot>;
    const scrollX = Number(parsedSnapshot.scrollX);
    const scrollY = Number(parsedSnapshot.scrollY);

    if (!Number.isFinite(scrollX) || !Number.isFinite(scrollY)) {
      return null;
    }

    return { scrollX, scrollY };
  } catch {
    return null;
  }
}

export function getAppShellScrollStorageKey(pathWithQuery: string) {
  if (typeof window === "undefined") {
    return `${APP_SHELL_SCROLL_STORAGE_PREFIX}${pathWithQuery}:`;
  }

  const url = new URL(pathWithQuery, window.location.origin);

  return `${APP_SHELL_SCROLL_STORAGE_PREFIX}${url.pathname}:${url.search.slice(1)}`;
}

export function rememberAppShellRouteScrollPosition(
  pathWithQuery: string,
  snapshot: AppScrollSnapshot = getAppScrollSnapshot()
) {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(getAppShellScrollStorageKey(pathWithQuery), String(snapshot.scrollY));
  } catch {
    // Ignore browser storage failures.
  }
}
