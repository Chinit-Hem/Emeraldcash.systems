"use client";

import { useAuthUser } from "@/shared/hooks/AuthContext";
import type { LmsCategory } from "@/systems/lms/types/lms-types";
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
import { LmsContentManagerTabs } from "../LmsContentManagerTabs";

const CATEGORY_COLOR_OPTIONS = [
  { value: "emerald", label: "Emerald", class: "bg-emerald-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "amber", label: "Amber", class: "bg-amber-500" },
  { value: "rose", label: "Rose", class: "bg-rose-500" },
] as const;

function sortCategoriesByOrder(categories: LmsCategory[]) {
  return [...categories].sort((a, b) => {
    const orderDifference = (a.order_index || 0) - (b.order_index || 0);
    if (orderDifference !== 0) return orderDifference;
    return a.id - b.id;
  });
}

function normalizeCategoryOrderIndexes(categories: LmsCategory[]) {
  return sortCategoriesByOrder(categories).map((category, index) => ({
    ...category,
    order_index: index + 1,
  }));
}

function getCategoryOrderChanges(
  originalCategories: LmsCategory[],
  normalizedCategories: LmsCategory[]
) {
  const originalById = new Map(
    originalCategories.map((category) => [category.id, category])
  );

  return normalizedCategories.filter((category) => {
    const originalCategory = originalById.get(category.id);
    return originalCategory && originalCategory.order_index !== category.order_index;
  });
}

async function repairCategoryOrderIndexes(categories: LmsCategory[]) {
  await Promise.all(
    categories.map((category) =>
      fetch(`/api/lms/categories?id=${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category.name,
          description: category.description ?? "",
          icon: category.icon ?? "BookOpen",
          color: category.color ?? "emerald",
          order_index: category.order_index,
          is_active: category.is_active ?? true,
        }),
      }).then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean;
        } | null;

        if (!response.ok || !payload?.success) {
          throw new Error("Failed to repair category order");
        }
      })
    )
  );
}

function getCategoryColorValueForOrder(orderIndex: number) {
  const safeOrderIndex = Math.max(1, orderIndex || 1);
  const colorIndex = (safeOrderIndex - 1) % CATEGORY_COLOR_OPTIONS.length;
  return CATEGORY_COLOR_OPTIONS[colorIndex]?.value ?? "emerald";
}

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

  const getCategoryColorClass = (color?: string | null) =>
    CATEGORY_COLOR_OPTIONS.find((option) => option.value === color)?.class ?? "bg-emerald-500";

  const getNextCategoryOrderIndex = useCallback(
    () =>
      categories.reduce(
        (maxOrderIndex, category) =>
          Math.max(maxOrderIndex, category.order_index || 0),
        0
      ) + 1,
    [categories]
  );

  const getNextCategoryColor = useCallback(
    () => getCategoryColorValueForOrder(getNextCategoryOrderIndex()),
    [getNextCategoryOrderIndex]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/lms/categories");
      const data = await res.json();
      if (data.success) {
        const loadedCategories = Array.isArray(data.data) ? data.data : [];
        const normalizedCategories = normalizeCategoryOrderIndexes(loadedCategories);
        const categoryOrderChanges = getCategoryOrderChanges(
          loadedCategories,
          normalizedCategories
        );

        setCategories(normalizedCategories);

        if (categoryOrderChanges.length > 0) {
          void repairCategoryOrderIndexes(categoryOrderChanges).catch(() => {
            setError("Failed to repair category order");
          });
        }
      }
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/lms", { scroll: false });
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
    setFormColor(category.color || getCategoryColorValueForOrder(category.order_index));
    setFormOrder(category.order_index);
    setShowAddForm(true);
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormOrder(getNextCategoryOrderIndex());
    setFormColor(getNextCategoryColor());
    setShowAddForm(true);
    setError("");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormOrder(getNextCategoryOrderIndex());
    setFormColor(getNextCategoryColor());
    setShowAddForm(false);
    setError("");
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-8">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3 sm:mb-8 sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={() => router.push("/lms", { scroll: false })}
            aria-label="Back to LMS"
            title="Back to LMS"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] transition-all hover:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 sm:h-12 sm:w-12">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold text-slate-800 sm:text-2xl">Manage Categories</h1>
              <p className="break-words text-sm text-slate-500">Create and edit training categories</p>
            </div>
          </div>
        </div>

        <LmsContentManagerTabs activeTab="categories" />

        {/* Error Message */}
        {error && (
          <div className="mb-6 break-words rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-8 rounded-2xl bg-white p-4 shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="min-w-0 break-words text-lg font-bold text-slate-800">
                {editingId ? "Edit Category" : "Add New Category"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Close category form"
                title="Close category form"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  title="Category name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Vehicle Basics"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  title="Category description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this category..."
                  rows={2}
                  className="min-h-[88px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="mb-1 block text-sm font-medium text-slate-700">Category Color</p>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full ${getCategoryColorClass(formColor)}`}
                      aria-hidden="true"
                    />
                    <span>Automatic</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {editingId
                      ? "Existing category color is preserved."
                      : "New category colors rotate automatically."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="mb-1 block text-sm font-medium text-slate-700">Category Order</p>
                  <p className="text-sm font-semibold text-slate-800">Automatic</p>
                  <p className="mt-1 text-xs text-slate-500">
                    New categories are placed at the end of the category list.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl active:scale-95 disabled:opacity-50 sm:w-auto"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Category"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-11 w-full rounded-xl bg-slate-100 px-6 py-3 font-medium text-slate-700 transition-all hover:bg-slate-200 active:scale-95 sm:w-auto"
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
            type="button"
            onClick={openAddForm}
            className="mb-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl active:scale-95 sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Add New Category
          </button>
        )}

        {/* Categories List */}
        <div className="grid gap-4">
          {categories.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-12 text-center shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] sm:rounded-3xl">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="mb-2 break-words text-lg font-semibold text-slate-800">No Categories Yet</h3>
              <p className="break-words text-slate-500">Create your first category to get started</p>
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] transition-all hover:shadow-[12px_12px_32px_#e2e8f0,-12px_-12px_32px_#ffffff] sm:rounded-3xl sm:p-6 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3 sm:gap-4 md:items-center">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getCategoryColorClass(category.color)} text-white shadow-lg sm:h-12 sm:w-12`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold text-slate-800">{category.name}</h3>
                    <p className="break-words text-sm text-slate-500">{category.description || "No description"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-sm text-slate-600">
                        Category Order: {category.order_index}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-sm capitalize text-slate-600">
                        {category.color}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex shrink-0 items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => startEdit(category)}
                    aria-label={`Edit ${category.name}`}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all hover:bg-blue-100 active:scale-95"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category.id)}
                    aria-label={`Delete ${category.name}`}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-all hover:bg-red-100 active:scale-95"
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
