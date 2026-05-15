"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import ImageModal from "@/app/components/ImageModal";
import Sidebar from "@/app/components/Sidebar";
import TopBar from "@/app/components/TopBar";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

  const fetchVehicle = async () => {
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
  };

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle || !formData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopBar user={user} />
        <Sidebar user={user} />
        <main className="lg:pl-64 pt-16 p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">{error || "Vehicle not found"}</h1>
            <button onClick={() => router.back()} className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <TopBar user={user} />
      <Sidebar user={user} />
      <GlassToast toasts={toasts} onRemove={removeToast} />

      <main className="lg:pl-64 pt-16 pb-8">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to list
            </button>
            <h1 className="text-3xl font-bold text-slate-800">Edit Vehicle #{vehicle.id}</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Image Preview */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-4">Vehicle Image</label>
                {vehicle.image_id ? (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(getVehicleFullImageUrl(vehicle.image_id))}
                    className="block w-full max-w-sm aspect-[4/3] rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all"
                  >
                    <img
                      src={getVehicleThumbnailUrl(vehicle.image_id) || "/placeholder-car.svg"}
                      alt="Vehicle"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="w-full max-w-sm aspect-[4/3] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                    No Image
                  </div>
                )}
              </div>

              {/* Quick Stats (readonly during edit) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Market Price</label>
                  <input
                    name="market_price"
                    type="number"
                    value={formData.market_price || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-lg font-bold"
                    placeholder="Enter market price"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-center p-4 bg-slate-50 rounded-xl">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">DOC 40%</label>
                    <p className="text-xl font-bold text-slate-800">{formatPrice(price40)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">DOC 70%</label>
                    <p className="text-xl font-bold text-slate-800">{formatPrice(price70)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Brand</label>
                <input
                  name="brand"
                  type="text"
                  value={formData.brand || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Model</label>
                <input
                  name="model"
                  type="text"
                  value={formData.model || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Year</label>
                <input
                  name="year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Plate</label>
                <input
                  name="plate"
                  type="text"
                  value={formData.plate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Category</label>
                <select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                >
                  <option value="">Select category</option>
                  <option value="Cars">Cars</option>
                  <option value="Motorcycles">Motorcycles</option>
                  <option value="TukTuks">TukTuks</option>
                  <option value="Trucks">Trucks</option>
                  <option value="Vans">Vans</option>
                  <option value="Buses">Buses</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Condition</label>
                <select
                  name="condition"
                  value={formData.condition || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                >
                  <option value="">Select condition</option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Color</label>
                <input
                  name="color"
                  type="text"
                  value={formData.color || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all capitalize"
                />
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Body Type</label>
                <input
                  name="body_type"
                  type="text"
                  value={formData.body_type || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Tax Type</label>
                <input
                  name="tax_type"
                  type="text"
                  value={formData.tax_type || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-12 pt-8 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
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
                className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-bold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-200"
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

