/**
 * Course Overview Page - E-School Cambodia Style
 * 
 * Professional course page showing all lessons in a category:
 * - Hero section with category info
 * - Grid of lesson cards with thumbnails
 * - Progress tracking
 * - Continue learning CTA
 * - Mobile-responsive layout
 * 
 * @module lms/course/[categoryId]/page
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  BookOpen,
  Trophy,
  Clock,
  BarChart3,
  PlayCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { LessonCard } from "@/app/components/lms/LessonCard";

// ============================================================================
// Types
// ============================================================================

interface LmsLesson {
  id: number;
  category_id: number;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  duration_minutes: number | null;
  step_by_step_instructions: string | null;
  order_index: number;
  is_active: boolean;
}

interface LmsCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface LessonCompletion {
  lesson_id: number;
  completed_at: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const colorClasses: Record<string, { bg: string; text: string; gradient: string }> = {
  emerald: { 
    bg: "bg-emerald-50 dark:bg-emerald-900/20", 
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500/20 to-emerald-600/5"
  },
  blue: { 
    bg: "bg-blue-50 dark:bg-blue-900/20", 
    text: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500/20 to-blue-600/5"
  },
  purple: { 
    bg: "bg-purple-50 dark:bg-purple-900/20", 
    text: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-500/20 to-purple-600/5"
  },
  orange: { 
    bg: "bg-orange-50 dark:bg-orange-900/20", 
    text: "text-orange-600 dark:text-orange-400",
    gradient: "from-orange-500/20 to-orange-600/5"
  },
};

// ============================================================================
// Components
// ============================================================================

const ProgressRing: React.FC<{ percentage: number; color?: string }> = ({ percentage, color = "emerald" }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const colors: Record<string, string> = {
    emerald: "stroke-emerald-500",
    blue: "stroke-blue-500",
    purple: "stroke-purple-500",
    orange: "stroke-orange-500",
  };
  
  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colors[color] || colors.emerald} transition-all duration-1000`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{percentage}%</span>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function CourseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = parseInt(params.categoryId as string);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<LmsCategory | null>(null);
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  
  // Fetch course data
  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch category info
      const catRes = await fetch("/api/lms/categories");
      if (!catRes.ok) throw new Error("Failed to fetch categories");
      const catData = await catRes.json();
      
      if (catData.success) {
        const cat = catData.data.find((c: LmsCategory) => c.id === categoryId);
        if (!cat) throw new Error("Category not found");
        setCategory(cat);
      }
      
      // Fetch lessons in this category
      const lessonsRes = await fetch(`/api/lms/lessons?categoryId=${categoryId}`);
      if (!lessonsRes.ok) throw new Error("Failed to fetch lessons");
      const lessonsData = await lessonsRes.json();
      
      if (lessonsData.success) {
        // Sort by order_index
        const sorted = lessonsData.data.sort((a: LmsLesson, b: LmsLesson) => a.order_index - b.order_index);
        setLessons(sorted);
      }
      
      // Fetch completions
      const compRes = await fetch(`/api/lms/completions?categoryId=${categoryId}`);
      if (compRes.ok) {
        const compData = await compRes.json();
        if (compData.success) {
          setCompletions(compData.data || []);
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);
  
  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);
  
  // Check if lesson is completed
  const isLessonCompleted = (lessonId: number) => {
    return completions.some(c => c.lesson_id === lessonId);
  };
  
  // Calculate progress
  const completedCount = lessons.filter(l => isLessonCompleted(l.id)).length;
  const progressPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  
  // Find first incomplete lesson
  const firstIncompleteLesson = lessons.find(l => !isLessonCompleted(l.id));
  const hasStarted = completedCount > 0;
  const isComplete = completedCount === lessons.length && lessons.length > 0;
  
  // Handle lesson click
  const handleLessonClick = (lessonId: number) => {
    router.push(`/lms/lesson/${lessonId}`);
  };
  
  // Handle continue/start learning
  const handleContinueLearning = () => {
    const targetLesson = firstIncompleteLesson || lessons[0];
    if (targetLesson) {
      router.push(`/lms/lesson/${targetLesson.id}`);
    }
  };
  
  // Get color theme with fallback
  const colors = colorClasses[category?.color || "emerald"] || colorClasses.emerald;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading course...</span>
        </div>
      </div>
    );
  }
  
  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || "Course not found"}
          </h2>
          <GlassButton variant="primary" onClick={() => router.push("/lms")}>
            Back to Dashboard
          </GlassButton>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className={`relative bg-gradient-to-br ${colors.gradient} dark:from-gray-800 dark:to-gray-900`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-12">
          {/* Back Button */}
          <button
            onClick={() => router.push("/lms")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          {/* Course Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <GraduationCap className={`w-6 h-6 ${colors.text}`} />
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Training Course
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 break-words">
                {category.name}
              </h1>
              
              {category.description && (
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                  {category.description}
                </p>
              )}
              
              {/* Course Meta */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{lessons.length} lessons</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {lessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0)} minutes
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  <span>{completedCount} completed</span>
                </div>
              </div>
            </div>
            
            {/* Progress Card */}
            <GlassCard className="w-full p-4 sm:p-6 flex items-center gap-4 sm:gap-6 lg:w-auto lg:min-w-[280px]">
              <ProgressRing percentage={progressPercentage} color={category.color || "emerald"} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completedCount}/{lessons.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  lessons completed
                </p>
              </div>
            </GlassCard>
          </div>
          
          {/* CTA Button */}
          <div className="mt-8">
            <GlassButton
              variant="primary"
              size="lg"
              onClick={handleContinueLearning}
              className="w-full sm:w-auto"
            >
              {isComplete ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Review Course
                </>
              ) : hasStarted ? (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Continue Learning
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Start Learning
                </>
              )}
            </GlassButton>
          </div>
        </div>
      </div>
      
      {/* Lessons Grid */}
      <section
        className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-12"
        aria-labelledby="course-content-heading"
      >
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="course-content-heading" className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            Course Content
          </h2>
          
          {/* Progress Bar */}
          <div className="hidden sm:flex items-center gap-3 flex-1 max-w-md ml-6">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {progressPercentage}%
            </span>
          </div>
        </div>
        
        {/* Mobile Progress */}
        <div className="sm:hidden mb-6">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            {progressPercentage}% complete
          </p>
        </div>
        
        {/* Lessons Grid */}
        {lessons.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No lessons available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {lessons.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                id={lesson.id}
                title={lesson.title}
                description={lesson.description}
                youtubeVideoId={lesson.youtube_video_id}
                durationMinutes={lesson.duration_minutes}
                orderIndex={index}
                isCompleted={isLessonCompleted(lesson.id)}
                isActive={lesson.id === firstIncompleteLesson?.id}
                onClick={() => handleLessonClick(lesson.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
