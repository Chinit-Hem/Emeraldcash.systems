/**
 * Clear auth token from localStorage
 * (kept here to keep browser-only utilities out of server-only auth modules)
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}

