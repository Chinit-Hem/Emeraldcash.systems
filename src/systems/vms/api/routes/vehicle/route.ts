import { NextRequest, NextResponse } from "next/server";

import {
  GET as vehiclesGet,
  OPTIONS as vehiclesOptions,
  POST as vehiclesPost,
} from "../vehicles/route";

const ALLOW_HEADER_VALUE = "GET, POST, OPTIONS";
const VEHICLE_ROUTE_HINT =
  "Use /api/vehicles for list/create and /api/vehicles/:id for update/delete.";

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
  try {
    return await vehiclesGet(req);
  } catch (error) {
    return proxyErrorResponse("GET", error);
  }
}

export async function POST(req: NextRequest) {
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
  return methodNotAllowedResponse("PUT");
}

export function DELETE() {
  return methodNotAllowedResponse("DELETE");
}

export function PATCH() {
  return methodNotAllowedResponse("PATCH");
}
