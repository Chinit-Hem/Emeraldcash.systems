"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import type { LmsCategory } from "@/lib/lms-types";
import {
  ArrowLeft,
  BookOpen,
  Edit2,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function CategoriesAdminPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user?.role === "Admin";
  
  const [categories, setCategories] = useState<LmsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("emerald");
  const [formOrder, setFormOrder] = useState(0);

  const colorOptions = [
    { value: "emerald", label: "Emerald", class: "bg-emerald-500" },
    { value: "blue", label: "Blue", class: "bg-blue-500" },
    { value: "purple", label: "Purple", class: "bg-purple-500" },
    { value: "orange", label: "Orange", class: "bg-orange-500" },
    { value: "amber", label: "Amber", class: "bg-amber-500" },
    { value: "rose", label: "Rose", class: "bg-rose-500" },
  ];

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/lms/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/lms");
      return;
    }
    fetchCategories();
  }, [isAdmin, router, fetchCategories]);

  const handleSave = async () => {
    if (!formName.trim()) {
      setError("Category name is required");
      return;
    }

    setSaving(true);
    setError("");

    // OPTIMISTIC UPDATE: Update UI immediately before API response
    const optimisticCategory: LmsCategory = {
      id: editingId || Date.now(), // Temporary ID for new categories
      name: formName.trim(),
      description: formDescription.trim(),
      color: formColor,
      order_index: formOrder,
      icon: "BookOpen",
      is_active: true,
      lesson_count: 0, // New categories have 0 lessons
    };

    // Update local state immediately (optimistic)
    if (editingId) {
      setCategories(prev => prev.map(c => c.id === editingId ? optimisticCategory : c));
    } else {
      setCategories(prev => [...prev, optimisticCategory]);
    }
    resetForm(); // Close form immediately for better UX

    try {
      const url = editingId 
        ? `/api/lms/categories?id=${editingId}`
        : "/api/lms/categories";
      
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          color: formColor,
          order_index: formOrder,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        // Replace optimistic data with real data from server
        if (editingId) {
          setCategories(prev => prev.map(c => c.id === editingId ? data.data : c));
        } else {
          setCategories(prev => prev.map(c => c.id === optimisticCategory.id ? data.data : c));
        }
        // ❌ REMOVED: await fetchCategories(); - No need to refetch all data!
      } else {
        // Rollback on error
        if (editingId) {
          setCategories(prev => prev.map(c => c.id === editingId ? categories.find(oc => oc.id === editingId) || c : c));
        } else {
          setCategories(prev => prev.filter(c => c.id !== optimisticCategory.id));
        }
        setError(data.error || "Failed to save category");
      }
    } catch {
      // Rollback on error
      if (editingId) {
        setCategories(prev => prev.map(c => c.id === editingId ? categories.find(oc => oc.id === editingId) || c : c));
      } else {
        setCategories(prev => prev.filter(c => c.id !== optimisticCategory.id));
      }
      setError("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category? All lessons in this category will also be deleted.")) {
      return;
    }

    try {
      const res = await fetch(`/api/lms/categories?id=${id}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchCategories();
      } else {
        setError(data.error || "Failed to delete category");
      }
    } catch {
      setError("Failed to delete category");
    }
  };

  const startEdit = (category: LmsCategory) => {
    setEditingId(category.id);
setFormName(category.name);
    setFormDescription(category.description || "");
    setFormColor(category.color || "");
    setFormOrder(category.order_index);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormColor("emerald");
    setFormOrder(categories.length);
    setShowAddForm(false);
    setError("");
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/lms")}
            className="p-2.5 rounded-xl bg-white shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] text-slate-600 hover:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Manage Categories</h1>
              <p className="text-sm text-slate-500">Create and edit training categories</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-8 p-6 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "Edit Category" : "Add New Category"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Vehicle Basics"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this category..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                  <select
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {colorOptions.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Category"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-8 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add New Category
          </button>
        )}

        {/* Categories List */}
        <div className="grid gap-4">
          {categories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Categories Yet</h3>
              <p className="text-slate-500">Create your first category to get started</p>
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-6 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] hover:shadow-[12px_12px_32px_#e2e8f0,-12px_-12px_32px_#ffffff] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${category.color}-500 flex items-center justify-center text-white shadow-lg`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{category.name}</h3>
                    <p className="text-sm text-slate-500">{category.description || "No description"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                        Order: {category.order_index}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600 capitalize">
                        {category.color}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(category)}
                    className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all active:scale-95"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
