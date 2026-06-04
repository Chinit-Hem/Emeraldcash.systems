import { NextRequest, NextResponse } from "next/server";
import { setCachedVehicles } from "@/systems/vms/api/vehicles-cache";
import db from "@/lib/db-singleton";
import type { Vehicle, VehicleMeta } from "@/shared/types/types";

// Logging utility
function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    service: "cron-sync-vehicles",
    ...meta,
  };
  
  // In production, you might want to send this to a logging service
  if (level === "error") {
    console.error(JSON.stringify(logEntry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Validation functions
function isValidVehicle(vehicle: unknown): vehicle is Vehicle {
  if (!vehicle || typeof vehicle !== "object") return false;
  
  const v = vehicle as Record<string, unknown>;
  
  // Required fields
  if (!v.VehicleId || String(v.VehicleId).trim() === "") return false;
  if (!v.Category || String(v.Category).trim() === "") return false;
  if (!v.Brand || String(v.Brand).trim() === "") return false;
  if (!v.Model || String(v.Model).trim() === "") return false;
  
  // Validate data types
  if (v.Year !== undefined && v.Year !== null) {
    const year = Number(v.Year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
      return false;
    }
  }
  
  if (v.PriceNew !== undefined && v.PriceNew !== null) {
    const price = Number(v.PriceNew);
    if (isNaN(price) || price < 0) {
      return false;
    }
  }
  
  return true;
}

function sanitizeConfidence(value: unknown): "High" | "Medium" | "Low" | null {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  if (str === "high") return "High";
  if (str === "medium") return "Medium";
  if (str === "low") return "Low";
  return null;
}

function sanitizeVehicle(vehicle: Vehicle): Vehicle {
  return {
    ...vehicle,
    VehicleId: String(vehicle.VehicleId).trim(),
    Category: String(vehicle.Category).trim(),
    Brand: String(vehicle.Brand).trim(),
    Model: String(vehicle.Model).trim(),
    Year: vehicle.Year ? Number(vehicle.Year) : null,
    Plate: vehicle.Plate ? String(vehicle.Plate).trim() : "",
    PriceNew: vehicle.PriceNew ? Number(vehicle.PriceNew) : null,
    Price40: vehicle.Price40 ? Number(vehicle.Price40) : null,
    Price70: vehicle.Price70 ? Number(vehicle.Price70) : null,
    TaxType: vehicle.TaxType ? String(vehicle.TaxType).trim() : "",
    Condition: vehicle.Condition ? String(vehicle.Condition).trim() : "",
    BodyType: vehicle.BodyType ? String(vehicle.BodyType).trim() : "",
    Color: vehicle.Color ? String(vehicle.Color).trim() : "",
    Image: vehicle.Image ? String(vehicle.Image).trim() : "",
    Time: vehicle.Time ? String(vehicle.Time).trim() : "",
    // Market price fields
    MarketPriceLow: vehicle.MarketPriceLow ? Number(vehicle.MarketPriceLow) : null,
    MarketPriceMedian: vehicle.MarketPriceMedian ? Number(vehicle.MarketPriceMedian) : null,
    MarketPriceHigh: vehicle.MarketPriceHigh ? Number(vehicle.MarketPriceHigh) : null,
    MarketPriceSource: vehicle.MarketPriceSource ? String(vehicle.MarketPriceSource).trim() : "",
    MarketPriceSamples: vehicle.MarketPriceSamples ? Number(vehicle.MarketPriceSamples) : null,
    MarketPriceConfidence: sanitizeConfidence(vehicle.MarketPriceConfidence),
    MarketPriceUpdatedAt: vehicle.MarketPriceUpdatedAt ? String(vehicle.MarketPriceUpdatedAt).trim() : "",
  };
}


// Fetch vehicles from Neon Database
async function fetchVehiclesFromDB(): Promise<{ vehicles: Vehicle[]; meta: VehicleMeta; duration: number }> {
  const startTime = Date.now();
  
  try {
    // Query all vehicles from the database
    const result = await db.executeUnsafe<Record<string, unknown>>(`
      SELECT 
        vehicle_id as "VehicleId",
        category as "Category",
        brand as "Brand",
        model as "Model",
        year as "Year",
        plate as "Plate",
        price_new as "PriceNew",
        price_40 as "Price40",
        price_70 as "Price70",
        tax_type as "TaxType",
        condition as "Condition",
        body_type as "BodyType",
        color as "Color",
        image as "Image",
        time as "Time",
        market_price_low as "MarketPriceLow",
        market_price_median as "MarketPriceMedian",
        market_price_high as "MarketPriceHigh",
        market_price_source as "MarketPriceSource",
        market_price_samples as "MarketPriceSamples",
        market_price_confidence as "MarketPriceConfidence",
        market_price_updated_at as "MarketPriceUpdatedAt"
      FROM vehicles
      ORDER BY created_at DESC
    `);
    
    const vehicles = (result || []).map((row) => ({
      VehicleId: String(row["VehicleId"] || ""),
      Category: String(row["Category"] || ""),
      Brand: String(row["Brand"] || ""),
      Model: String(row["Model"] || ""),
      Year: row["Year"] ? Number(row["Year"]) : undefined,
      Plate: row["Plate"] ? String(row["Plate"]) : undefined,
      PriceNew: row["PriceNew"] ? Number(row["PriceNew"]) : undefined,
      Price40: row["Price40"] ? Number(row["Price40"]) : undefined,
      Price70: row["Price70"] ? Number(row["Price70"]) : undefined,
      TaxType: row["TaxType"] ? String(row["TaxType"]) : undefined,
      Condition: row["Condition"] ? String(row["Condition"]) : undefined,
      BodyType: row["BodyType"] ? String(row["BodyType"]) : undefined,
      Color: row["Color"] ? String(row["Color"]) : undefined,
      Image: row["Image"] ? String(row["Image"]) : undefined,
      Time: row["Time"] ? String(row["Time"]) : undefined,
      MarketPriceLow: row["MarketPriceLow"] ? Number(row["MarketPriceLow"]) : undefined,
      MarketPriceMedian: row["MarketPriceMedian"] ? Number(row["MarketPriceMedian"]) : undefined,
      MarketPriceHigh: row["MarketPriceHigh"] ? Number(row["MarketPriceHigh"]) : undefined,
      MarketPriceSource: row["MarketPriceSource"] ? String(row["MarketPriceSource"]) : undefined,
      MarketPriceSamples: row["MarketPriceSamples"] ? Number(row["MarketPriceSamples"]) : undefined,
      MarketPriceConfidence: row["MarketPriceConfidence"] ? String(row["MarketPriceConfidence"]) : undefined,
      MarketPriceUpdatedAt: row["MarketPriceUpdatedAt"] ? String(row["MarketPriceUpdatedAt"]) : undefined,
    })).filter(v => v.VehicleId && v.VehicleId.trim() !== "") as Vehicle[];

    // Validate and sanitize
    const validVehicles = vehicles.filter(isValidVehicle).map(sanitizeVehicle);

    // Compute meta
    const meta: VehicleMeta = {
      total: validVehicles.length,
      countsByCategory: {
        Cars: validVehicles.filter(v => v.Category === "Cars").length,
        Motorcycles: validVehicles.filter(v => v.Category === "Motorcycles").length,
        TukTuks: validVehicles.filter(v => String(v.Category || "").toLowerCase().includes("tuk")).length,
      },
      avgPrice: validVehicles.length > 0
        ? validVehicles.reduce((sum, v) => sum + (v.PriceNew || 0), 0) / validVehicles.length
        : 0,
      noImageCount: validVehicles.filter(v => !v.Image).length,
      countsByCondition: {
        New: validVehicles.filter(v => v.Condition === "New").length,
        Used: validVehicles.filter(v => v.Condition === "Used").length,
      },
    };

    const duration = Date.now() - startTime;

    return { vehicles: validVehicles, meta, duration };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Database query failed";
    log("error", "Failed to fetch vehicles from database", { error: errorMessage });
    throw new Error(errorMessage);
  }
}

// Main handler
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const cronSecret = process.env.CRON_SECRET;
  
  // Verify cron secret if configured
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      log("error", "Unauthorized cron request", { ip: clientIp });
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }


  try {
    log("info", "Starting scheduled vehicle sync from database");

    // Fetch and validate data from database
    const { vehicles, meta, duration: fetchDuration } = await fetchVehiclesFromDB();
    
    // Update cache
    setCachedVehicles(vehicles);
    
    const totalDuration = Date.now() - startTime;
    
    // Log success metrics
    log("info", "Vehicle sync completed successfully", {
      vehicleCount: vehicles.length,
      fetchDuration,
      totalDuration,
      cacheUpdated: true,
      categories: meta.countsByCategory,
      conditions: meta.countsByCondition,
      avgPrice: meta.avgPrice,
      noImageCount: meta.noImageCount,
    });

    return NextResponse.json({
      ok: true,
      message: "Vehicle sync completed",
      metrics: {
        vehicleCount: vehicles.length,
        fetchDuration,
        totalDuration,
        categories: meta.countsByCategory,
        conditions: meta.countsByCondition,
        avgPrice: meta.avgPrice,
        noImageCount: meta.noImageCount,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log("error", "Vehicle sync failed", { 
      error: errorMessage,
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
