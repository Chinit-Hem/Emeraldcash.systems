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

import { useLanguage } from "@/shared/hooks/LanguageContext";
import { useTranslation } from "@/shared/utils/i18n";

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  Trophy,
  PlayCircle,
  BarChart3,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
  RefreshCw,
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
  InitialLmsData
} from "@/systems/lms/types/lms-types";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import {
  getRememberedAppScrollSnapshot,
  rememberAppScrollSnapshot,
  rememberAppShellRouteScrollPosition,
  restoreAppScrollSnapshot,
} from "@/shared/utils/appScroll";
import LmsErrorBoundary from "@/systems/lms/components/LmsErrorBoundary";

type TabType = "learning" | "progress" | "achievements";
const LMS_DASHBOARD_SCROLL_STORAGE_KEY = "lms_dashboard_scroll";
const LMS_TAB_QUERY_PARAM = "tab";
const LMS_TAB_IDS: readonly TabType[] = ["learning", "progress", "achievements"];

function getDashboardTabFromSearchParams(searchParams: { get(name: string): string | null } | null): TabType {
  const tab = searchParams?.get(LMS_TAB_QUERY_PARAM);
  return LMS_TAB_IDS.includes(tab as TabType) ? (tab as TabType) : "learning";
}

// Type for last watched lesson
type LastWatchedLesson = {
  lessonId: number;
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  watchedAt: string | null;
  watchPercentage: number;
};

