import type { User } from "@/shared/types/types";

let cachedUser: User | null = null;

export function getCachedUser(): User | null {
  return cachedUser;
}

export function setCachedUser(user: User | null): void {
  cachedUser = user;
}

export function clearCachedUser(): void {
  cachedUser = null;
}

