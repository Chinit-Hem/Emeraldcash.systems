import { estimatePriceRuleBased, fetchMarketPrices } from "@/lib/market-price";
import { NextRequest, NextResponse } from "next/server";

// GET /api/market-price/fetch
// Query params: category, brand, model, year, condition
// Returns market price data from Cambodian marketplaces

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const model = searchParams.get("model") || "";
  const yearStr = searchParams.get("year");
  const condition = searchParams.get("condition") || "";
  
  // Validate required fields
  if (!category || !brand || !model) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing required parameters: category, brand, and model are required",
      },
      { status: 400 }
    );
  }
  
const parsedYear = yearStr ? parseInt(yearStr, 10) : null;
  const year = parsedYear !== null && !isNaN(parsedYear) ? parsedYear : null;
  const isValidYear = year !== null && !isNaN(year);
  
  try {
    // Check for fallback mode (use estimated prices instead of fetching)
    const useFallback = searchParams.get("fallback") === "true";
    
    let result;
    
    if (useFallback) {
      // Use rule-based estimation
      result = estimatePriceRuleBased(brand, model, year, category);
      result.cacheHit = false;
    } else {
      // Try to fetch from external sources
      result = await fetchMarketPrices({
        category,
        brand,
        model,
        year: isValidYear ? year : null,
        condition: condition || undefined,
      });
      
      // If no data found, fall back to estimation
      if (result.confidence === "Unknown") {
        console.log(`No market data found for ${category} ${brand} ${model} ${year || ""}, using estimation`);
        result = estimatePriceRuleBased(brand, model, year, category);
        result.cacheHit = false;
      }
    }
    
    return NextResponse.json({
      ok: true,
      data: {
        category,
        brand,
        model,
        year: isValidYear ? year : null,
        ...result,
      },
    });
  } catch (error) {
    console.error("Error fetching market prices:", error);
    
    // Fall back to estimation on error
    const fallbackResult = estimatePriceRuleBased(brand, model, year, category);
    
    return NextResponse.json({
      ok: true,
      data: {
        category,
        brand,
        model,
        year: isValidYear ? year : null,
        ...fallbackResult,
      },
      warning: "Market price fetch failed, using estimated values",
    });
  }
}

