"use client";

import { formatMarketPrice, getConfidenceColor, getConfidenceLabel } from "@/systems/vms/services/market-price";
import type { Vehicle } from "@/shared/types/types";
import { useState } from "react";
import { safeToLocaleString, safeNowISO } from "@/shared/utils/safeDate";

interface MarketPriceButtonProps {
  vehicle: Vehicle;
  onPriceUpdate?: (marketData: MarketPriceData) => void;
  variant?: "button" | "card";
}

interface MarketPriceData {
  priceLow: number | null;
  priceMedian: number | null;
  priceHigh: number | null;
  source: string;
  samples: number;
  confidence: "High" | "Medium" | "Low" | "Unknown";
  fetchedAt: string;
}

export function MarketPriceButton({ vehicle, onPriceUpdate, variant = "button" }: MarketPriceButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketPriceData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchMarketPrice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        category: vehicle.Category || "",
        brand: vehicle.Brand || "",
        model: vehicle.Model || "",
      });

      if (vehicle.Year) {
        params.append("year", vehicle.Year.toString());
      }

      if (vehicle.Condition) {
        params.append("condition", vehicle.Condition);
      }

      const response = await fetch(`/api/market-price/fetch?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch market price");
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to fetch market price");
      }

      const result = data.data;
      const newMarketData: MarketPriceData = {
        priceLow: result.priceLow,
        priceMedian: result.priceMedian,
        priceHigh: result.priceHigh,
        source: result.sources?.[0] || "unknown",
        samples: result.sampleCount || 0,
        confidence: result.confidence || "Unknown",
        fetchedAt: result.fetchedAt || safeNowISO(),
      };

      setMarketData(newMarketData);
      onPriceUpdate?.(newMarketData);

      // Also update in Google Sheets
      if (vehicle.VehicleId) {
        await updateMarketPriceInSheet(vehicle.VehicleId, newMarketData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch market price");
    } finally {
      setIsLoading(false);
    }
  };

  const updateMarketPriceInSheet = async (vehicleId: string, data: MarketPriceData) => {
    try {
      const response = await fetch("/api/market-price/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          marketData: {
            priceLow: data.priceMedian, // Use median as the main market price
            priceMedian: data.priceMedian,
            priceHigh: data.priceMedian,
            source: data.source,
            samples: data.samples,
            confidence: data.confidence,
          },
        }),
      });

      if (!response.ok) {
        console.warn("Failed to update market price in Google Sheets");
      }
    } catch (err) {
      console.warn("Error updating market price in sheet:", err);
    }
  };

  if (variant === "card") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Cambodia Market Price</h3>
          <button
            onClick={fetchMarketPrice}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition"
          >
            {isLoading ? "Updating..." : "Update Price"}
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {marketData ? (
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-green-700">
                {formatMarketPrice(marketData.priceMedian)}
              </span>
              <span className="text-sm text-gray-500">median</span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 text-xs rounded-full ${getConfidenceColor(marketData.confidence)}`}>
                {getConfidenceLabel(marketData.confidence)}
              </span>
              <span className="text-xs text-gray-500">
                {marketData.samples} listing{marketData.samples !== 1 ? "s" : ""}
              </span>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>

            {showDetails && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Low (25th %):</span>
                  <span className="font-medium">{formatMarketPrice(marketData.priceLow)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">High (75th %):</span>
                  <span className="font-medium">{formatMarketPrice(marketData.priceHigh)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <span className="font-medium">{marketData.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="font-medium">
                    {safeToLocaleString(marketData.fetchedAt, "N/A")}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Click &ldquo;Update Price&rdquo; to fetch current market prices from Cambodian marketplaces.
          </p>
        )}

        <p className="mt-3 text-xs text-gray-400">
          Prices are estimates based on available listings. Actual prices may vary.
        </p>
      </div>
    );
  }

  // Default button variant
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={fetchMarketPrice}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition font-medium"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
          <path d="M3 3v9h9" />
        </svg>
        {isLoading ? "Updating..." : "Update Market Price"}
      </button>

      {marketData && (
        <span className="text-sm">
          <span className="font-semibold text-green-700">
            {formatMarketPrice(marketData.priceMedian)}
          </span>
          <span className="mx-1 text-gray-400">|</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${getConfidenceColor(marketData.confidence)}`}>
            {marketData.confidence}
          </span>
        </span>
      )}

      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
    </div>
  );
}

