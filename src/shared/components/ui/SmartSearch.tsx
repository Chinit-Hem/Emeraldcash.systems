/**
 * Smart Search Component
 * 
 * Reusable search component with debouncing (300ms) for filtering vehicles.
 * Searches by name, category, and brand without page refresh.
 * 
 * @module SmartSearch
 */

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { Vehicle } from "@/shared/types/types";

// Debounce hook with 300ms delay
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

type SmartSearchProps = {
  vehicles: Vehicle[];
  onSelect: (vehicle: Vehicle) => void;
  placeholder?: string;
  className?: string;
};

export default function SmartSearch({ 
  vehicles, 
  onSelect, 
  placeholder = "Search vehicles...",
  className = ""
}: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query with 300ms delay
  const debouncedQuery = useDebounce(query, 300);

  // Filter vehicles based on debounced query
  const filteredVehicles = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    const searchTerm = debouncedQuery.toLowerCase().trim();
    
    return vehicles
      .filter((vehicle) => {
        const brand = (vehicle.Brand || "").toLowerCase();
        const model = (vehicle.Model || "").toLowerCase();
        const category = (vehicle.Category || "").toLowerCase();
        const plate = (vehicle.Plate || "").toLowerCase();
        
        return (
          brand.includes(searchTerm) ||
          model.includes(searchTerm) ||
          category.includes(searchTerm) ||
          plate.includes(searchTerm)
        );
      })
      .slice(0, 10); // Limit to 10 results
  }, [debouncedQuery, vehicles]);

  // Reset highlighted index when results change
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => setHighlightedIndex(0), 0);
    return () => clearTimeout(timeoutId);
  }, [filteredVehicles.length]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredVehicles.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredVehicles[highlightedIndex]) {
          onSelect(filteredVehicles[highlightedIndex]);
          setQuery("");
          setIsOpen(false);
          inputRef.current?.blur();
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, filteredVehicles, highlightedIndex, onSelect]);

  const handleSelect = useCallback((vehicle: Vehicle) => {
    onSelect(vehicle);
    setQuery("");
    setIsOpen(false);
  }, [onSelect]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 pr-4 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          aria-label="Search vehicles"
          aria-haspopup="listbox"
          aria-controls="search-results"
        />
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {/* Clear Button */}
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && debouncedQuery.trim() && (
        <div
          id="search-results"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-auto"
        >
          {filteredVehicles.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No vehicles found
            </div>
          ) : (
            <ul className="py-1" role="presentation">
              {filteredVehicles.map((vehicle, index) => (
                <li
                  key={vehicle.VehicleId}
                  role="option"
                  aria-selected={index === highlightedIndex ? "true" : "false"}
                  onClick={() => handleSelect(vehicle)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    index === highlightedIndex
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100"
                      : "text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {vehicle.Brand} {vehicle.Model}
                      </span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {vehicle.Category}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {vehicle.Plate}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
