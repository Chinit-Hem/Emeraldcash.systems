import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, createSuccessResponse } from "@/lib/api-error-wrapper";
import { getConnectionStats, testConnection } from "@/lib/db-singleton";
import { getCachedVehicles } from "@/systems/vms/api/vehicles-cache";
import { testCloudinaryConnection } from "@/lib/cloudinary";

interface HealthMetrics {
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  environment: string;
  database: {
    status: "connected" | "disconnected" | "error";
    host?: string;
    stats: {
      totalQueries: number;
      failedQueries: number;
      successRate: number;
      averageResponseTimeMs: number;
    };
    message?: string;
  };
  cache: {
    status: "hit" | "miss" | "error";
    vehicleCount: number;
    lastUpdated: string | null;
  };
  cloudinary: {
    status: "connected" | "disconnected" | "error";
    cloudName?: string;
    message: string;
  };
  uptime: number;
}

const START_TIME = Date.now();
let LAST_SYNC_TIME: string | null = null;
let LAST_SYNC_ERROR: string | null = null;

// Update sync status (called by cron job)
function updateSyncStatus(success: boolean, error?: string) {
  if (success) {
    LAST_SYNC_TIME = new Date().toISOString();
    LAST_SYNC_ERROR = null;
  } else {
    LAST_SYNC_ERROR = error || "Unknown error";
  }
}

// POST handler to update sync status via API call
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { success, error: syncError } = body;

    if (typeof success !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: success must be a boolean' },
        { status: 400 }
      );
    }

    updateSyncStatus(success, syncError);

    return NextResponse.json({
      success: true,
      lastSyncTime: LAST_SYNC_TIME,
      lastSyncError: LAST_SYNC_ERROR,
    });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}

/**
 * GET /api/health
 *
 * Comprehensive health check endpoint that tests:
 * - Neon PostgreSQL connection
 * - Connection pool status
 * - Cache status
 * - Google Sheets connectivity
 */
const healthHandler = withErrorHandling(async (req, { logger, requestId, startTime }) => {
  logger.info("Health check started");

  // Check Neon PostgreSQL connection
  let dbStatus: "connected" | "disconnected" | "error" = "disconnected";
  let dbMessage = "";
  let dbHost = "";

  try {
    // Test connection with a simple query
    const connectionTest = await testConnection();

    if (connectionTest.success) {
      dbStatus = "connected";
      dbMessage = connectionTest.message;

      // Extract host from DATABASE_URL (safely)
      const dbUrl = process.env.DATABASE_URL || "";
      try {
        const urlObj = new URL(dbUrl);
        dbHost = urlObj.hostname;
      } catch {
        dbHost = "unknown";
      }

      logger.info("Database connection healthy", { host: dbHost });
    } else {
      dbStatus = "error";
      dbMessage = connectionTest.message;
      logger.error("Database connection failed", new Error(connectionTest.message));
    }
  } catch (error) {
    dbStatus = "error";
    const errorMessage = error instanceof Error ? error.message : "Unknown database error";
    dbMessage = errorMessage;
    logger.error("Database health check error", error instanceof Error ? error : new Error(errorMessage));
  }

  // Get connection pool stats
  const dbStats = getConnectionStats();

  // Check cache status
  const cachedVehicles = getCachedVehicles();
  const cacheStatus = cachedVehicles ? "hit" : "miss";

  // Check Cloudinary connectivity
  let cloudinaryStatus: "connected" | "disconnected" | "error" = "disconnected";
  let cloudinaryMessage = "";
  let cloudinaryCloudName = "";

  try {
    const cloudinaryTest = await testCloudinaryConnection();
    if (cloudinaryTest.success) {
      cloudinaryStatus = "connected";
      cloudinaryMessage = cloudinaryTest.message;
      cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || "unknown";
      logger.info("Cloudinary connection healthy", { cloudName: cloudinaryCloudName });
    } else {
      cloudinaryStatus = "error";
      cloudinaryMessage = cloudinaryTest.message;
      logger.error("Cloudinary connection failed", new Error(cloudinaryTest.message));
    }
  } catch (error) {
    cloudinaryStatus = "error";
    const cloudinaryErrorMessage = error instanceof Error ? error.message : "Unknown Cloudinary error";
    cloudinaryMessage = cloudinaryErrorMessage;
    logger.error("Cloudinary health check error", error instanceof Error ? error : new Error(cloudinaryErrorMessage));
  }

  // Determine overall health
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (dbStatus === "error" && cloudinaryStatus === "error") {
    status = "unhealthy";
  } else if (dbStatus === "error" || cloudinaryStatus === "error") {
    status = "degraded";
  }

  // Calculate uptime
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  const metrics: HealthMetrics = {
    timestamp: new Date().toISOString(),
    status,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    environment: process.env.VERCEL_ENV || "development",
    database: {
      status: dbStatus,
      host: dbHost,
      stats: {
        totalQueries: dbStats.totalQueries,
        failedQueries: dbStats.failedQueries,
        successRate: dbStats.successRate,
        averageResponseTimeMs: dbStats.averageResponseTimeMs,
      },
      message: dbMessage,
    },
    cache: {
      status: cacheStatus,
      vehicleCount: cachedVehicles?.data.length || 0,
      lastUpdated: LAST_SYNC_TIME,
    },
    cloudinary: {
      status: cloudinaryStatus,
      cloudName: cloudinaryCloudName,
      message: cloudinaryMessage,
    },
    uptime,
  };

  logger.info("Health check completed", {
    status,
    dbStatus,
    dbHost,
    cloudinaryStatus,
    uptime
  });

  const duration = Date.now() - startTime;
  const corsHeaders = new Headers();
  corsHeaders.set("X-Response-Time", `${duration}ms`);
  corsHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");

  return createSuccessResponse(
    metrics,
    requestId,
    duration,
    {},
    corsHeaders
  );
}, { context: "health-check", timeoutMs: 10000 });

export { healthHandler as GET };

// Health check for load balancers (simple ping)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
