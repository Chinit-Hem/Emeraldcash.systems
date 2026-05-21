"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import type { LessonWithStatus, LmsCategory } from "@/lib/lms-types";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit2,
  Loader2,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface LessonFormData {
  title: string;
  description: string;
  category_id: number;
  youtube_url: string;
  duration_minutes: number;
  order_index: number;
  is_active: boolean;
  allowed_roles: string[];
}

const LESSON_AUDIENCE_ROLES = ["Staff", "Accounting"] as const;
const DEFAULT_LESSON_AUDIENCE = [...LESSON_AUDIENCE_ROLES];

function normalizeLessonAudience(allowedRoles?: string[]) {
  const roles = new Set(allowedRoles?.filter((role) => LESSON_AUDIENCE_ROLES.includes(role as typeof LESSON_AUDIENCE_ROLES[number])));
  return roles.size > 0 ? [...roles] : [...DEFAULT_LESSON_AUDIENCE];
}

function getAudienceLabel(allowedRoles?: string[]) {
  const roles = normalizeLessonAudience(allowedRoles);
  const staffEnabled = roles.includes("Staff");
  const accountingEnabled = roles.includes("Accounting");

  if (staffEnabled && accountingEnabled) return "All staff";
  if (accountingEnabled) return "Accounting only";
  return "Staff only";
}

