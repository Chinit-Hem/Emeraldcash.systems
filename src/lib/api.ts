import type { Vehicle, VehicleMeta } from "./types";
import { recordMutation } from "./vehicleCache";

import { globalLogger } from "./logger";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
const MAX_RETRIES = 3;
const _RETRY_DELAY_MS = 1000;
// Client-side request timeout should be slightly higher than server-side handler timeout
const REQUEST_TIMEOUT_MS = 65000; // 65 seconds for apiRequest (for POST/PUT/DELETE)
const FETCH_TIMEOUT_MS = 35000; // 35 seconds for fetchJSON (for GET requests)

// Auth configuration - support both Bearer header and query token
const USE_QUERY_TOKEN = process.env.NEXT_PUBLIC_USE_QUERY_TOKEN === "true";

// Global flag to prevent multiple simultaneous redirects
let isRedirecting = false;
let redirectTimeout: NodeJS.Timeout | null = null;


// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

// Helper to check if API URL is valid (not local IP, proper HTTPS)
export function validateApiUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: "API URL is not configured" };
  }

  // Check for local IP addresses (common mistake)
  if (url.includes("192.168.") || url.includes("10.0.") || url.includes("127.0.") || url.includes("localhost")) {
    return {
      valid: false,
      error: "API URL points to a local address. Please use a public HTTPS endpoint for production."
    };
  }

  // Check for HTTPS in production
  if (process.env.NODE_ENV === "production" && url.startsWith("http://")) {
    return {
      valid: false,
      error: "API URL must use HTTPS in production"
    };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: "API URL is not a valid URL" };
  }
}

function resolveRequestUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  if (endpoint.startsWith("/api/")) {
    return endpoint;
  }

  // Direct Apps Script calls still require NEXT_PUBLIC_API_URL.
  if (!API_BASE_URL) {
    throw new ConfigError(
      "API URL not configured. Please set NEXT_PUBLIC_API_URL environment variable.\n\n" +
      "For local development: Add to .env.local\n" +
      "For Vercel: Add to Project Settings > Environment Variables"
    );
  }

  const urlValidation = validateApiUrl(API_BASE_URL);
  if (!urlValidation.valid) {
    throw new ConfigError(urlValidation.error || "Invalid API URL configuration");
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
}


