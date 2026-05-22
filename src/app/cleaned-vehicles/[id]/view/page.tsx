"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import ImageModal from "@/app/components/ImageModal";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getVehicleFullImageUrl, getVehicleThumbnailUrl } from "@/lib/vehicle-helpers";
import { GlassToast, useToast } from "@/components/ui/glass/GlassToast";
import { VehicleHeader } from "@/app/components/vehicles/VehicleHeader";
import { VehicleStatsCard } from "@/app/components/vehicles/VehicleStatsCard";
import { TukTukIcon } from "@/components/icons/TukTukIcon";

interface CleanedVehicleDetail {
  id: number;
  category: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  market_price: number;
  tax_type: string | null;
  condition: string;
  body_type: string | null;
  color: string | null;
  image_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function VehicleDetailView() {
  const user = useAuthUser();
  const router = useRouter();
  const params = useParams();
  const { toasts, removeToast, error: showErrorToast } = useToast();

  const id = params.id as string;
  const [vehicle, setVehicle] = useState<CleanedVehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchVehicle = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cleaned-vehicles/${id}`);
      if (!res.ok) throw new Error("Vehicle not found");
      const data = await res.json();
      if (data.success) {
        setVehicle(data.data);
      } else {
        throw new Error(data.error || "Failed to load vehicle");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading vehicle";
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchVehicle();
  }, [fetchVehicle, id]);

  if (!user) {
    router.push("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p>Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopBar user={user} onMenuClick={() => {}} />
        <Sidebar user={user} onNavigate={() => {}} />
        <main className="lg:pl-64 pt-16 p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">{error || "Vehicle not found"}</h1>
            <button 
              onClick={() => router.back()} 
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              Go Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Calculate derived prices
  const price40 = vehicle.market_price * 0.4;
  const price70 = vehicle.market_price * 0.7;

  // Color hex for indicator
  const getColorHex = (colorName: string): string => {
    const colorMap = {
      "red": "#ef4444", "blue": "#3b82f6", "green": "#10b981", "yellow": "#f59e0b",
      "black": "#1a1a2e", "white": "#f8fafc", "silver": "#9ca3af", "gray": "#6b7280",
    };
    const normalized = colorName?.toLowerCase().trim() || "";
    return colorMap[normalized as keyof typeof colorMap] || "#6b7280";
  };

  // TukTuk special icon
  const isTukTuk = vehicle.category.toLowerCase().includes("tuk");
  const categoryIcon = isTukTuk ? (
    <TukTukIcon className="w-12 h-12" strokeWidth={1.5} />
  ) : (
    <svg className="w-12 h-12" stroke="currentColor" fill="none" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <TopBar user={user} />
      <Sidebar user={user} />

      <main className="lg:pl-64 pt-16 pb-8">
        <GlassToast toasts={toasts} onRemove={removeToast} />

        {/* Sticky Header */}
        <VehicleHeader 
          vehicleId={String(vehicle.id)}
          brand={vehicle.brand}
          model={vehicle.model}
          onEdit={() => router.push(`/cleaned-vehicles/${id}/edit`)}
          onDelete={() => {/* confirm delete */}}
        /> 

        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column: Image & Preview */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="relative">
                  <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    #{vehicle.id}
                  </div>
                  {vehicle.image_id ? (
                    <button
                      onClick={() => setSelectedImage(getVehicleFullImageUrl(vehicle.image_id))}
                      className="block w-full aspect-[4/3] rounded-xl overflow-hidden group hover:scale-105 transition-all duration-300 shadow-2xl"
                    >
                      <img
                        src={getVehicleThumbnailUrl(vehicle.image_id) || "/placeholder-car.svg"}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder-car.svg";
                        }}
                      />
                    </button>
                  ) : (
                    <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="p-2 bg-white/80 hover:bg-white rounded-full shadow-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center mt-6 gap-3">
                  {categoryIcon}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{vehicle.category}</h2>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Data Cards */}
            <div className="space-y-6 lg:col-span-1">
              {/* Stats Card */}
              <VehicleStatsCard
                marketPrice={vehicle.market_price}
                price40={price40}
                price70={price70}
              />

              {/* Specs Grid */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  Technical Specs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Brand</label>
                    <p className="text-lg font-semibold text-slate-800">{vehicle.brand}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Model</label>
                    <p className="text-lg font-semibold text-slate-800">{vehicle.model}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Year</label>
                    <p className="text-lg font-semibold text-slate-800">{vehicle.year}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Plate</label>
                    <p className="text-lg font-semibold text-slate-800 font-mono">{vehicle.plate}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Condition</label>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                      vehicle.condition === 'New' ? 'bg-emerald-100 text-emerald-800' :
                      vehicle.condition === 'Used' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {vehicle.condition}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Body Type</label>
                    <p className="text-lg font-semibold text-slate-800">{vehicle.body_type || '—'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Color</label>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded-full border-4 border-white shadow-sm ring-2 ring-slate-200" 
                        style={{ backgroundColor: getColorHex(vehicle.color || '') }}
                        title={vehicle.color || 'No color'}
                      />
                      <p className="text-lg font-semibold text-slate-800 capitalize">{vehicle.color || 'Not specified'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Tax Type</label>
                    <p className="text-lg font-semibold text-slate-800">{vehicle.tax_type || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Created</label>
                    <p className="text-lg font-semibold text-slate-800">{new Date(vehicle.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex gap-3">
                  <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200">
                    Edit Vehicle
                  </button>
                  <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200">
                    Delete Vehicle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedImage && (
        <ImageModal
          isOpen={true}
          imageUrl={selectedImage}
          alt={`${vehicle.brand} ${vehicle.model}`}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}

