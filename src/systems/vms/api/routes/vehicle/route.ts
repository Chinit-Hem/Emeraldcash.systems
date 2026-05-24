import { NextRequest, NextResponse } from "next/server";

import {
  GET as vehiclesGet,
  OPTIONS as vehiclesOptions,
  POST as vehiclesPost,
} from "../vehicles/route";

const ALLOW_HEADER_VALUE = "GET, POST, OPTIONS";
const VEHICLE_ROUTE_HINT =
  "Use /api/vehicles for list/create and /api/vehicles/:id for update/delete.";

function resolveAppsScriptUrl(): string | null {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const serverUrl = process.env.APPS_SCRIPT_URL?.trim();
  return publicUrl || serverUrl || null;
}

function configErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error:
        "API URL is not configured. Set NEXT_PUBLIC_API_URL in Vercel Environment Variables.",
      debug: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL?.trim()
          ? "configured"
          : "missing",
        APPS_SCRIPT_URL: process.env.APPS_SCRIPT_URL?.trim()
          ? "configured"
          : "missing",
      },
    },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}

function methodNotAllowedResponse(method: string): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: `Method ${method} is not supported on /api/vehicle.`,
      hint: VEHICLE_ROUTE_HINT,
    },
    {
      status: 405,
      headers: {
        Allow: ALLOW_HEADER_VALUE,
        "Cache-Control": "no-store",
      },
    }
  );
}

function proxyErrorResponse(method: string, error: unknown): NextResponse {
  const safeMessage =
    error instanceof Error && error.message
      ? error.message
      : `Failed to proxy ${method} /api/vehicle request`;

  console.error(`[API_VEHICLE] ${method} proxy error:`, error);

  return NextResponse.json(
    {
      ok: false,
      error: safeMessage,
    },
    { status: 502, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: NextRequest) {
  if (!resolveAppsScriptUrl()) return configErrorResponse();
  try {
    return await vehiclesGet(req);
  } catch (error) {
    return proxyErrorResponse("GET", error);
  }
}

export async function POST(req: NextRequest) {
  if (!resolveAppsScriptUrl()) return configErrorResponse();
  try {
    return await vehiclesPost(req);
  } catch (error) {
    return proxyErrorResponse("POST", error);
  }
}

export async function OPTIONS(req: NextRequest) {
  try {
    return await vehiclesOptions(req);
  } catch (error) {
    return proxyErrorResponse("OPTIONS", error);
  }
}

export function PUT() {
  if (!resolveAppsScriptUrl()) return configErrorResponse();
  return methodNotAllowedResponse("PUT");
}

export function DELETE() {
  if (!resolveAppsScriptUrl()) return configErrorResponse();
  return methodNotAllowedResponse("DELETE");
}

export function PATCH() {
  if (!resolveAppsScriptUrl()) return configErrorResponse();
  return methodNotAllowedResponse("PATCH");
}