// Robust fetch wrapper with timeout and error handling
export async function fetchJSON<T = unknown>(

  url: string,
  options: RequestInit = {}
): Promise<T> {
  const fullUrl = resolveRequestUrl(url);
  let requestUrl = fullUrl;


  // Get auth token
  const token = getAuthToken();

  // Add token to query param if configured (for Apps Script compatibility)
  if (USE_QUERY_TOKEN && token && !requestUrl.startsWith("/")) {
    const urlObj = new URL(requestUrl);
    urlObj.searchParams.set("token", token);
    requestUrl = urlObj.toString();
  }

  if (process.env.NODE_ENV === 'development') {
    globalLogger.debug("fetchJSON request", { url: requestUrl, method: options.method });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Prepare headers with auth // This is a loop.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers as Record<string, string>,
    };

    // Add Bearer token to Authorization header (if not using query token)
    if (token && !USE_QUERY_TOKEN) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(requestUrl, {
      ...options,
      signal: controller.signal,
      credentials: "include", // CRITICAL: Required for cookies to be sent
      headers,
    });


    clearTimeout(timeoutId);

    // Get response text first for logging and error handling
    const responseText = await response.text();

    if (process.env.NODE_ENV === 'development') {
      globalLogger.debug("fetchJSON response", { url: requestUrl, status: response.status, responseText: responseText.substring(0, 500) });
    }

    // Handle authentication errors
    if (response.status === 401) {
      // Prevent infinite redirect loops - check if we're already on login page
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath === '/login') {
          throw new ApiError(
            "Authentication required. Please log in.",
            401,
            "AUTH_REQUIRED"
          );
        }

        // Prevent multiple simultaneous redirects
        if (isRedirecting) {
          throw new ApiError(
            "Authentication required. Redirecting to login...",
            401,
            "AUTH_REQUIRED"
          );
        }

        isRedirecting = true;

        // Clear any stored auth state and redirect to login (once)
        localStorage.removeItem("auth_token");
        const redirectUrl = '/login?redirect=' + encodeURIComponent(currentPath);
        window.location.replace(redirectUrl);

        // Reset flag after delay (in case redirect fails)
        if (redirectTimeout) clearTimeout(redirectTimeout);
        redirectTimeout = setTimeout(() => {
          isRedirecting = false;
        }, 5000);
      }

      throw new ApiError(
        "Your session has expired. Please log in again.",
        401,
        "AUTH_REQUIRED"
      );
    }



    // Handle other HTTP errors with user-friendly messages
    if (response.status === 403) {
      throw new ApiError(
        "You don't have permission to access this resource.",
        403,
        "FORBIDDEN"
      );
    }
    if (response.status === 404) {
      throw new ApiError(
        "The requested resource was not found.",
        404,
        "NOT_FOUND"
      );
    }
    if (response.status === 504) {
      throw new ApiError(
        "The server took too long to respond. This usually happens when the database is processing a large query. Please try again or refresh the page.",
        504,
        "GATEWAY_TIMEOUT"
      );
    }
    if (response.status >= 500) {
      throw new ApiError(
        "The server encountered an error. Please try again later.",
        response.status,
        "SERVER_ERROR"
      );
    }

    // Handle non-OK responses
    if (!response.ok) {
      throw new ApiError(
        `Request failed: ${response.statusText || `HTTP ${response.status}`}`,
        response.status,
        "HTTP_ERROR"
      );
    }

    // Try to parse JSON response
    let data: T;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new ApiError(
        `Invalid JSON response from server. The API may be down or returning an error page.\n\n` +
        `Response preview: ${responseText.substring(0, 200)}`,
        response.status,
        "PARSE_ERROR"
      );
    }


    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError || error instanceof ConfigError || error instanceof NetworkError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError(
        `Request timed out after ${FETCH_TIMEOUT_MS/1000} seconds.\n\n` +
        `URL: ${requestUrl}\n` +
        `The server may be slow or processing a large dataset.\n\n` +
        `Suggestions:\n` +
        `• Try refreshing the page\n` +
        `• Check your internet connection\n` +
        `• The database may be under heavy load`
      );
    }

    if (error instanceof TypeError) {
      // More specific network error diagnostics with troubleshooting steps
      const isLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isNextJsApi = fullUrl.includes('/api/');

      let troubleshooting = `Possible causes:\n`;

      if (isNextJsApi && isLocalhost) {
        troubleshooting +=
          `• Next.js dev server is not running (run 'npm run dev')\n` +
          `• Port 3000 is already in use by another application\n` +
          `• Firewall is blocking localhost connections`;
      } else {
        troubleshooting +=
          `• API URL is incorrect or unreachable\n` +
          `• CORS policy blocking the request\n` +
          `• Network is offline\n` +
          `• Server is down`;
      }

      throw new NetworkError(
        `Network connection failed.\n\n` +
        `URL: ${requestUrl}\n` +
        `Error: ${error.message}\n\n` +
        troubleshooting + `\n\n` +
        `Troubleshooting steps:\n` +
        `1. Check if the server is running\n` +
        `2. Verify the API URL in .env.local\n` +
        `3. Check browser console for CORS errors\n` +
        `4. Try accessing the URL directly in browser`
      );
    }


    throw new NetworkError(
      `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
      `URL: ${requestUrl}\n\n` +
      `This may indicate:\n` +
      `• The server returned an unexpected response\n` +
      `• There's a network connectivity issue\n` +
      `• The API endpoint doesn't exist`
    );

  }

}


// Request wrapper with retries and error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> {
  const url = resolveRequestUrl(endpoint);
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      // Use longer timeout for vehicle endpoints that may have large datasets
      const isVehicleEndpoint = endpoint.includes('/vehicles');
      const timeoutMs = isVehicleEndpoint ? REQUEST_TIMEOUT_MS : 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: "include", // CRITICAL: Required for cookies to be sent
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });


      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 401) {
          // Prevent infinite loops - don't retry on 401
          throw new ApiError("Authentication required", 401, "AUTH_REQUIRED");
        }

        if (response.status === 403) {
          throw new ApiError("Access forbidden", 403, "FORBIDDEN");
        }
        if (response.status === 404) {
          throw new ApiError("Resource not found", 404, "NOT_FOUND");
        }
        if (response.status >= 500) {
          throw new ApiError("Server error", response.status, "SERVER_ERROR");
        }

        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore JSON parse errors
        }

        throw new ApiError(errorMessage, response.status);
      }

      const data = await response.json();

      // Check for API-level errors
      if (data.ok === false) {
        throw new ApiError(
          data.error || "API request failed",
          response.status,
          data.code
        );
      }

      return data.data || data;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isLastAttempt = attempt === retries;
      const isRetryableError =
        lastError instanceof NetworkError ||
        (lastError instanceof ApiError && (lastError.status >= 500 || lastError.status === 504)) ||
        lastError.name === "AbortError" ||
        lastError.message.includes("fetch") ||
        lastError.message.includes("timeout") ||
        lastError.message.includes("Gateway timeout");

      if (isLastAttempt || !isRetryableError) {
        if (lastError instanceof ApiError) {
          throw lastError;
        }
        throw new NetworkError(lastError.message || "Network request failed");
      }

      // Exponential backoff with jitter for timeout errors
      // Use longer delays for timeout errors to give server time to recover
      const isTimeoutError =
        lastError instanceof NetworkError ||
        lastError.message.includes("timeout") ||
        lastError.message.includes("Gateway timeout") ||
        (error instanceof ApiError && error.status === 504);

      const baseDelay = isTimeoutError ? 2000 : 1000;
      const delayMs = Math.min(baseDelay * Math.pow(2, attempt - 1), 8000) + Math.random() * 500;
      // Retry logging removed for production
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } // Use globalLogger here

    globalLogger.warn(`API request failed, retrying (${attempt + 1}/${retries})`, { endpoint, error: lastError?.message });
  }

  throw new NetworkError("Request failed after all retries");
}

