import type { User } from "@/shared/types/types";

let cachedUser: User | null = null;
export const AUTH_USER_SYNC_EVENT = "emerald-cash:auth-user-sync";

export function getCachedUser(): User | null {
  return cachedUser;
}

export function setCachedUser(user: User | null): void {
  cachedUser = user;
}

export function clearCachedUser(): void {
  cachedUser = null;
  // The login form has no branch context. Reset a previous Sen Sok session so
  // the shared sign-in screen always keeps the Emerald Cash identity.
  if (typeof document !== "undefined") document.documentElement.removeAttribute("data-brand");
}

export function syncCachedUser(user: User): void {
  cachedUser = user;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<User>(AUTH_USER_SYNC_EVENT, { detail: user }));
  }
}
