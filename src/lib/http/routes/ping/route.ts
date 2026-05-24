/**
 * Simple ping endpoint for connection warming
 * 
 * This endpoint is designed to be called before expensive operations
 * to warm up database connections and reduce cold start latency.
 * 
 * Use this before login or other database-intensive operations:
 *   await fetch('/api/ping', { cache: 'no-store' });
 *   // Then proceed with actual login
 */

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    // Warm up database connection with a simple query
    await sql`SELECT 1`;
    
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      message: "pong",
      dbWarmed: true,
    });
} catch (_error) {
    // Still return success for ping even if DB fails
    // This is just warming up, not health check
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      message: "pong",
      dbWarmed: false,
    });
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