export default function LessonsAdminPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user?.role === "Admin";
  
  const [categories, setCategories] = useState<LmsCategory[]>([]);
  const [lessons, setLessons] = useState<LessonWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState<LessonFormData>({
    title: "",
    description: "",
    category_id: 0,
    youtube_url: "",
    duration_minutes: 10,
    order_index: 0,
    is_active: true,
    allowed_roles: [...DEFAULT_LESSON_AUDIENCE],
  });

  const fetchData = useCallback(async () => {
    try {
      const [catRes, lessonsRes] = await Promise.all([
        fetch("/api/lms/categories"),
        fetch("/api/lms/lessons?all=true"),
      ]);
      
      const catData = await catRes.json();
      const lessonsData = await lessonsRes.json();
      
      if (catData.success) {
        setCategories(catData.data);
        if (catData.data.length > 0 && formData.category_id === 0) {
          setFormData(prev => ({ ...prev, category_id: catData.data[0].id }));
        }
      }
      
      if (lessonsData.success) {
        setLessons(lessonsData.data);
      }
    } catch (_err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [formData.category_id]);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/lms");
      return;
    }
    fetchData();
  }, [isAdmin, router, fetchData]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError("Lesson title is required");
      return;
    }
    if (!formData.category_id) {
      setError("Please select a category");
      return;
    }
    if (formData.allowed_roles.length === 0) {
      setError("Select at least one role for lesson visibility");
      return;
    }

    setSaving(true);
    setError("");

    // OPTIMISTIC UPDATE: Update UI immediately before API response
    const optimisticLesson: LessonWithStatus = {
      id: editingId || Date.now(),
      title: formData.title.trim(),
      description: formData.description,
      category_id: formData.category_id,
      youtube_url: formData.youtube_url,
      youtube_video_id: "", // Will be set by server
      duration_minutes: formData.duration_minutes,
      order_index: formData.order_index,
      is_completed: false,
      is_unlocked: true,
      completed_at: null,
      category_name: categories.find(c => c.id === formData.category_id)?.name || "",
      category_color: categories.find(c => c.id === formData.category_id)?.color || "emerald",
      allowed_roles: formData.allowed_roles,
    };

    // Update local state immediately (optimistic)
    if (editingId) {
      setLessons(prev => prev.map(l => l.id === editingId ? optimisticLesson : l));
    } else {
      setLessons(prev => [...prev, optimisticLesson]);
    }
    resetForm(); // Close form immediately for better UX

    try {
      const url = editingId 
        ? `/api/lms/lessons?id=${editingId}`
        : "/api/lms/lessons";
      
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        // Replace optimistic data with real data from server
        if (editingId) {
          setLessons(prev => prev.map(l => l.id === editingId ? { ...data.data, is_completed: l.is_completed, is_unlocked: l.is_unlocked, completed_at: l.completed_at, category_name: categories.find(c => c.id === data.data.category_id)?.name || "", category_color: categories.find(c => c.id === data.data.category_id)?.color || "emerald" } : l));
        } else {
          setLessons(prev => prev.map(l => l.id === optimisticLesson.id ? { ...data.data, is_completed: false, is_unlocked: true, completed_at: null, category_name: categories.find(c => c.id === data.data.category_id)?.name || "", category_color: categories.find(c => c.id === data.data.category_id)?.color || "emerald" } : l));
        }
        // ❌ REMOVED: await fetchData(); - No need to refetch all data!
      } else {
        // Rollback on error
        if (editingId) {
          setLessons(prev => prev.map(l => l.id === editingId ? lessons.find(ol => ol.id === editingId) || l : l));
        } else {
          setLessons(prev => prev.filter(l => l.id !== optimisticLesson.id));
        }
        setError(data.error || "Failed to save lesson");
      }
    } catch (_err) {
      // Rollback on error
      if (editingId) {
        setLessons(prev => prev.map(l => l.id === editingId ? lessons.find(ol => ol.id === editingId) || l : l));
      } else {
        setLessons(prev => prev.filter(l => l.id !== optimisticLesson.id));
      }
      setError("Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this lesson?")) {
      return;
    }

    try {
      const res = await fetch(`/api/lms/lessons?id=${id}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchData();
      } else {
        setError(data.error || "Failed to delete lesson");
      }
    } catch (_err) {
      setError("Failed to delete lesson");
    }
  };

  const startEdit = (lesson: LessonWithStatus) => {
    setEditingId(lesson.id);
    setFormData({
      title: lesson.title,
      description: lesson.description || "",
      category_id: lesson.category_id,
      youtube_url: lesson.youtube_url || "",
      duration_minutes: lesson.duration_minutes || 10,
      order_index: lesson.order_index,
      is_active: true, // Default to active, API doesn't return this
      allowed_roles: normalizeLessonAudience(lesson.allowed_roles),
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      category_id: categories[0]?.id || 0,
      youtube_url: "",
      duration_minutes: 10,
      order_index: lessons.filter(l => l.category_id === categories[0]?.id).length,
      is_active: true,
      allowed_roles: [...DEFAULT_LESSON_AUDIENCE],
    });
    setShowAddForm(false);
    setError("");
  };

  const toggleCategory = (catId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catId)) {
        newSet.delete(catId);
      } else {
        newSet.add(catId);
      }
      return newSet;
    });
  };

  const toggleAudienceRole = (role: typeof LESSON_AUDIENCE_ROLES[number]) => {
    setFormData((prev) => {
      const nextRoles = prev.allowed_roles.includes(role)
        ? prev.allowed_roles.filter((item) => item !== role)
        : [...prev.allowed_roles, role];

      return {
        ...prev,
        allowed_roles: nextRoles,
      };
    });
  };

  // MEMOIZED: Filter lessons to avoid recomputation on every render
  const filteredLessons = useMemo(() => {
    if (selectedCategory === "all") return lessons;
    return lessons.filter(l => l.category_id === selectedCategory);
  }, [lessons, selectedCategory]);

  // MEMOIZED: Group lessons by category for better performance
  const lessonsByCategory = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      lessons: filteredLessons
        .filter(l => l.category_id === cat.id)
        .sort((a, b) => a.order_index - b.order_index),
    }));
  }, [categories, filteredLessons]);

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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center">
              <PlayCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Manage Lessons</h1>
              <p className="text-sm text-slate-500">Create and organize training content</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Filter by category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="px-4 py-2 rounded-xl bg-white shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] border-none text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-8 p-6 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "Edit Lesson" : "Add New Lesson"}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Lesson Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Introduction to Vehicle Valuation"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this lesson..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                    min={1}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Visible to</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {LESSON_AUDIENCE_ROLES.map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        formData.allowed_roles.includes(role)
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowed_roles.includes(role)}
                        onChange={() => toggleAudienceRole(role)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">{role}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Admin can always view every lesson. Accounting can also view normal Staff lessons.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">YouTube URL</label>
                <input
                  type="url"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-700">Active (visible to staff)</label>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Lesson"}
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
            className="mb-8 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add New Lesson
          </button>
        )}

        {/* Lessons by Category */}
        <div className="space-y-4">
          {lessonsByCategory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
              <PlayCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Lessons Yet</h3>
              <p className="text-slate-500">Create your first lesson to get started</p>
            </div>
          ) : (
            lessonsByCategory.map((category) => (
              (selectedCategory === "all" || selectedCategory === category.id) && (
                <div
                  key={category.id}
                  className="bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] overflow-hidden"
                >
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-${category.color}-500 flex items-center justify-center text-white shadow-lg`}>
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-800">{category.name}</h3>
                        <p className="text-sm text-slate-500">{category.lessons.length} lessons</p>
                      </div>
                    </div>
                    {expandedCategories.has(category.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  
                  {expandedCategories.has(category.id) && (
                    <div className="border-t border-slate-100">
                      {category.lessons.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                          No lessons in this category yet
                        </div>
                      ) : (
                        category.lessons.map((lesson, index) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-800">{lesson.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                  <Video className="w-4 h-4" />
                                  <span>Video</span>
                                  <span>•</span>
                                  <span>{lesson.duration_minutes || 0} min</span>
                                  <span>•</span>
                                  <span>{getAudienceLabel(lesson.allowed_roles)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit(lesson)}
                                className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all active:scale-95"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(lesson.id)}
                                className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            ))
          )}
        </div>
      </div>
    </div>
  );
}