const EMPTY_LMS_STATS: LmsDashboardStats = {
  total_staff: 0,
  total_categories: 0,
  total_lessons: 0,
  overall_completion_rate: 0,
  staff_progress: [],
  category_completion: [],
};

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

  static async fetchVisibleLessons(): Promise<LessonWithStatus[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.BASE_URL}/lessons?visibleAll=true`);
      if (!response.ok) return [];
      const data = await response.json();
      const lessons = Array.isArray(data.data) ? data.data : [];

      return data.success ? lessons : [];
    } catch (error) {
      console.error("Lessons fetch error:", error);
      return [];
    }
  }

  // Fetch last watched lesson - enables "Continue Learning" to show last video user watched
  static async fetchLastWatched(): Promise<LastWatchedLesson | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.BASE_URL}/progress?scope=last-watched&t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error("Last watched fetch error:", error);
      return null;
    }
  }

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
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-[#f0f4f8] to-[#e6e9ef] shadow-sm transition-all duration-300 hover:bg-slate-50 group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full blur-3xl transform translate-x-16 -translate-y-16 transition-opacity group-hover:opacity-20`} />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-4 h-4 ${trendUp ? '' : 'rotate-180'}`} />
              {trend}
            </div>
          )}
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className={`flex-shrink-0 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg transform transition-transform group-hover:scale-110`}>
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
  const hasLessons = lessonCount > 0;
  const colorMap: Record<string, string> = {
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
  };

  const gradientColor = colorMap[category.color || "emerald"] || colorMap.emerald;
  const lessonCountLabel = lessonCount === 1 ? "1 lesson" : `${lessonCount} lessons`;

  return (
    <button
      onClick={onClick}
      disabled={!hasLessons}
      className={`w-full text-left group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[#f0f4f8] to-[#e6e9ef] shadow-sm transition-all duration-300 ${
        hasLessons
          ? "hover:-translate-y-1 hover:bg-slate-50"
          : "cursor-not-allowed opacity-75"
      }`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradientColor} opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradientColor} text-white shadow-lg transform transition-transform ${hasLessons ? "group-hover:scale-110" : ""}`}>
            <BookOpen className="w-6 h-6" />
          </div>
          {!hasLessons ? (
            <div className="flex items-center gap-1 text-slate-400 text-sm font-medium">
              <Lock className="w-4 h-4" />No lessons
            </div>
          ) : completionRate === 100 ? (
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />Done
            </div>
          ) : completionRate > 0 ? (
            <div className="flex items-center gap-1 text-amber-600 text-sm font-medium">
              <Clock className="w-4 h-4" />{completionRate}% complete
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
          <span className="text-xs text-slate-400">{lessonCountLabel}</span>
          {hasLessons && (
            <ChevronRight className="w-5 h-5 text-slate-400 transform transition-transform group-hover:translate-x-1" />
          )}
        </div>
        {hasLessons && completionRate > 0 && completionRate < 100 && (
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

// Main LMS Dashboard Component
interface LmsDashboardProps {
  initialData?: InitialLmsData | null;
}

function LmsDashboard({ initialData }: LmsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [stats, setStats] = useState<LmsDashboardStats | null>(initialData?.stats || null);
  const [categories, setCategories] = useState<LmsCategory[]>(initialData?.categories || []);
  const [lessons, setLessons] = useState<LessonWithStatus[]>(initialData?.lessons || []);
  const [lastWatched, setLastWatched] = useState<LastWatchedLesson | null>(null);
  const [lastWatchedLoaded, setLastWatchedLoaded] = useState(false);
  const [loading, setLoading] = useState(!initialData);
  const [_activeTab, _setActiveTab] = useState<TabType>(() =>
    getDashboardTabFromSearchParams(searchParams)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeTab = _activeTab;

  const user = useAuthUser();
  const isAdmin = user?.role === "Admin";
  const dashboardStats = stats ?? EMPTY_LMS_STATS;

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const loadData = useCallback(async ({ showSkeleton = true } = {}) => {
    let primaryDataLoaded = false;

    if (showSkeleton) {
      setLoading(true);
    }

    try {
      const lessonsPromise = LmsApiService.fetchVisibleLessons();
      const [statsData, categoriesData, lastWatchedData] = await Promise.all([
        LmsApiService.fetchDashboardData(),
        LmsApiService.fetchCategories(),
        LmsApiService.fetchLastWatched(),
      ]);
      setStats(statsData);
      setCategories(categoriesData);
      setLastWatched(lastWatchedData);
      setLastWatchedLoaded(true);
      primaryDataLoaded = true;
      if (showSkeleton) {
        setLoading(false);
      }

      void lessonsPromise
        .then((lessonsData) => {
          const categoriesById = new Map(categoriesData.map((category) => [category.id, category]));
          setLessons(lessonsData.map((lesson) => {
            const category = categoriesById.get(lesson.category_id);
            return {
              ...lesson,
              category_name: category?.name ?? lesson.category_name,
              category_color: category?.color ?? lesson.category_color,
            };
          }));
        })
        .catch((lessonError) => {
          console.error("Error loading LMS lessons:", lessonError);
          setLessons([]);
        });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setLastWatchedLoaded(true);
    } finally {
      if (showSkeleton && !primaryDataLoaded) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      void loadData();
      return;
    }

    let isMounted = true;

    LmsApiService.fetchLastWatched()
      .then((lastWatchedData) => {
        if (isMounted) {
          setLastWatched(lastWatchedData);
          setLastWatchedLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Last watched refresh error:", error);
        if (isMounted) {
          setLastWatchedLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialData, loadData]);

  useEffect(() => {
    const nextTab = getDashboardTabFromSearchParams(searchParams);
    _setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, [searchParams]);

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

  const rememberDashboardScroll = useCallback(() => {
    rememberAppScrollSnapshot(LMS_DASHBOARD_SCROLL_STORAGE_KEY);
    rememberAppShellRouteScrollPosition("/lms");
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    rememberDashboardScroll();
    _setActiveTab(tab);

    const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
    if (tab === "learning") {
      nextParams.delete(LMS_TAB_QUERY_PARAM);
    } else {
      nextParams.set(LMS_TAB_QUERY_PARAM, tab);
    }

    const query = nextParams.toString();
    router.replace(query ? `/lms?${query}` : "/lms", { scroll: false });
  }, [rememberDashboardScroll, router, searchParams]);

  useLayoutEffect(() => {
    if (loading) return;

    const snapshot = getRememberedAppScrollSnapshot(LMS_DASHBOARD_SCROLL_STORAGE_KEY);
    if (!snapshot) return;

    restoreAppScrollSnapshot(snapshot);
  }, [activeTab, categories.length, lessons.length, loading]);

  const handleCategoryClick = useCallback((categoryId: number) => {
    rememberDashboardScroll();
    router.push(`/lms/course/${categoryId}`, { scroll: false });
  }, [rememberDashboardScroll, router]);

  const handleResumeLesson = useCallback((lessonId: number) => {
    rememberDashboardScroll();
    router.push(`/lms/lesson/${lessonId}`, { scroll: false });
  }, [rememberDashboardScroll, router]);

  const completedLessons = useMemo(() => lessons.filter((l) => l.is_completed).length, [lessons]);
  const totalLessons = lessons.length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const unlockedLessons = useMemo(() => lessons.filter((l) => l.is_unlocked), [lessons]);
  const inProgressLessons = useMemo(
    () => lessons.filter((l) => l.is_unlocked && !l.is_completed),
    [lessons]
  );
  const lockedLessons = useMemo(() => lessons.filter((l) => !l.is_unlocked), [lessons]);
  const categoryProgressById = useMemo(() => {
    const progressById = new Map<number, { completed: number; total: number; progress: number }>();

    categories.forEach((category) => {
      const categoryLessons = lessons.filter((lesson) => lesson.category_id === category.id);
      const total = categoryLessons.length;
      const completed = categoryLessons.filter((lesson) => lesson.is_completed).length;
      progressById.set(category.id, {
        completed,
        total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    });

    return progressById;
  }, [categories, lessons]);
  const maxCategoryProgress = useMemo(() => {
    const categoryProgressValues = Array.from(categoryProgressById.values())
      .filter((categoryProgress) => categoryProgress.total > 0)
      .map((categoryProgress) => categoryProgress.progress);

    return categoryProgressValues.length > 0 ? Math.max(...categoryProgressValues) : 0;
  }, [categoryProgressById]);

  const filteredCategories = useMemo(() => {
    if (!debouncedSearch.trim()) return categories;
    const query = debouncedSearch.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query) || (cat.description && cat.description.toLowerCase().includes(query)));
  }, [categories, debouncedSearch]);
  const lessonCountByCategoryId = useMemo(() => {
    const counts = new Map<number, number>();
    lessons.forEach((lesson) => {
      counts.set(lesson.category_id, (counts.get(lesson.category_id) || 0) + 1);
    });
    return counts;
  }, [lessons]);
  const learningCategories = useMemo(
    () => filteredCategories.filter((category) => (lessonCountByCategoryId.get(category.id) || 0) > 0),
    [filteredCategories, lessonCountByCategoryId]
  );

  const currentLesson = useMemo(() => lessons.find((l) => l.is_unlocked && !l.is_completed), [lessons]);
  const continueLesson = lastWatched || (lastWatchedLoaded ? currentLesson : null);
  const continueLessonId = lastWatched?.lessonId || currentLesson?.id;

  useEffect(() => {
    categories.slice(0, 8).forEach((category) => {
      router.prefetch(`/lms/course/${category.id}`);
    });
    if (continueLessonId) {
      router.prefetch(`/lms/lesson/${continueLessonId}`);
    }
  }, [categories, continueLessonId, router]);

  if (!loading && !stats && categories.length === 0) {
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
                Open Content Manager
              </a>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Admin: create categories and lessons in Content Manager.
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
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "learning" as TabType, label: "Lessons", icon: BookOpen },
    { id: "progress" as TabType, label: "My Progress", icon: BarChart3 },
    { id: "achievements" as TabType, label: "Achievements", icon: Award },
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
            {loading && (
              <span className="hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-500 shadow-sm sm:inline-flex">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                Loading
              </span>
            )}
            <button onClick={handleRefresh} disabled={isRefreshing} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95 disabled:opacity-50" title="Refresh data">
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 min-[420px]:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Categories" value={dashboardStats.total_categories} subtitle={`${categories.length} active`} icon={BookOpen} color="emerald" />
          <StatCard title="Lessons" value={totalLessons} subtitle={`${unlockedLessons.length} available`} icon={PlayCircle} color="blue" />
          <StatCard title="Your Progress" value={`${overallProgress}%`} subtitle={`${completedLessons} of ${totalLessons} lessons`} icon={Trophy} color="purple" />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto p-2 bg-white rounded-2xl shadow-sm sm:flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

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

{/* Continue Learning - Show last watched lesson first, fallback after lookup finishes */}
            {continueLesson && (
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
                <div className="flex flex-col gap-4 p-4 bg-white rounded-2xl shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{continueLesson.title}</p>
                    <p className="text-sm text-slate-500">
                      {lastWatched?.categoryName || currentLesson?.category_name}
                      {lastWatched ? ` • ${lastWatched.watchPercentage}% watched` : ` • ${currentLesson?.duration_minutes || 0} min`}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (continueLessonId) handleResumeLesson(continueLessonId);
                    }} 
                    className="w-full px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all active:scale-95 sm:w-auto"
                  >
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
              {learningCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {learningCategories.map((category) => {
                    const categoryLessonsCount = lessonCountByCategoryId.get(category.id) || 0;
                    const categoryProgress = categoryProgressById.get(category.id)?.progress ?? 0;
                    return (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        completionRate={categoryProgress}
                        lessonCount={categoryLessonsCount}
                        onClick={() => handleCategoryClick(category.id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-3xl shadow-sm">
                  <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {loading
                      ? "Loading Training Content"
                      : debouncedSearch.trim()
                        ? "No Categories Found"
                        : "No Lessons Available"}
                  </h3>
                  <p className="text-slate-500">
                    {loading
                      ? "Your LMS data will appear here as soon as it finishes loading."
                      : debouncedSearch.trim()
                        ? "Try adjusting your search query"
                        : "No published lessons are available yet."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-3xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">My Progress</h3>
              <div className="grid grid-cols-1 min-[520px]:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-emerald-50 rounded-2xl">
                  <p className="text-3xl font-bold text-emerald-600">{completedLessons}</p>
                  <p className="text-sm text-slate-600">Completed</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-2xl">
                  <p className="text-3xl font-bold text-blue-600">{inProgressLessons.length}</p>
                  <p className="text-sm text-slate-600">In Progress</p>
                </div>
                <div className="text-center p-4 bg-slate-100 rounded-2xl">
                  <p className="text-3xl font-bold text-slate-600">{lockedLessons.length}</p>
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

            <div className="p-6 bg-white rounded-3xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Category Progress</h3>
              <div className="space-y-4">
                {categories.map((category) => {
                  const categoryProgress = categoryProgressById.get(category.id);
                  const totalInCategory = categoryProgress?.total ?? 0;

                  if (totalInCategory === 0) {
                    return null;
                  }

                  return (
                    <div key={category.id} className="p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="min-w-0 break-words font-medium text-slate-800">{category.name}</span>
                        <span className="shrink-0 text-sm text-slate-500">{categoryProgress?.completed ?? 0}/{totalInCategory}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${categoryProgress?.progress ?? 0}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{categoryProgress?.progress ?? 0}% complete</p>
                    </div>
                  );
                })}
                {categories.every((category) => lessons.every((lesson) => lesson.category_id !== category.id)) && (
                  <div className="text-center p-4 text-slate-500">
                    No category progress yet.
                  </div>
                )}
              </div>
            </div>

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
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium text-slate-800">{lesson.title}</p>
                        <p className="break-words text-xs text-slate-500">{lesson.category_name}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">Completed</span>
                    </div>
                  ))}
                {lessons.filter((l) => l.is_completed).length === 0 && (
                  <div className="text-center p-4 text-slate-500">
                    {loading ? "Loading recent activity..." : "No completed lessons yet. Start learning to see your progress."}
                  </div>
                )}
              </div>
            </div>
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
              unlocked={Array.from(categoryProgressById.values()).some((categoryProgress) => categoryProgress.total > 0 && categoryProgress.progress === 100)}
              progress={maxCategoryProgress}
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
