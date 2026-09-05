"use client";

import type { User } from "@/shared/types/types";
import type { ReactNode } from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { syncCachedUser } from "@/shared/utils/authCache";

interface AuthContextType {
  user: User | null;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthUserContext = createContext<AuthContextType | null>(null);

// Safe default user to prevent crashes
const DEFAULT_USER: User = {
  username: "Guest",
  role: "Staff",
};

export function AuthUserProvider({ user: initialUser, children }: { user: User; children: ReactNode }) {
  const [user, setUser] = useState<User>(initialUser);

  // AppShell may replace its cached user after the background session check.
  // Keep page-level permission checks in sync with the refreshed role.
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const updateProfile = useCallback(async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user?.username,
          ...data,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        return { success: false, error: result.error || "Failed to update profile" };
      }

      // Update local user state
      const nextUser = { ...user, ...result.user } as User;
      setUser(nextUser);
      syncCachedUser(nextUser);
      return { success: true };
    } catch (error) {
      console.error("[AuthContext] Error updating profile:", error);
      return { success: false, error: "Network error" };
    }
  }, [user?.username]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      const result = await response.json();
      
      if (result.ok && result.user) {
        setUser(result.user);
        syncCachedUser(result.user as User);
      }
    } catch (error) {
      console.error("[AuthContext] Error refreshing user:", error);
    }
  }, []);

  return (
    <AuthUserContext.Provider value={{ user, updateProfile, refreshUser }}>
      {children}
    </AuthUserContext.Provider>
  );
}

export function useAuthUser(): User {
  const context = useContext(AuthUserContext);
  // Return safe default instead of throwing to prevent app crashes
  if (!context) {
    console.warn("[AuthContext] useAuthUser called without provider, returning default user");
    return DEFAULT_USER;
  }
  return context.user || DEFAULT_USER;
}

export function useOptionalAuthUser(): User | null {
  const context = useContext(AuthUserContext);
  return context?.user || null;
}

export function useAuthStatus(): { isAuthenticated: boolean; user: User } {
  const context = useContext(AuthUserContext);
  return {
    isAuthenticated: !!context?.user,
    user: context?.user || DEFAULT_USER,
  };
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthUserContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthUserProvider");
  }
  return context;
}
