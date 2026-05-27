"use client";

import { useAuthUser } from "@/shared/hooks/AuthContext";
import { extractYoutubeVideoId } from "@/systems/lms/types/lms-schema";
import type { LessonWithStatus, LmsCategory } from "@/systems/lms/types/lms-types";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
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
import { useCallback, useEffect, useId, useMemo, useState } from "react";

interface LessonFormData {
  title: string;
  description: string;
  category_id: number;
  youtube_url: string;
  duration_minutes: number | null;
  order_index: number;
  is_active: boolean;
  allowed_roles: string[];
}

type DurationLookupState = {
  status: "idle" | "loading" | "ready" | "error";
  message: string;
  videoId?: string;
};

type DurationLookupResponse = {
  success?: boolean;
  data?: {
    durationSeconds?: number;
    durationMinutes?: number;
    durationLabel?: string;
    videoId?: string;
  };
  error?: string;
};

const LESSON_AUDIENCE_ROLES = ["Staff", "Accounting"] as const;
const DEFAULT_LESSON_AUDIENCE = [...LESSON_AUDIENCE_ROLES];
const DURATION_IDLE_MESSAGE = "Waiting for YouTube URL.";
const CATEGORY_COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

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

function getCategoryColorClass(color?: string | null) {
  return CATEGORY_COLOR_CLASSES[color ?? ""] ?? "bg-emerald-500";
}

