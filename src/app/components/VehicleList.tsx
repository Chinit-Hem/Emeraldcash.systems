"use client";


import { NeuInput } from "@/components/ui/neu/NeuInput";
import { driveThumbnailUrl, extractDriveFileId } from "@/lib/drive";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { onVehicleCacheUpdate, readVehicleCache, refreshVehicleCache, writeVehicleCache } from "@/lib/vehicleCache";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/app/components/AuthContext";
import { getFuzzySuggestions } from "@/lib/fuzzySearch";
import SearchSuggestions from "@/components/SearchSuggestions";

type VehicleListProps = {
  category?: string;
};

// Icons
const Icons = {
  search: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 21-4.3-4.3" />
    </svg>
  ),
  filter: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M6 10h12M9 16h6" />
    </svg>
  ),
  refresh: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  view: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
    </svg>
  ),
  edit: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  print: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" strokeWidth={1.5} />
    </svg>
  ),
  image: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
      <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 15-3.086-3.086a2 2 0 00-2.828 0L6 21" />
    </svg>
  ),
  noImage: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" />
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
    </svg>
  ),
};

// Vehicle Row Card - Floating Neumorphic with Horizontal Layout
function VehicleRow({ vehicle, isAdmin, onDelete, onClick }: { 
  vehicle: Vehicle; 
  isAdmin: boolean;
  onDelete: (v: Vehicle) => void;
  onClick: () => void;
}) {
  const router = useRouter();
  const hasImage = vehicle.Image && vehicle.Image.length > 0;
  const derived = derivePrices(vehicle.PriceNew);
  const price40 = vehicle.Price40 ?? derived.Price40;
  const price70 = vehicle.Price70 ?? derived.Price70;
  
  const isCloudinary = typeof vehicle.Image === 'string' && 
    vehicle.Image !== 'undefined' && 
    vehicle.Image !== 'null' &&
    vehicle.Image.includes('res.cloudinary.com');
  
  let thumbUrl: string | null = null;
  if (isCloudinary) {
    thumbUrl = vehicle.Image;
  } else {
    const imageFileId = extractDriveFileId(vehicle.Image);
    thumbUrl = imageFileId ? driveThumbnailUrl(imageFileId, "w100-h100") : null;
  }

  return (
    <div 
      onClick={onClick}
      className="bg-white mx-4 my-2 p-4 rounded-[20px] shadow-sm flex flex-row items-center gap-4 cursor-pointer active:bg-slate-100 transition-all hover:translate-y-[-1px] min-w-[1100px] whitespace-nowrap"
    >
      {/* Image or Placeholder */}
      <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${hasImage ? 'bg-white shadow-sm' : 'bg-white shadow-sm'}`}>
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <span className="text-[#718096]">{Icons.noImage}</span>
        )}
      </div>
      
      {/* Vehicle Info - Horizontal Layout */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Brand & Model */}
        <div className="w-56 shrink-0">
          <p className="font-bold text-[#2d3748] text-base truncate">{vehicle.Brand} {vehicle.Model}</p>
        </div>
        
        {/* Year */}
        <div className="w-24 shrink-0 text-center">
          <p className="text-sm text-[#718096]">{vehicle.Year}</p>
        </div>
        
        {/* Category */}
        <div className="w-32 shrink-0 text-center">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white shadow-sm text-[#4a4a5a]">
            {vehicle.Category}
          </span>
        </div>
        
        {/* Plate */}
        <div className="w-32 shrink-0 text-center">
          <p className="text-sm font-mono text-[#4a4a5a]">{vehicle.Plate}</p>
        </div>
        
        {/* Prices */}
        <div className="flex items-center gap-6 shrink-0 min-w-[320px]">
          <span className="text-[#2ecc71] font-bold text-base">${vehicle.PriceNew?.toLocaleString() || '-'}</span>
          <span className="text-[#e74c3c] text-sm font-medium">DOC: ${price40?.toLocaleString() || '-'}</span>
          <span className="text-[#2ecc71] text-sm font-medium">V70: ${price70?.toLocaleString() || '-'}</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => router.push(`/vehicles/${vehicle.VehicleId}/view`)}
          className="p-2 bg-white text-[#2d3748] rounded-xl shadow-sm active:bg-slate-100 font-semibold transition-all flex items-center gap-2 text-sm"
        >
          {Icons.view}
          <span>View</span>
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => router.push(`/vehicles/${vehicle.VehicleId}/edit`)}
              className="p-2 bg-[#2ecc71] text-white rounded-xl shadow-sm active:bg-slate-100 font-semibold transition-all flex items-center gap-2 text-sm"
            >
              {Icons.edit}
              <span>Edit</span>
            </button>
            <button
              onClick={() => onDelete(vehicle)}
              className="p-2 bg-[#e74c3c] text-white rounded-xl shadow-sm active:bg-slate-100 font-semibold transition-all flex items-center gap-2 text-sm"
            >
              {Icons.trash}
              <span>Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VehicleList({ category }: VehicleListProps) {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(category || "All");
  const [conditionFilter, setConditionFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  
  const debouncedSearch = useDebouncedValue(searchQuery, 300); // Optimal for API
  const infiniteScrollKey = debouncedSearch || categoryFilter;

  // Fetch vehicles - with search support
  useEffect(() => {
    const cached = readVehicleCache();
    if (cached && !debouncedSearch) {
      setVehicles(cached);
      setLoading(false);
    }
    
    async function fetchVehicles() {
      try {
        // Build URL with search parameter if present
        // INCREASED: limit from 500 to 2000 to show all vehicles including test data
        let url = "/api/vehicles?limit=2000";
        if (debouncedSearch.trim()) {
          url += `&searchTerm=${encodeURIComponent(debouncedSearch)}`;
        }
        
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to fetch");
        setVehicles(data.data || []);
        writeVehicleCache(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading vehicles");
      } finally {
        setLoading(false);
      }
    }
    
    fetchVehicles();
    return onVehicleCacheUpdate((nextVehicles) => {
      setVehicles(nextVehicles);
      setIsRefreshing(false);
    });
  }, [router, debouncedSearch]);

  // Extract unique brands
  const brands = useMemo<string[]>(() => {
    const brandSet = new Set(vehicles.map(v => v.Brand).filter(Boolean));
    return ["All", ...Array.from(brandSet).sort()];
  }, [vehicles]);

  // Filter vehicles (client-side filtering for category, condition, brand only)
  // Search is now handled server-side for better performance with large datasets
  const filteredVehicles = useMemo<Vehicle[]>(() => {
    let result = [...vehicles];
    
    // Note: Search is handled server-side via API query parameter
    // Only apply client-side filters for dropdown filters
    
    if (categoryFilter !== "All") {
      result = result.filter(v => v.Category === categoryFilter);
    }
    
    if (conditionFilter !== "All") {
      result = result.filter(v => v.Condition === conditionFilter);
    }
    
    if (brandFilter !== "All") {
      result = result.filter(v => v.Brand === brandFilter);
    }
    
    return result;
  }, [vehicles, categoryFilter, conditionFilter, brandFilter]);

  // Fuzzy suggestions when search returns no exact matches
  const fuzzySuggestions = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return [];
    if (!debouncedSearch || debouncedSearch.trim().length < 2) return [];
    if (filteredVehicles.length > 0) return [];

    return getFuzzySuggestions(debouncedSearch, vehicles, {
      limit: 5,
      minScore: 0.3,
    });
  }, [vehicles, debouncedSearch, filteredVehicles.length]);

  const handleDelete = async (vehicle: Vehicle) => {
    if (!isAdmin) return;
    const ok = confirm(`Delete ${vehicle.Brand} ${vehicle.Model}?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/vehicles/${vehicle.VehicleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setVehicles(prev => prev.filter(v => v.VehicleId !== vehicle.VehicleId));
      writeVehicleCache(vehicles.filter(v => v.VehicleId !== vehicle.VehicleId));
    } catch (err) {
      alert("Failed to delete vehicle");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshVehicleCache();
    setIsRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="bg-white rounded-[30px] shadow-sm p-8">
          <div className="w-12 h-12 border-4 border-[#2ecc71] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#718096] mt-4 text-lg">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="bg-white rounded-[30px] shadow-sm p-8 max-w-md mx-auto mt-20 text-center">
          <p className="text-[#e74c3c] font-medium text-lg mb-4">{error}</p>
          <button 
            onClick={handleRefresh}
            className="px-8 py-3 bg-[#e74c3c] text-white rounded-2xl shadow-sm active:bg-slate-100 font-semibold transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-[30px] shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2d3748]">Vehicles</h1>
            <p className="text-lg text-[#718096] mt-2">{filteredVehicles.length} of {vehicles.length} vehicles</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('openAddVehicleModal'))}
                className="px-6 py-4 bg-[#2ecc71] text-white rounded-xl shadow-sm active:bg-slate-100 font-semibold transition-all flex items-center gap-2"
              >
                + Add Vehicle
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="px-6 py-4 bg-white text-[#2d3748] rounded-xl shadow-sm active:bg-slate-100 font-semibold transition-all flex items-center gap-2"
            >
              {Icons.refresh}
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-[30px] shadow-sm p-6 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <NeuInput 
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Icons.search}
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  showFilters
                    ? 'bg-[#2ecc71] text-white shadow-sm active:bg-slate-100'
                    : 'bg-white text-[#2d3748] shadow-sm active:bg-slate-100'
                }`}
              >
                {Icons.filter}
                Filters
              </button>
              <button
                onClick={() => window.print()}
                className="p-3 bg-white text-[#2d3748] rounded-xl shadow-sm active:bg-slate-100 font-semibold transition-all flex items-center gap-2"
              >
                {Icons.print}
                Print
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-white rounded-full shadow-sm px-6 py-4 outline-none text-[#2d3748] text-base appearance-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Cars">Cars</option>
                  <option value="Motorcycles">Motorcycles</option>
                  <option value="Tuk Tuk">Tuk Tuk</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#718096] pointer-events-none">
                  {Icons.chevronDown}
                </div>
              </div>
              <div className="relative">
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="w-full bg-white rounded-full shadow-sm px-6 py-4 outline-none text-[#2d3748] text-base appearance-none cursor-pointer"
                >
                  <option value="All">All Conditions</option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#718096] pointer-events-none">
                  {Icons.chevronDown}
                </div>
              </div>
              <div className="relative">
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="w-full bg-white rounded-full shadow-sm px-6 py-4 outline-none text-[#2d3748] text-base appearance-none cursor-pointer"
                >
                  {brands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#718096] pointer-events-none">
                  {Icons.chevronDown}
                </div>
              </div>
              <NeuInput 
                type="number"
                placeholder="Year"
                value=""
                onChange={() => {}}
              />
            </div>
          )}
        </div>

        {/* Vehicle List - Horizontal Scroll Container with Table Headers */}
        <div className="bg-white rounded-[30px] shadow-sm p-6">
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="min-w-[1400px]">
              {/* Table Header */}
              <div className="flex items-center gap-4 px-4 py-3 mb-3 bg-white rounded-[16px] shadow-sm text-sm font-semibold text-[#4a4a5a] uppercase tracking-wider">
                <div className="w-16 shrink-0 text-center">Image</div>
                <div className="w-56 shrink-0">Brand / Model</div>
                <div className="w-24 shrink-0 text-center">Year</div>
                <div className="w-32 shrink-0 text-center">Category</div>
                <div className="w-32 shrink-0 text-center">Plate</div>
                <div className="flex-1 min-w-[320px]">Prices</div>
                <div className="w-auto shrink-0 text-right pr-4">Actions</div>
              </div>
              
              {/* Table Rows */}
              <div className="space-y-3">
                {filteredVehicles.map((vehicle) => (
                  <VehicleRow 
                    key={vehicle.VehicleId} 
                    vehicle={vehicle} 
                    onClick={() => router.push(`/vehicles/${vehicle.VehicleId}/view`)}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredVehicles.length === 0 && (
          <div className="space-y-6">
            {/* Fuzzy Suggestions */}
            {fuzzySuggestions.length > 0 && (
              <SearchSuggestions
                suggestions={fuzzySuggestions}
                searchTerm={debouncedSearch}
                onSelect={(suggestion) => {
                  const suggestedSearch = `${suggestion.vehicle.Brand} ${suggestion.vehicle.Model}`.trim();
                  setSearchQuery(suggestedSearch);
                }}
              />
            )}

            <div className="bg-white rounded-[30px] shadow-sm p-12 text-center">
              <p className="text-[#718096] text-xl mb-2">No vehicles found</p>
              <p className="text-[#718096] text-base">Try adjusting your filters</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
