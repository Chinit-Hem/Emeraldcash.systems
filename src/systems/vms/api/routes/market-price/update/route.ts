import { requirePermission } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";
import { appsScriptUrl, fetchAppsScript } from "@/systems/vms/api/apps-script";

// POST /api/market-price/update
// Body: { vehicleId, marketData: { priceLow, priceMedian, priceHigh, source, samples, confidence } }
// Updates the vehicle's market price fields in Google Sheets
// Requires vehicle edit permission.

// Input validation helper
function sanitizeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validateMarketData(data: Record<string, unknown>): { valid: boolean; error?: string } {
  const priceLow = sanitizeNumber(data.priceLow);
  const priceMedian = sanitizeNumber(data.priceMedian);
  const priceHigh = sanitizeNumber(data.priceHigh);
  const confidence = sanitizeString(data.confidence, 20);

  // Validate confidence level
  const validConfidence = ["High", "Medium", "Low", "Unknown"];
  if (confidence && !validConfidence.includes(confidence)) {
    return { valid: false, error: "Invalid confidence level" };
  }

  // Validate price relationships
  if (priceLow !== null && priceMedian !== null && priceLow > priceMedian) {
    return { valid: false, error: "priceLow cannot be greater than priceMedian" };
  }

  if (priceHigh !== null && priceMedian !== null && priceHigh < priceMedian) {
    return { valid: false, error: "priceHigh cannot be less than priceMedian" };
  }

  // Validate price ranges (reasonable USD values for vehicles)
  if (priceLow !== null && (priceLow < 10 || priceLow > 1000000)) {
    return { valid: false, error: "priceLow out of reasonable range" };
  }

  if (priceMedian !== null && (priceMedian < 10 || priceMedian > 1000000)) {
    return { valid: false, error: "priceMedian out of reasonable range" };
  }

  if (priceHigh !== null && (priceHigh < 10 || priceHigh > 1000000)) {
    return { valid: false, error: "priceHigh out of reasonable range" };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, "vehicles:edit");
  if (auth.response) return auth.response;
  const session = auth.session;

  try {
    const body = await request.json();
    const { vehicleId, marketData } = body;

    // Validate required fields
    if (!vehicleId) {
      return NextResponse.json(
        { ok: false, error: "Missing vehicleId" },
        { status: 400 }
      );
    }

    if (!marketData || typeof marketData !== "object") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid marketData" },
        { status: 400 }
      );
    }

    // Validate market data
    const marketValidation = validateMarketData(marketData as Record<string, unknown>);
    if (!marketValidation.valid) {
      return NextResponse.json(
        { ok: false, error: marketValidation.error },
        { status: 400 }
      );
    }

    const { priceLow, priceMedian, priceHigh, source, samples, confidence } = marketData as Record<string, unknown>;

    // Validate vehicleId format
    const safeVehicleId = sanitizeString(vehicleId, 100);
    if (!safeVehicleId) {
      return NextResponse.json(
        { ok: false, error: "Invalid vehicleId format" },
        { status: 400 }
      );
    }

    // Build the update payload for Google Sheets
    const updateData = {
      MARKET_PRICE_LOW: priceLow ?? "",
      MARKET_PRICE_MEDIAN: priceMedian ?? "",
      MARKET_PRICE_HIGH: priceHigh ?? "",
      MARKET_PRICE_SOURCE: source ?? "",
      MARKET_PRICE_SAMPLES: samples ?? "",
      MARKET_PRICE_CONFIDENCE: confidence ?? "",
      MARKET_PRICE_UPDATED_AT: new Date().toISOString(),
      MARKET_PRICE_UPDATED_BY: session.username,
    };

    // Get Apps Script URL from environment or use default
    const baseUrl = process.env.APPS_SCRIPT_URL;
    if (!baseUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "APPS_SCRIPT_URL environment variable not configured",
        },
        { status: 500 }
      );
    }

    // Validate token
    const uploadToken = process.env.APPS_SCRIPT_UPLOAD_TOKEN;
    if (!uploadToken) {
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const url = appsScriptUrl(baseUrl, "updateMarketPrice");

    try {
      const res = await fetchAppsScript(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: safeVehicleId,
          data: updateData,
          token: uploadToken,
        }),
      });

      if (res.status === 401) {
        return NextResponse.json(
          { ok: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      if (res.status === 403) {
        return NextResponse.json(
          { ok: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      const json = await res.json().catch(() => ({ ok: false, error: "Invalid response" }));

      if (!res.ok || !json.ok) {
        return NextResponse.json(
          { ok: false, error: json.error || "Failed to update market price" },
          { status: res.status }
        );
      }

      return NextResponse.json({
        ok: true,
        data: {
          vehicleId: safeVehicleId,
          updated: true,
          updatedAt: updateData.MARKET_PRICE_UPDATED_AT,
          updatedBy: session.username,
        },
      });
    } catch (err) {
      console.error("Apps Script request failed:", err);
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : "Failed to connect to Apps Script" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in market-price/update:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
