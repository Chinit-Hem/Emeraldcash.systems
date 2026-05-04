/**
 * LMS Dashboard - Beautiful, Clean, Professional, Advanced, Standard Design
 *
 * Design Philosophy:
 * - Glassmorphism + Neumorphism fusion for modern tactile feel
 * - Professional color palette with emerald accents
 * - Advanced micro-interactions and smooth animations
 * - Clean typography hierarchy
 * - Standard component patterns for maintainability
 *
 * @module LmsDashboard
 */

"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation } from "@/lib/i18n";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  Users,
  Trophy,
  PlayCircle,
  BarChart3,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
  RefreshCw,
  Download,
  Search,
  Award,
  TrendingUp,
  ChevronRight,
  Target,
  Zap,
  LucideIcon
} from "lucide-react";

import {
  LmsDashboardStats,
  LmsCategory,
  LessonWithStatus,
  StaffProgress,
  InitialLmsData
} from "@/lib/lms-types";
import { useAuthUser } from "@/app/components/AuthContext";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import LmsErrorBoundary from "./LmsErrorBoundary";

type TabType = "learning" | "progress" | "achievements" | "my-process";

// API Service
class LmsApiService {
  private static readonly BASE_URL = "/api/lms";
  private static readonly TIMEOUT = 10000;

  private static async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: "include"
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      // Don't throw for abort errors (component unmounted or request cancelled)
      if (error instanceof Error && error.name === 'AbortError') {
        return new Response(null, { status: 499, statusText: 'Client Closed Request' });
      }
      throw error;
    }
  }

  static async fetchDashboardData(): Promise<LmsDashboardStats | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.BASE_URL}/dashboard`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      return null;
    }
  }

  static async fetchCategories(): Promise<LmsCategory[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.BASE_URL}/categories`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error("Categories fetch error:", error);
      return [];
    }
  }

  static async fetchAllLessons(categories: LmsCategory[]): Promise<LessonWithStatus[]> {
    if (!categories.length) return [];
    const lessonPromises = categories.map(async (category) => {
      const response = await this.fetchWithTimeout(`${this.BASE_URL}/lessons?categoryId=${category.id}&sequential=true`);
      if (!response.ok) return [];
      const data = await response.json();
      const lessons = data.success ? data.data : [];
      return lessons.map((lesson: LessonWithStatus) => ({
        ...lesson,
        category_name: category.name,
        category_color: category.color,
      }));
    });
    const allLessonsArrays = await Promise.all(lessonPromises);
    return allLessonsArrays.flat().sort((a, b) => {
      if (a.category_id !== b.category_id) return a.category_id - b.category_id;
      return a.order_index - b.order_index;
    });
  }
}

