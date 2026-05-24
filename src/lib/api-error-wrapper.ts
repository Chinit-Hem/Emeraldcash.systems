/**
 * API Error Wrapper - Higher-Order Function for Defensive API Route Handling
 *
 * Provides:
 * - Automatic try-catch for all API handlers
 * - Consistent error response format
 * - Request ID tracking
 * - Structured JSON logging
 * - Performance metrics (duration)
 * - User-friendly sanitized error messages
 * - Technical details in logs only
 *
 * Usage:
 * ```typescript
 * export const GET = withErrorHandling(async (req: NextRequest, { logger }) => {
 *   // Your handler logic here
 *   // Errors are automatically caught and logged
 * });
 * ```
 *
 * @module lib/api-error-wrapper
 */

import { NextRequest, NextResponse } from "next/server";
import { Logger, createRequestLogger } from "@/lib/logger";
import { buildCorsHeaders } from "@/lib/cors";

// Interface for handler context
export interface HandlerContext {
  logger: Logger;
  requestId: string;
  startTime: number;
}

// Handler function type
export type ApiHandler = (
  req: NextRequest,
  context: HandlerContext
) => Promise<NextResponse>;

// Error response structure
interface ErrorResponse {
  success: false;
  error: string;
  requestId: string;
  meta: {
    durationMs: number;
    timestamp: string;
  };
}

// Success response wrapper
interface SuccessResponse<T> {
  success: true;
  data: T;
  requestId: string;
  meta: {
    durationMs: number;
    queryCount?: number;
    [key: string]: unknown;
  };
}

/**
 * Sanitize error message for user consumption
 * Hides technical details, shows friendly message
 */
function sanitizeErrorMessage(error: Error | unknown, isDev: boolean): string {
  // In development, show more details for debugging
  if (isDev && error instanceof Error) {
    return `Error: ${error.message}`;
  }

  // Production: Generic messages based on error type
  if (error instanceof Error) {
    // Database errors
    if (
      error.message.includes("connection") ||
      error.message.includes("timeout") ||
      error.message.includes("ECONNREFUSED")
    ) {
      return "Service temporarily unavailable. Please try again in a moment.";
    }

    // Authentication errors
    if (
      error.message.includes("auth") ||
      error.message.includes("unauthorized") ||
      error.message.includes("forbidden")
    ) {
      return "Authentication failed. Please log in again.";
    }

    // Validation errors
    if (
      error.message.includes("validation") ||
      error.message.includes("invalid") ||
      error.message.includes("required")
    ) {
      return "Invalid request. Please check your input and try again.";
    }

    // Not found errors
    if (
      error.message.includes("not found") ||
      error.message.includes("404")
    ) {
      return "The requested resource was not found.";
    }

    // Rate limiting
    if (
      error.message.includes("rate limit") ||
      error.message.includes("too many requests")
    ) {
      return "Too many requests. Please slow down and try again later.";
    }
  }

  // Default generic message
  return "An internal error occurred. Our team has been notified.";
}

/**
 * Determine HTTP status code from error
 */
function getErrorStatusCode(error: Error | unknown): number {
  if (!(error instanceof Error)) {
    return 500;
  }

  const message = error.message.toLowerCase();

  if (message.includes("not found") || message.includes("404")) {
    return 404;
  }
  if (
    message.includes("unauthorized") ||
    message.includes("auth") ||
    message.includes("401")
  ) {
    return 401;
  }
  if (message.includes("forbidden") || message.includes("403")) {
    return 403;
  }
  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("400")
  ) {
    return 400;
  }
  if (
    message.includes("conflict") ||
    message.includes("duplicate") ||
    message.includes("409")
  ) {
    return 409;
  }
  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("429")
  ) {
    return 429;
  }
  if (
    message.includes("timeout") ||
    message.includes("gateway") ||
    message.includes("504")
  ) {
    return 504;
  }

  return 500;
}

/**
 * Higher-order function to wrap API handlers with error handling
 *
 * @param handler - The API route handler function
 * @param options - Optional configuration
 * @returns Wrapped handler with automatic error handling
 */
export function withErrorHandling(
  handler: ApiHandler,
  options: {
    /** Custom timeout in milliseconds */
    timeoutMs?: number;
    /** Additional context for logging */
    context?: string;
  } = {}
) {
  const { timeoutMs = 30000, context = "api" } = options;

  return async function wrappedHandler(req: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const logger = createRequestLogger();
    const requestId = logger.getRequestId();

    // Add context if provided
    const contextualLogger = context ? logger.child({ context }) : logger;

    // Log request start
    contextualLogger.info(`API ${req.method} ${req.nextUrl.pathname} started`, {
      method: req.method,
      path: req.nextUrl.pathname,
      query: req.nextUrl.search,
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    });

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Race between handler and timeout
      const result = await Promise.race([
        handler(req, {
          logger: contextualLogger,
          requestId,
          startTime,
        }),
        timeoutPromise,
      ]);

      const duration = Date.now() - startTime;

      // Log successful completion
      contextualLogger.info(
        `API ${req.method} ${req.nextUrl.pathname} completed`,
        {
          method: req.method,
          path: req.nextUrl.pathname,
          status: result.status,
        },
        duration
      );

      // Add request ID to response headers
      result.headers.set("X-Request-ID", requestId);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const isDev = process.env.NODE_ENV === "development";

      // Log the full error with technical details
      contextualLogger.error(
        `API ${req.method} ${req.nextUrl.pathname} failed`,
        error instanceof Error ? error : { error: String(error) },
        {
          method: req.method,
          path: req.nextUrl.pathname,
          durationMs: duration,
        }
      );

      // Determine status code
      const statusCode = getErrorStatusCode(error);

      // Create sanitized error response
      const errorResponse: ErrorResponse = {
        success: false,
        error: sanitizeErrorMessage(error, isDev),
        requestId, // Include request ID for support tickets
        meta: {
          durationMs: duration,
          timestamp: new Date().toISOString(),
        },
      };

      // Build response with CORS headers
      const corsHeaders = buildCorsHeaders(req);
      corsHeaders.set("X-Request-ID", requestId);
      corsHeaders.set("Content-Type", "application/json");

      return new NextResponse(JSON.stringify(errorResponse), {
        status: statusCode, headers: Object.fromEntries(corsHeaders.entries()),
      });
    }
  };
}

/**
 * Wrapper for simple handlers that don't need the full context
 */
export function withSimpleErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: { timeoutMs?: number; context?: string }
) {
  return withErrorHandling(async (req) => handler(req), options);
}

/**
 * Create a success response with consistent format
 */
export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  durationMs: number,
  additionalMeta?: Record<string, unknown>,
  corsHeaders?: Headers
): NextResponse {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    requestId,
    meta: {
      durationMs,
      ...additionalMeta,
    },
  };

  const headers = corsHeaders || new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-Request-ID", requestId);

  return new NextResponse(JSON.stringify(response), {
    status: 200,
    headers,
  });
}

/**
 * Create an error response (for manual error handling within handlers)
 */
export function createErrorResponse(
  message: string,
  requestId: string,
  durationMs: number,
  statusCode: number = 400,
  corsHeaders?: Headers
): NextResponse {
  const response: ErrorResponse = {
    success: false,
    error: message,
    requestId,
    meta: {
      durationMs,
      timestamp: new Date().toISOString(),
    },
  };

  const headers = corsHeaders || new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-Request-ID", requestId);

  return new NextResponse(JSON.stringify(response), {
    status: statusCode,
    headers,
  });
}

export default withErrorHandling;