// Vehicle API functions

export interface VehicleFilters {
  search?: string;
  category?: string;
  brand?: string;
  model?: string;
  condition?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  color?: string;
  bodyType?: string;
  taxType?: string;
  dateFrom?: string;
  dateTo?: string;
  withoutImage?: boolean;
}

type GetVehiclesOptions = {
  lite?: boolean;
  maxRows?: number;
  filters?: VehicleFilters;
};

export const vehicleApi = {
  // Get all vehicles with robust error handling
  async getVehicles(
    noCache = false,
    options: GetVehiclesOptions = {}
  ): Promise<{ data: Vehicle[]; meta?: VehicleMeta }> {
    const params = new URLSearchParams();
    if (noCache) params.set("noCache", "1");
    if (options.lite) params.set("lite", "1");
    // Add maxRows/limit parameter if provided
    if (options.maxRows && Number.isFinite(options.maxRows) && options.maxRows > 0) {
      params.set("limit", String(Math.trunc(options.maxRows)));
    }

    // Add filter parameters if provided
    if (options.filters) {
      const { filters } = options;

      // Search term
      if (filters.search?.trim()) {
        params.set("searchTerm", filters.search.trim());
      }

      // Category filter
      if (filters.category && filters.category !== "All") {
        params.set("category", filters.category);
      }

      // Brand filter
      if (filters.brand && filters.brand !== "All") {
        params.set("brand", filters.brand);
      }

      // Model filter
      if (filters.model?.trim()) {
        params.set("model", filters.model.trim());
      }

      // Condition filter
      if (filters.condition && filters.condition !== "All") {
        params.set("condition", filters.condition);
      }

      // Year range
      if (filters.yearMin !== undefined && filters.yearMin !== null) {
        params.set("yearMin", String(filters.yearMin));
      }
      if (filters.yearMax !== undefined && filters.yearMax !== null) {
        params.set("yearMax", String(filters.yearMax));
      }

      // Price range
      if (filters.priceMin !== undefined && filters.priceMin !== null) {
        params.set("priceMin", String(filters.priceMin));
      }
      if (filters.priceMax !== undefined && filters.priceMax !== null) {
        params.set("priceMax", String(filters.priceMax));
      }

      // Color filter
      if (filters.color && filters.color !== "All") {
        params.set("color", filters.color);
      }

      // Body type filter
      if (filters.bodyType?.trim()) {
        params.set("bodyType", filters.bodyType.trim());
      }

      // Tax type filter
      if (filters.taxType?.trim()) {
        params.set("taxType", filters.taxType.trim());
      }

      // Date range
      if (filters.dateFrom?.trim()) {
        params.set("dateFrom", filters.dateFrom.trim());
      }
      if (filters.dateTo?.trim()) {
        params.set("dateTo", filters.dateTo.trim());
      }

      // Without image filter
      if (filters.withoutImage) {
        params.set("withoutImage", "1");
      }

      // When filters are active and no explicit maxRows, increase limit to get all matching results
      if (!options.maxRows && Object.keys(filters).length > 0) {
        params.set("limit", "10000");
      }
    }

    const endpoint = `/api/vehicles?${params.toString()}`;

    if (process.env.NODE_ENV === 'development') {
      globalLogger.debug("getVehicles API call", { endpoint });
    }

    try {
      const response = await fetchJSON<{ ok: boolean; data: Vehicle[]; meta?: VehicleMeta; error?: string }>(endpoint);


      // Handle API response format
      if (response.ok === false) {
        throw new ApiError(response.error || "Failed to fetch vehicles", 500, "API_ERROR");
      }

      // Normalize response shape - support both formats:
      // a) { data: Vehicle[], meta?: {...} }
      // b) Vehicle[]
      if (Array.isArray(response)) {
        // Direct array response: Vehicle[]
        return { data: response, meta: undefined };
      } else if (response.data && Array.isArray(response.data)) {
        // { data, meta } format
        return { data: response.data, meta: response.meta };
      } else if (response.data === undefined && Array.isArray((response as unknown as { vehicles?: Vehicle[]; meta?: VehicleMeta }).vehicles)) {
        // Alternative: { vehicles: [...] } format
        return { data: (response as unknown as { vehicles: Vehicle[] }).vehicles, meta: (response as unknown as { meta?: VehicleMeta }).meta };
      } else {
        // Unexpected format - throw error
        throw new ApiError(
          "Unexpected API response format. Expected { data: Vehicle[] } or Vehicle[].",
          500,
          "FORMAT_ERROR"
        );
      }
    } catch (error) {
      // Re-throw with additional context
      if (error instanceof ConfigError) {
        throw error;
      }
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new ApiError(
        `Failed to fetch vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        "FETCH_ERROR"
      );
    }
  },



  // Get single vehicle by ID
  async getVehicle(id: string): Promise<Vehicle> {
    // Use fetchJSON for proper credential handling
    const response = await fetchJSON<{ ok: boolean; data: Vehicle; error?: string }>(
      `/api/vehicles/${encodeURIComponent(id)}`
    );

    if (response.ok === false) {
      throw new ApiError(response.error || "Failed to fetch vehicle", 500, "API_ERROR");
    }

    return response.data;
  },


  // Add new vehicle
  async addVehicle(vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    const result = await apiRequest<Vehicle>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(vehicleData),
    });
    // Record mutation to invalidate client-side cache
    recordMutation();
    return result;
  },

  // Update vehicle
  async updateVehicle(id: string, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    try {
      const result = await apiRequest<Vehicle>(`/api/vehicles/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(vehicleData),
      });
      console.log('[api.updateVehicle] SUCCESS - recording mutation');
      // Record mutation to invalidate client-side cache
      recordMutation();
      return result;
    } catch (error) {
      console.error('[api.updateVehicle] FAILED:', {
        id,
        image_id: (vehicleData as Partial<Vehicle> & { image_id?: string | null }).image_id || vehicleData.Image,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  // Delete vehicle
  async deleteVehicle(id: string): Promise<void> {
    await apiRequest<void>(`/api/vehicles?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    // Record mutation to invalidate client-side cache
    recordMutation();
  },

  // Clear cache
  async clearCache(): Promise<void> {
    return apiRequest<void>("/api/vehicles-cache", {
      method: "POST",
    });
  },
};

// Market price API
export const marketPriceApi = {
  async fetchPrices(): Promise<unknown> {
    return apiRequest("/api/market-price/fetch", {
      method: "POST",
    });
  },

  async updatePrices(data: unknown): Promise<unknown> {
    return apiRequest("/api/market-price/update", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Health check
export const healthApi = {
  async check(): Promise<{ status: string; timestamp: string }> {
    return apiRequest("/api/health");
  },
};

// Utility functions
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isConfigError(error: unknown): error is ConfigError {
  return error instanceof ConfigError;
}

export function getErrorMessage(error: unknown): string {
  if (isConfigError(error)) {
    return error.message;
  }
  if (isApiError(error)) {
    return error.message;
  }
  if (isNetworkError(error)) {
    return "Network connection error. Please check your internet connection.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

// Get detailed error info for debugging
export function getErrorDetails(error: unknown): {
  message: string;
  code?: string;
  status?: number;
  type: "config" | "api" | "network" | "unknown";
} {
  // This function is used for debugging - marking as used
  void error;

  if (isConfigError(error)) {
    return { message: error.message, type: "config" };
  }
  if (isApiError(error)) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      type: "api"
    };
  }
  if (isNetworkError(error)) {
    return { message: error.message, type: "network" };
  }
  if (error instanceof Error) {
    return { message: error.message, type: "unknown" };
  }
  return { message: "An unexpected error occurred", type: "unknown" };
}


// Apps Script URL validation
export function validateAppsScriptUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "script.google.com" &&
           parsed.pathname.includes("/exec");
  } catch {
    return false;
  }
}

export function getAppsScriptUrl(action: string, params: Record<string, string> = {}): string {
  if (!API_BASE_URL) {
    throw new ApiError("API URL not configured", 500, "CONFIG_ERROR");
  }

  const url = new URL(API_BASE_URL);
  url.searchParams.set("action", action);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
