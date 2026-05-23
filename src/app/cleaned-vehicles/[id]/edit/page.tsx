"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import ImageModal from "@/app/components/ImageModal";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getVehicleFullImageUrl, getVehicleThumbnailUrl, formatPrice } from "@/lib/vehicle-helpers";
import { GlassToast, useToast } from "@/components/ui/glass/GlassToast";

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

type VehicleFormData = Omit<CleanedVehicleDetail, 'id' | 'created_at' | 'updated_at'>;

export default function VehicleDetailEdit() {
  const user = useAuthUser();
  const router = useRouter();
  const params = useParams();
  const { toasts, removeToast, success: showSuccessToast } = useToast();

  const id = params.id as string;
  const [vehicle, setVehicle] = useState<CleanedVehicleDetail | null>(null);
  const [formData, setFormData] = useState<VehicleFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchVehicle = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cleaned-vehicles/${id}`);
      if (!res.ok) throw new Error("Vehicle not found");
      const data = await res.json();
      if (data.success) {
        setVehicle(data.data);
        setFormData(data.data);
      } else {
        throw new Error(data.error || "Failed to load vehicle");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading vehicle";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: name === 'year' || name === 'market_price' ? parseFloat(value) || 0 : value } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/cleaned-vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      showSuccessToast("Vehicle updated successfully!");
      setVehicle((prev) => (prev ? { ...prev, ...formData } : prev)); // Update local view
      router.push(`/cleaned-vehicles/${id}/view`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
    } finally {
      setSaving(false);
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
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle || !formData) {
    return (
      <div className="min-h-dvh overflow-x-hidden bg-slate-50">
        <TopBar user={user} />
        <Sidebar user={user} />
        <main className="px-4 py-8 pt-20 lg:pl-64">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-4 text-center shadow-lg sm:p-8">
            <h1 className="mb-4 break-words text-xl font-bold text-slate-800 sm:text-2xl">{error || "Vehicle not found"}</h1>
            <button onClick={() => router.back()} className="min-h-11 rounded-xl bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700">
              Go Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Real-time derived prices
  const price40 = formData.market_price * 0.4;
  const price70 = formData.market_price * 0.7;

  const categories = ['Cars', 'Motorcycles', 'TukTuks', 'Trucks', 'Vans', 'Buses', 'Other'];

  return (
    <div className="min-h-dvh overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <TopBar user={user} />
      <Sidebar user={user} />
      <GlassToast toasts={toasts} onRemove={removeToast} />

      <main className="pt-16 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pl-64">
        <div className="mx-auto max-w-4xl px-3 py-6 sm:px-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => router.back()}
              className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 font-medium text-slate-600 hover:text-slate-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to list
            </button>
            <h1 className="break-words text-2xl font-bold text-slate-800 sm:text-3xl">Edit Vehicle #{vehicle.id}</h1>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-4 shadow-xl sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              {/* Image Preview */}
              <div className="min-w-0">
                <label className="block text-sm font-semibold text-slate-700 mb-4">Vehicle Image</label>
                {vehicle.image_id ? (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(getVehicleFullImageUrl(vehicle.image_id))}
                    className="block aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl shadow-lg transition-all hover:shadow-xl"
                  >
                    <img
                      src={getVehicleThumbnailUrl(vehicle.image_id) || "/placeholder-car.svg"}
                      alt="Vehicle"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex aspect-[4/3] w-full max-w-sm items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 text-slate-400">
                    No Image
                  </div>
                )}
              </div>

              {/* Quick Stats (readonly during edit) */}
              <div className="min-w-0 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-500">Market Price</label>
                  <input
                    name="market_price"
                    type="number"
                    value={formData.market_price || ''}
                    onChange={handleInputChange}
                    className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-bold transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-lg"
                    placeholder="Enter market price"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-center sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 block text-sm text-slate-500">DOC 40%</label>
                    <p className="break-words text-lg font-bold text-slate-800 sm:text-xl">{formatPrice(price40)}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="mb-1 block text-sm text-slate-500">DOC 70%</label>
                    <p className="break-words text-lg font-bold text-slate-800 sm:text-xl">{formatPrice(price70)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Brand</label>
                <input
                  name="brand"
                  type="text"
                  value={formData.brand || ''}
                  onChange={handleInputChange}
                  title="Enter vehicle brand"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Model</label>
                <input
                  name="model"
                  type="text"
                  value={formData.model || ''}
                  onChange={handleInputChange}
                  title="Enter vehicle model"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Year</label>
                <input
                  name="year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year || ''}
                  onChange={handleInputChange}
                  title="Enter vehicle year"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Plate</label>
                <input
                  name="plate"
                  type="text"
                  value={formData.plate || ''}
                  onChange={handleInputChange}
                  title="Enter vehicle plate"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-base uppercase transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Category</label>
                <select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                  title="Select vehicle category"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Condition</label>
                <select
                  name="condition"
                  value={formData.condition || ''}
                  onChange={handleInputChange}
                  title="Select vehicle condition"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  required
                >
                  <option value="">Select condition</option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Color</label>
                <input
                  name="color"
                  type="text"
                  value={formData.color || ''}
                  onChange={handleInputChange}
                  title="Enter vehicle color"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base capitalize transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Body Type</label>
                <input
                  name="body_type"
                  type="text"
                  value={formData.body_type || ''}
                  onChange={handleInputChange}
                  title="Enter vehicle body type"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-500">Tax Type</label>
                <input
                  name="tax_type"
                  type="text"
                  value={formData.tax_type || ''}
                  onChange={handleInputChange}
                  title="Enter vehicle tax type"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-base transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:mt-12 sm:flex-row sm:gap-4 sm:pt-8">
              <button
                type="submit"
                disabled={saving}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:bg-emerald-600 hover:shadow-xl disabled:bg-emerald-400 sm:px-8 sm:text-lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/cleaned-vehicles/${id}/view`)}
                disabled={saving}
                className="min-h-12 flex-1 rounded-2xl bg-slate-100 px-6 py-4 text-base font-bold text-slate-700 shadow-lg transition-all duration-200 hover:bg-slate-200 hover:shadow-xl disabled:bg-slate-50 sm:px-8 sm:text-lg"
              >
                Cancel
              </button>
            </div>
          </form>

          {selectedImage && (
            <ImageModal
              isOpen={true}
              imageUrl={selectedImage}
              alt="Vehicle"
              onClose={() => setSelectedImage(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