export default function LessonsAdminPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user?.role === "Admin";
  const formId = useId();
  const fieldIds = {
    filterCategory: `${formId}-filter-category`,
    title: `${formId}-title`,
    description: `${formId}-description`,
    category: `${formId}-category`,
    duration: `${formId}-duration`,
    audience: `${formId}-audience`,
    youtubeUrl: `${formId}-youtube-url`,
    order: `${formId}-order`,
  };
  
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
    duration_minutes: null,
    order_index: 0,
    is_active: true,
    allowed_roles: [...DEFAULT_LESSON_AUDIENCE],
  });
  const [durationLookup, setDurationLookup] = useState<DurationLookupState>({
    status: "idle",
    message: DURATION_IDLE_MESSAGE,
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
        const nextCategories = Array.isArray(catData.data) ? catData.data : [];
        setCategories(nextCategories);
        setFormData(prev =>
          nextCategories.length > 0 && prev.category_id === 0
            ? { ...prev, category_id: nextCategories[0].id }
            : prev
        );
      }
      
      if (lessonsData.success) {
        setLessons(lessonsData.data);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/lms");
      return;
    }
    fetchData();
  }, [isAdmin, router, fetchData]);

  useEffect(() => {
    if (!showAddForm) {
      setDurationLookup({
        status: "idle",
        message: DURATION_IDLE_MESSAGE,
      });
      return;
    }

    const url = formData.youtube_url.trim();
    const videoId = extractYoutubeVideoId(url);

    if (!url) {
      setDurationLookup({
        status: "idle",
        message: DURATION_IDLE_MESSAGE,
      });
      setFormData((prev) =>
        prev.duration_minutes === null ? prev : { ...prev, duration_minutes: null }
      );
      return;
    }

    if (!videoId) {
      setDurationLookup({
        status: "error",
        message: "Enter a valid YouTube URL to detect duration.",
      });
      setFormData((prev) =>
        prev.duration_minutes === null ? prev : { ...prev, duration_minutes: null }
      );
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setDurationLookup({
      status: "loading",
      message: "Reading duration from YouTube...",
      videoId,
    });

    fetch("/api/lms/youtube-duration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ youtubeUrl: url }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | DurationLookupResponse
          | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error ?? "Could not read this video's duration.");
        }

        const durationMinutes = payload.data?.durationMinutes;
        const durationLabel = payload.data?.durationLabel;

        if (!durationMinutes || durationMinutes < 1) {
          throw new Error("Could not read this video's duration.");
        }

        if (cancelled) {
          return;
        }

        setFormData((prev) =>
          prev.youtube_url.trim() === url
            ? { ...prev, duration_minutes: durationMinutes }
            : prev
        );
        setDurationLookup({
          status: "ready",
          message: `Detected ${durationLabel ?? `${durationMinutes} min`} from YouTube.`,
          videoId,
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (!cancelled) {
          setDurationLookup({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not load YouTube metadata. Check your connection and try again.",
            videoId,
          });
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [formData.youtube_url, showAddForm]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError("Lesson title is required");
      return;
    }
    if (!formData.category_id) {
      setError("Please select a category");
      return;
    }
    if (!formData.youtube_url.trim()) {
      setError("YouTube URL is required");
      return;
    }
    if (!extractYoutubeVideoId(formData.youtube_url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    if (durationLookup.status === "loading") {
      setError("Please wait for the video duration to load");
      return;
    }
    if (!formData.duration_minutes || formData.duration_minutes < 1) {
      setError("Video duration must load automatically before saving");
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
      is_active: formData.is_active,
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
    } catch {
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
    } catch {
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
      duration_minutes: lesson.duration_minutes ?? null,
      order_index: lesson.order_index,
      is_active: lesson.is_active ?? true,
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
      duration_minutes: null,
      order_index: lessons.filter(l => l.category_id === categories[0]?.id).length,
      is_active: true,
      allowed_roles: [...DEFAULT_LESSON_AUDIENCE],
    });
    setDurationLookup({
      status: "idle",
      message: DURATION_IDLE_MESSAGE,
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

  const handleYoutubeUrlChange = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      youtube_url: url,
      duration_minutes: prev.youtube_url === url ? prev.duration_minutes : null,
    }));
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
            onClick={() => router.push("/lms")}
            aria-label="Back to LMS"
            title="Back to LMS"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] transition-all hover:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 sm:h-12 sm:w-12">
              <PlayCircle className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold text-slate-800 sm:text-2xl">Manage Lessons</h1>
              <p className="break-words text-sm text-slate-500">Create and organize training content</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 break-words rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor={fieldIds.filterCategory} className="text-sm font-medium text-slate-700">Filter by category:</label>
          <select
            id={fieldIds.filterCategory}
            title="Filter lessons by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="min-h-11 w-full rounded-xl border-none bg-white px-4 py-2 text-sm text-slate-700 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-8 rounded-2xl bg-white p-4 shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="min-w-0 break-words text-lg font-bold text-slate-800">
                {editingId ? "Edit Lesson" : "Add New Lesson"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Close lesson form"
                title="Close lesson form"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid gap-4">
              <div>
                <label htmlFor={fieldIds.title} className="block text-sm font-medium text-slate-700 mb-1">Lesson Title</label>
                <input
                  id={fieldIds.title}
                  type="text"
                  title="Lesson title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Introduction to Vehicle Valuation"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor={fieldIds.description} className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  id={fieldIds.description}
                  title="Lesson description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this lesson..."
                  rows={2}
                  className="min-h-[88px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={fieldIds.category} className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    id={fieldIds.category}
                    title="Lesson category"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <p id={fieldIds.duration} className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</p>
                  <div
                    role="status"
                    aria-live="polite"
                    aria-labelledby={fieldIds.duration}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-4 py-3 text-base sm:text-sm ${
                      durationLookup.status === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : durationLookup.status === "ready"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {durationLookup.status === "loading" ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : durationLookup.status === "error" ? (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0" />
                    )}
                    <span className="min-w-0 break-words font-medium">
                      {formData.duration_minutes && formData.duration_minutes > 0
                        ? `${formData.duration_minutes} min`
                        : "Auto from video"}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs text-slate-500">
                    {durationLookup.message}
                  </p>
                </div>
              </div>

              <div>
                <p id={fieldIds.audience} className="block text-sm font-medium text-slate-700 mb-2">Visible to</p>
                <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby={fieldIds.audience}>
                  {LESSON_AUDIENCE_ROLES.map((role) => (
                    <label
                      key={role}
                      className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
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
                      <span className="min-w-0 break-words text-sm font-medium">{role}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 break-words text-sm text-slate-500">
                  Admin can always view every lesson. Accounting can also view normal Staff lessons.
                </p>
              </div>

              <div>
                <label htmlFor={fieldIds.youtubeUrl} className="block text-sm font-medium text-slate-700 mb-1">YouTube URL</label>
                <input
                  id={fieldIds.youtubeUrl}
                  type="url"
                  title="YouTube URL"
                  value={formData.youtube_url}
                  onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={fieldIds.order} className="block text-sm font-medium text-slate-700 mb-1">Order</label>
                  <input
                    id={fieldIds.order}
                    type="number"
                    title="Lesson order"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                  />
                </div>
                
                <label htmlFor="is_active" className="flex min-h-11 items-start gap-3 sm:pt-8">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="min-w-0 break-words text-sm text-slate-700">Active (visible to staff)</span>
                </label>
              </div>
              
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl active:scale-95 disabled:opacity-50 sm:w-auto"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Lesson"}
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
            onClick={() => setShowAddForm(true)}
            className="mb-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl active:scale-95 sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Add New Lesson
          </button>
        )}

        {/* Lessons by Category */}
        <div className="space-y-4">
          {lessonsByCategory.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-12 text-center shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] sm:rounded-3xl">
              <PlayCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="mb-2 break-words text-lg font-semibold text-slate-800">No Lessons Yet</h3>
              <p className="break-words text-slate-500">Create your first lesson to get started</p>
            </div>
          ) : (
            lessonsByCategory.map((category) => (
              (selectedCategory === "all" || selectedCategory === category.id) && (
                <div
                  key={category.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] sm:rounded-3xl"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={expandedCategories.has(category.id)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/50 sm:p-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getCategoryColorClass(category.color)} text-white shadow-lg`}>
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <h3 className="break-words text-lg font-bold text-slate-800">{category.name}</h3>
                        <p className="break-words text-sm text-slate-500">{category.lessons.length} lessons</p>
                      </div>
                    </div>
                    {expandedCategories.has(category.id) ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                    )}
                  </button>
                  
                  {expandedCategories.has(category.id) && (
                    <div className="border-t border-slate-100">
                      {category.lessons.length === 0 ? (
                        <div className="break-words p-6 text-center text-slate-500">
                          No lessons in this category yet
                        </div>
                      ) : (
                        category.lessons.map((lesson, index) => (
                          <div
                            key={lesson.id}
                            className="flex flex-col gap-3 border-b border-slate-100 p-4 transition-colors last:border-b-0 hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-500">
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <h4 className="break-words font-medium text-slate-800">{lesson.title}</h4>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                                  <Video className="h-4 w-4 shrink-0" />
                                  <span>Video</span>
                                  <span>•</span>
                                  <span>{lesson.duration_minutes || 0} min</span>
                                  <span>•</span>
                                  <span>{getAudienceLabel(lesson.allowed_roles)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => startEdit(lesson)}
                                aria-label={`Edit ${lesson.title}`}
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all hover:bg-blue-100 active:scale-95"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(lesson.id)}
                                aria-label={`Delete ${lesson.title}`}
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-all hover:bg-red-100 active:scale-95"
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
