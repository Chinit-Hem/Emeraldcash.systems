"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import type { Vehicle } from "@/shared/types/types";

type UseDashboardVehicleSearchOptions = {
  searchQuery: string;
  limit: number;
  debounceMs?: number;
  logLabel?: string;
};

export function useDashboardVehicleSearch({
  searchQuery,
  limit,
  debounceMs = 300,
  logLabel = "Dashboard",
}: UseDashboardVehicleSearchOptions) {
  const debouncedSearch = useDebouncedValue(searchQuery, debounceMs);
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    async function fetchSearchResults() {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          searchTerm: query,
          limit: String(limit),
        });
        const res = await fetch(`/api/vehicles?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Search failed");

        const data = await res.json();
        if (ignore) return;

        setSearchResults(data.success ? data.data || [] : []);
      } catch (err) {
        if (controller.signal.aborted || ignore) return;
        console.error(`[${logLabel}] Search error:`, err);
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted && !ignore) {
          setIsSearching(false);
        }
      }
    }

    void fetchSearchResults();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [debouncedSearch, limit, logLabel]);

  return {
    debouncedSearch,
    searchResults,
    isSearching,
  };
}