// Skeleton Component
function CardSkeleton() {
  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#f0f4f8] to-[#e6e9ef] shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 rounded-xl bg-slate-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-1/4 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "emerald",
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "emerald" | "blue" | "purple" | "orange" | "amber" | "rose";
  trend?: string;
  trendUp?: boolean;
}) {
  const colorClasses = {
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
    orange: "from-orange-500 to-orange-600 shadow-orange-500/25",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/25",
    rose: "from-rose-500 to-rose-600 shadow-rose-500/25",
  };

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[#f0f4f8] to-[#e6e9ef] shadow-sm transition-all duration-300 hover:bg-slate-50 group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full blur-3xl transform translate-x-16 -translate-y-16 transition-opacity group-hover:opacity-20`} />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-4 h-4 ${trendUp ? '' : 'rotate-180'}`} />
              {trend}
            </div>
          )}
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className={`flex-shrink-0 p-3 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg transform transition-transform group-hover:scale-110`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Category Card Component
function CategoryCard({
  category,
  completionRate,
  lessonCount,
  onClick,
}: {
  category: LmsCategory;
  completionRate: number;
  lessonCount: number;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
  };

  const gradientColor = colorMap[category.color || "emerald"] || colorMap.emerald;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[#f0f4f8] to-[#e6e9ef] shadow-sm hover:bg-slate-50 transition-all duration-300 hover:-translate-y-1"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradientColor} opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradientColor} text-white shadow-lg transform transition-transform group-hover:scale-110`}>
            <BookOpen className="w-6 h-6" />
          </div>
          {completionRate === 100 ? (
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />Done
            </div>
          ) : completionRate > 0 ? (
            <div className="flex items-center gap-1 text-amber-600 text-sm font-medium">
              <Clock className="w-4 h-4" />{completionRate}%
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 text-sm font-medium">
              <Circle className="w-4 h-4" />Start
            </div>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">{category.name}</h3>
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{category.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{lessonCount} lessons</span>
          <ChevronRight className="w-5 h-5 text-slate-400 transform transition-transform group-hover:translate-x-1" />
        </div>
        {completionRate > 0 && completionRate < 100 && (
          <div className="mt-4">
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${gradientColor} rounded-full transition-all duration-500`} style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// Achievement Card Component
function AchievementCard({
  title,
  description,
  icon: Icon,
  unlocked,
  progress,
  color = "emerald",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  progress?: number;
  color?: "emerald" | "blue" | "purple" | "amber";
}) {
  const colorClasses = {
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl p-6 ${unlocked ? 'bg-gradient-to-br from-[#f0f4f8] to-[#e6e9ef] shadow-sm' : 'bg-slate-100/50 shadow-sm'} transition-all duration-300`}>
      <div className="relative">
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${unlocked ? `bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg` : 'bg-slate-200 text-slate-400'} transition-transform duration-300`}>
            <Icon className="w-8 h-8" />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${unlocked ? 'text-slate-800' : 'text-slate-400'}`}>{title}</h3>
          <p className={`text-sm mb-4 ${unlocked ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>
          {unlocked ? (
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <CheckCircle2 className="w-5 h-5" /><span>Unlocked</span>
            </div>
          ) : progress !== undefined ? (
            <div className="w-full">
              <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                <span>Progress</span><span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="w-4 h-4" /><span className="text-sm">Locked</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export to CSV
function exportToCSV(data: StaffProgress[], filename: string) {
  const headers = ["Staff Name", "Branch", "Completion %", "Last Activity"];
  const rows = data.map((staff) => [
    staff.staff_name,
    staff.branch || "N/A",
    `${staff.completion_percentage}%`,
    staff.last_activity ? new Date(staff.last_activity).toLocaleDateString() : "Never",
  ]);
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Main LMS Dashboard Component
interface LmsDashboardProps {
  initialData?: InitialLmsData | null;
}

function LmsDashboard({ initialData }: LmsDashboardProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [stats, setStats] = useState<LmsDashboardStats | null>(initialData?.stats || null);
  const [categories, setCategories] = useState<LmsCategory[]>(initialData?.categories || []);
  const [lessons, setLessons] = useState<LessonWithStatus[]>(initialData?.lessons || []);
  const [loading, setLoading] = useState(!initialData);
  const [_activeTab, _setActiveTab] = useState<TabType>("learning");
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeTab = _activeTab;
  const setActiveTab = _setActiveTab;

  const user = useAuthUser();
  const isAdmin = user?.role === "Admin";

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const loadData = useCallback(async ({ showSkeleton = true } = {}) => {
    if (showSkeleton) {
      setLoading(true);
    }

    try {
      const [statsData, categoriesData] = await Promise.all([
        LmsApiService.fetchDashboardData(),
        LmsApiService.fetchCategories(),
      ]);
      const lessonsData = categoriesData.length > 0 ? await LmsApiService.fetchAllLessons(categoriesData) : [];
      setStats(statsData);
      setCategories(categoriesData);
      setLessons(lessonsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      if (showSkeleton) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      void loadData();
    }
  }, [initialData, loadData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("lms-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadData({ showSkeleton: false });
    } finally {
      setIsRefreshing(false);
    }
  }, [loadData]);

  const handleExport = useCallback(() => {
    if (!stats?.staff_progress) return;
    setIsExporting(true);
    setTimeout(() => {
      exportToCSV(stats.staff_progress, `staff-progress-${new Date().toISOString().split("T")[0]}.csv`);
      setIsExporting(false);
    }, 500);
  }, [stats?.staff_progress]);

  const handleCategoryClick = useCallback((categoryId: number) => {
    router.push(`/lms/course/${categoryId}`);
  }, [router]);

  const handleResumeLesson = useCallback((lessonId: number) => {
    router.push(`/lms/lesson/${lessonId}`);
  }, [router]);

  const completedLessons = useMemo(() => lessons.filter((l) => l.is_completed).length, [lessons]);
  const totalLessons = lessons.length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const filteredCategories = useMemo(() => {
    if (!debouncedSearch.trim()) return categories;
    const query = debouncedSearch.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query) || (cat.description && cat.description.toLowerCase().includes(query)));
  }, [categories, debouncedSearch]);

  const currentLesson = useMemo(() => lessons.find((l) => l.is_unlocked && !l.is_completed), [lessons]);

  // Instant render with skeleton if no initial data or refreshing
  const isSkeleton = loading || !stats || !categories.length;

  if (isSkeleton) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <div className="h-96 bg-slate-200 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">No Training Content Yet</h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            The training portal is ready, but no courses have been added.
          </p>
          {isAdmin ? (
            <div className="space-y-4">
              <a
                href="/lms/admin/categories"
                className="block w-full max-w-sm mx-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 transition-all text-center"
              >
                🏗️ Add First Training Category
              </a>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Admin: Create categories → lessons → assign staff
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-500 dark:text-slate-400 text-center">
                Contact your administrator to set up training modules.
              </p>
              <button
                onClick={handleRefresh}
                className="px-8 py-3 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl shadow-sm transition-all hover:bg-slate-300 dark:hover:bg-slate-600 mx-auto block"
              >
                🔄 Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "learning" as TabType, label: "Learning", icon: BookOpen },
    { id: "progress" as TabType, label: "Progress", icon: BarChart3 },
    { id: "achievements" as TabType, label: "Achievements", icon: Award },
    { id: "my-process" as TabType, label: "My Process", icon: Clock },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{t.trainingPortal}</h1>
              <p className="text-sm text-slate-500">{t.masterSkills}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleRefresh} disabled={isRefreshing} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95 disabled:opacity-50" title="Refresh data">
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {isAdmin && (
              <button onClick={handleExport} disabled={isExporting} className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-all active:scale-95 disabled:opacity-50">
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid gap-4 sm:gap-6 ${isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {isAdmin && (
            <StatCard title="Total Staff" value={stats.total_staff} icon={Users} color="blue" trend="+3 this week" trendUp={true} />
          )}
          <StatCard title="Categories" value={stats.total_categories} subtitle={`${categories.length} active`} icon={BookOpen} color="emerald" />
          <StatCard title="Your Progress" value={`${overallProgress}%`} subtitle={`${completedLessons} of ${totalLessons} lessons`} icon={Trophy} color="purple" trend="+12% this month" trendUp={true} />
          <StatCard title="Completion Rate" value={`${stats.overall_completion_rate}%`} icon={TrendingUp} color="amber" />
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 p-2 bg-white rounded-2xl shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Admin Actions Bar */}
        {isAdmin && (
          <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200/50">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Admin Controls:
            </span>
            <button
              onClick={() => router.push("/lms/admin/categories")}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-medium text-emerald-700 hover:bg-slate-50 transition-all active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              Manage Categories
            </button>
            <button
              onClick={() => router.push("/lms/admin/lessons")}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-medium text-blue-700 hover:bg-slate-50 transition-all active:scale-95"
            >
              <PlayCircle className="w-4 h-4" />
              Manage Lessons
            </button>
            <button
              onClick={() => router.push("/lms/admin/staff")}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-medium text-purple-700 hover:bg-slate-50 transition-all active:scale-95"
            >
              <Users className="w-4 h-4" />
              Manage Staff
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-medium text-orange-700 hover:bg-slate-50 transition-all active:scale-95 border-l-4 border-orange-400"
              title="Go to Settings to sync users with LMS staff"
            >
              <RefreshCw className="w-4 h-4" />
              Sync from Settings
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "learning" && (
          <div className="space-y-8">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input id="lms-search" type="text" placeholder="Search categories... (Cmd/Ctrl+K)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-14 py-4 rounded-2xl bg-white shadow-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-2 focus:ring-emerald-500/20 transition-all text-base" />
              {debouncedSearch !== searchQuery && (
                <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Continue Learning */}
            {currentLesson && (
              <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl shadow-sm border border-emerald-200/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                    <PlayCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Continue Learning</h3>
                    <p className="text-sm text-slate-500">Pick up where you left off</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{currentLesson.title}</p>
                    <p className="text-sm text-slate-500">{currentLesson.category_name} • {currentLesson.duration_minutes || 0} min</p>
                  </div>
                  <button onClick={() => handleResumeLesson(currentLesson.id)} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all active:scale-95">
                    Resume
                  </button>
                </div>
              </div>
            )}

            {/* Categories Grid */}
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />Training Categories
              </h2>
              {filteredCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredCategories.map((category) => {
                    const completion = stats.category_completion?.find((c) => c.category_id === category.id);
                    const categoryLessons = lessons.filter((l) => l.category_id === category.id);
                    return (
                      <CategoryCard key={category.id} category={category} completionRate={completion?.completion_rate || 0} lessonCount={categoryLessons.length} onClick={() => handleCategoryClick(category.id)} />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-3xl shadow-sm">
                  <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">No Categories Found</h3>
                  <p className="text-slate-500">Try adjusting your search query</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="p-6 bg-white rounded-3xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Overall Progress</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-emerald-50 rounded-2xl">
                  <p className="text-3xl font-bold text-emerald-600">{completedLessons}</p>
                  <p className="text-sm text-slate-600">Completed</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-2xl">
                  <p className="text-3xl font-bold text-blue-600">{lessons.filter((l) => l.is_unlocked && !l.is_completed).length}</p>
                  <p className="text-sm text-slate-600">In Progress</p>
                </div>
                <div className="text-center p-4 bg-slate-100 rounded-2xl">
                  <p className="text-3xl font-bold text-slate-600">{lessons.filter((l) => !l.is_unlocked).length}</p>
                  <p className="text-sm text-slate-600">Locked</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Overall Completion</span>
                  <span className="font-semibold text-slate-800">{overallProgress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
            </div>

            {/* Staff Progress Table */}
            {isAdmin && (
              <div className="p-6 bg-white rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Staff Progress</h3>
                  <button
                    onClick={() => router.push("/settings")}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sync from Settings
                  </button>
                </div>
                {stats.staff_progress && stats.staff_progress.length > 0 ? (
                  <Suspense fallback={<div className="space-y-3"><div className="h-16 bg-slate-100 rounded-2xl animate-pulse" /><div className="h-16 bg-slate-100 rounded-2xl animate-pulse" /></div>}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Staff Name</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Branch</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Progress</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Last Activity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stats.staff_progress.map((staff) => (
                            <tr key={staff.staff_id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                                    {staff.staff_name.charAt(0)}
                                  </div>
                                  <span className="font-medium text-slate-800">{staff.staff_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600">{staff.branch || 'N/A'}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" style={{ width: `${staff.completion_percentage}%` }} />
                                  </div>
                                  <span className="text-sm text-slate-600">{staff.completion_percentage}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-500">
                                {staff.last_activity ? new Date(staff.last_activity).toLocaleDateString() : 'Never'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Suspense>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-600 font-medium mb-1">No staff data available</p>
                    <p className="text-sm text-slate-500 mb-4">Staff from Settings need to be synced to LMS</p>
                    <button
                      onClick={() => router.push("/settings")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Go to Settings to Sync
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AchievementCard
              title="First Steps"
              description="Complete your first lesson"
              icon={Zap}
              unlocked={completedLessons > 0}
              progress={completedLessons > 0 ? 100 : 0}
              color="emerald"
            />
            <AchievementCard
              title="Category Master"
              description="Complete all lessons in a category"
              icon={Target}
              unlocked={stats.category_completion?.some((c) => c.completion_rate === 100) ?? false}
              progress={stats.category_completion?.length ? Math.max(...stats.category_completion.map((c) => c.completion_rate), 0) : 0}
              color="blue"
            />
            <AchievementCard
              title="Training Graduate"
              description="Complete all training lessons"
              icon={GraduationCap}
              unlocked={overallProgress === 100}
              progress={overallProgress}
              color="purple"
            />
          </div>
        )}

        {activeTab === "my-process" && (
          <div className="space-y-6">
            {/* My Process Overview */}
            <div className="p-6 bg-white rounded-3xl shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">My Training Process</h3>
                  <p className="text-sm text-slate-500">Track your personal learning journey</p>
                </div>
              </div>

              {/* Personal Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-emerald-50 rounded-2xl">
                  <p className="text-2xl font-bold text-emerald-600">{completedLessons}</p>
                  <p className="text-sm text-slate-600">Completed</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-2xl">
                  <p className="text-2xl font-bold text-blue-600">{lessons.filter((l) => l.is_unlocked && !l.is_completed).length}</p>
                  <p className="text-sm text-slate-600">In Progress</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-2xl">
                  <p className="text-2xl font-bold text-amber-600">{lessons.filter((l) => !l.is_unlocked).length}</p>
                  <p className="text-sm text-slate-600">Locked</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-2xl">
                  <p className="text-2xl font-bold text-purple-600">{overallProgress}%</p>
                  <p className="text-sm text-slate-600">Overall</p>
                </div>
              </div>

              {/* Current Status */}
              <div className="p-4 bg-slate-50 rounded-2xl">
                <h4 className="font-semibold text-slate-800 mb-3">Current Status</h4>
                {currentLesson ? (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <PlayCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{currentLesson.title}</p>
                        <p className="text-xs text-slate-500">{currentLesson.category_name}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">In Progress</span>
                  </div>
                ) : (
                  <div className="text-center p-4 text-slate-500">
                    🎉 All lessons completed! Great job!
                  </div>
                )}
              </div>
            </div>

            {/* Category Progress */}
            <div className="p-6 bg-white rounded-3xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Category Progress</h3>
              <div className="space-y-4">
                {categories.map((category) => {
                  const categoryLessons = lessons.filter((l) => l.category_id === category.id);
                  const completedInCategory = categoryLessons.filter((l) => l.is_completed).length;
                  const totalInCategory = categoryLessons.length;
                  const progress = totalInCategory > 0 ? Math.round((completedInCategory / totalInCategory) * 100) : 0;

                  return (
                    <div key={category.id} className="p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-800">{category.name}</span>
                        <span className="text-sm text-slate-500">{completedInCategory}/{totalInCategory}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{progress}% complete</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-6 bg-white rounded-3xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {lessons
                  .filter((l) => l.is_completed)
                  .slice(0, 5)
                  .map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{lesson.title}</p>
                        <p className="text-xs text-slate-500">{lesson.category_name}</p>
                      </div>
                      <span className="text-xs text-slate-400">Completed</span>
                    </div>
                  ))}
                {lessons.filter((l) => l.is_completed).length === 0 && (
                  <div className="text-center p-4 text-slate-500">
                    No completed lessons yet. Start learning to see your progress!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap with Error Boundary
function LmsDashboardWithErrorBoundary({ initialData }: LmsDashboardProps) {
  return (
    <LmsErrorBoundary>
      <LmsDashboard initialData={initialData} />
    </LmsErrorBoundary>
  );
}

export default LmsDashboardWithErrorBoundary;
