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
}

export function syncCachedUser(user: User): void {
  cachedUser = user;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<User>(AUTH_USER_SYNC_EVENT, { detail: user }));
  }
}
