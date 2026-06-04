/**
 * Lesson Player Page - E-School Professional Platform
 * 
 * Features:
 * - Sequential Learning: Must complete lessons in order
 * - Lesson Guard: Blocks access to locked lessons
 * - Progress Tracking: Visual progress bars and completion stats
 * - Mark as Complete: Unlocks next lesson
 * 
 * @module lms/lesson/[id]/page
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  Circle,
  Clock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ListOrdered,
  Trophy,
  Loader2,
  AlertCircle,
  Lock,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import { VideoPlayer } from "@/systems/lms/components/VideoPlayer";

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
  thumbnail_url?: string | null;
  thumbnail_cloudinary_public_id?: string | null;
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

interface LessonWithStatus extends LmsLesson {
  is_completed: boolean;
  is_unlocked: boolean;
  completed_at: string | null;
}

interface LessonWatchProgress {
  watchPercentage: number;
  canComplete: boolean;
  currentTimeSeconds: number;
  maxWatchedSeconds: number;
  isCompleted: boolean;
  completedAt: string | null;
}

// ============================================================================
// Components
// ============================================================================

const LessonPlaylistItem: React.FC<{
  lesson: LessonWithStatus;
  isActive: boolean;
  index: number;
  onClick: () => void;
}> = ({ lesson, isActive, index, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!lesson.is_unlocked}
      title={lesson.title}
      className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-start gap-3 ${
        isActive
          ? "bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-500"
          : lesson.is_unlocked
          ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          : "bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60"
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        lesson.is_completed
          ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
          : isActive
          ? "bg-emerald-500 text-white"
          : lesson.is_unlocked
          ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
      }`}>
        {lesson.is_completed ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : !lesson.is_unlocked ? (
          <Lock className="w-4 h-4" />
        ) : isActive ? (
          <Play className="w-4 h-4 ml-0.5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm line-clamp-2 ${
          isActive 
            ? "text-emerald-700 dark:text-emerald-300" 
            : lesson.is_unlocked 
              ? "text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-500"
        }`}>
          {index + 1}. {lesson.title}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{lesson.duration_minutes || 0} min</span>
          {!lesson.is_unlocked && (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 ml-2">
              <Lock className="w-3 h-3" />
              Locked
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const StepByStepPanel: React.FC<{ instructions: string | null }> = ({ instructions }) => {
  if (!instructions) return null;
  
  const steps = instructions.split('\n').filter(line => line.trim());
  
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <ListOrdered className="w-5 h-5 text-emerald-500" />
        Step-by-Step Instructions
      </h3>
      <div className="prose dark:prose-invert prose-sm max-w-none">
        <div className="space-y-3">
          {steps.map((step, index) => {
            if (step.startsWith('##')) {
              return (
                <h4 key={index} className="text-md font-semibold text-gray-800 dark:text-gray-200 mt-4 first:mt-0">
                  {step.replace('##', '').trim()}
                </h4>
              );
            }
            if (/^\d+\./.test(step)) {
              return (
                <div key={index} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center">
                    {step.match(/^\d+/)?.[0]}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {step.replace(/^\d+\./, '').trim()}
                  </p>
                </div>
              );
            }
            if (step.startsWith('-') || step.startsWith('*')) {
              return (
                <div key={index} className="flex gap-2 ml-4">
                  <span className="text-emerald-500 mt-1">•</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {step.replace(/^[-*]/, '').trim()}
                  </p>
                </div>
              );
            }
            return (
              <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                {step}
              </p>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
};

const LessonGuard: React.FC<{
  isUnlocked: boolean;
  previousLessonTitle?: string;
  onGoBack: () => void;
}> = ({ isUnlocked, previousLessonTitle, onGoBack }) => {
  if (isUnlocked) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Lesson Locked
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Please complete previous lessons first.
          {previousLessonTitle && (
            <span className="block mt-2 font-medium text-amber-600 dark:text-amber-400">
          Complete: &ldquo;{previousLessonTitle}&rdquo;
            </span>
          )}
        </p>
        <GlassButton variant="primary" onClick={onGoBack} className="w-full">
          <ArrowRight className="w-4 h-4 mr-2" />
          Go to Available Lesson
        </GlassButton>
      </GlassCard>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonWithStatus | null>(null);
  const [categoryLessons, setCategoryLessons] = useState<LessonWithStatus[]>([]);
  const [category, setCategory] = useState<LmsCategory | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [showGuard, setShowGuard] = useState(false);
  const [previousLessonTitle, setPreviousLessonTitle] = useState<string>("");
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [watchProgress, setWatchProgress] = useState<LessonWatchProgress>({
    watchPercentage: 0,
    canComplete: false,
    currentTimeSeconds: 0,
    maxWatchedSeconds: 0,
    isCompleted: false,
    completedAt: null,
  });
  const currentLessonId = currentLesson?.id;
  
  // Fetch lesson data with sequential status
  const fetchLessonData = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const [lessonRes, catRes] = await Promise.all([
        fetch(`/api/lms/lessons?id=${id}`),
        fetch("/api/lms/categories"),
      ]);

      if (!lessonRes.ok) throw new Error("Failed to fetch lesson");
      const lessonData = await lessonRes.json();
      
      if (!lessonData.success || !lessonData.data) {
        throw new Error("Lesson not found");
      }
      
      const lesson: LmsLesson = lessonData.data;

      // Fetch category info
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.success) {
          const cat = catData.data.find((c: LmsCategory) => c.id === lesson.category_id);
          setCategory(cat || null);
        }
      }
      
      // Fetch sequential lessons with unlock status
      const seqRes = await fetch(`/api/lms/lessons?categoryId=${lesson.category_id}&sequential=true`);
      if (seqRes.ok) {
        const seqData = await seqRes.json();
        if (seqData.success && seqData.data) {
          setCategoryLessons(seqData.data);
          
          // Find current lesson in the list
          const currentWithStatus = seqData.data.find((l: LessonWithStatus) => l.id === id);
          if (currentWithStatus) {
            setCurrentLesson(currentWithStatus);
            
            // Check if lesson is unlocked
            if (!currentWithStatus.is_unlocked) {
              setShowGuard(true);
              // Find the previous incomplete lesson
              const prevIndex = seqData.data.findIndex((l: LessonWithStatus) => l.id === id) - 1;
              if (prevIndex >= 0) {
                setPreviousLessonTitle(seqData.data[prevIndex]?.title || "");
              }
            }
          }
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    if (lessonId) {
      fetchLessonData(lessonId);
    }
  }, [lessonId, fetchLessonData]);
  
  // Handle lesson click with guard
  const handleLessonClick = (lesson: LessonWithStatus) => {
    if (lesson.id === currentLesson?.id) return;
    
    if (!lesson.is_unlocked) {
      // Show guard modal
      setShowGuard(true);
      const prevIndex = categoryLessons.findIndex(l => l.id === lesson.id) - 1;
      if (prevIndex >= 0) {
        setPreviousLessonTitle(categoryLessons[prevIndex]?.title || "");
      }
      return;
    }
    
    router.push(`/lms/lesson/${lesson.id}`, { scroll: false });
  };

  const applyLessonCompletion = useCallback((lessonIdToComplete: number, completedAt?: string | null) => {
    const completedAtValue = completedAt || new Date().toISOString();

    setCurrentLesson(prev => {
      if (prev?.id !== lessonIdToComplete) {
        return prev;
      }

      if (prev.is_completed && prev.completed_at === completedAtValue) {
        return prev;
      }

      return { ...prev, is_completed: true, completed_at: completedAtValue };
    });

    setCategoryLessons(prev => {
      const completedIndex = prev.findIndex(l => l.id === lessonIdToComplete);
      let changed = false;

      const nextLessons = prev.map((lesson, index) => {
        if (lesson.id === lessonIdToComplete) {
          if (lesson.is_completed && lesson.completed_at === completedAtValue) {
            return lesson;
          }

          changed = true;
          return { ...lesson, is_completed: true, completed_at: completedAtValue };
        }

        if (completedIndex >= 0 && index === completedIndex + 1) {
          if (lesson.is_unlocked) {
            return lesson;
          }

          changed = true;
          return { ...lesson, is_unlocked: true };
        }

        return lesson;
      });

      return changed ? nextLessons : prev;
    });

    setCompletionError(null);
  }, []);

  const handleProgressChange = useCallback((progress: LessonWatchProgress) => {
    setWatchProgress(progress);

    if (currentLessonId && progress.isCompleted) {
      applyLessonCompletion(currentLessonId, progress.completedAt);
    }
  }, [applyLessonCompletion, currentLessonId]);

  // Mark lesson as complete
  const handleMarkComplete = async (progressOverride?: LessonWatchProgress): Promise<boolean> => {
    const progress = progressOverride ?? watchProgress;

    if (
      !currentLesson ||
      markingComplete ||
      !progress.canComplete
    ) {
      return currentLesson?.is_completed ?? false;
    }

    if (currentLesson.is_completed) {
      return true;
    }
    
    try {
      setMarkingComplete(true);
      setCompletionError(null);
      
      const response = await fetch("/api/lms/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: currentLesson.id,
          time_spent_seconds: Math.floor(progress.maxWatchedSeconds),
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        applyLessonCompletion(currentLesson.id, data?.data?.completed_at ?? progress.completedAt);
        return true;
      } else {
        setCompletionError(data?.error || "Please watch at least 95% before marking complete.");
        return false;
      }
    } catch (err) {
      console.error("Failed to mark complete:", err);
      setCompletionError("Unable to mark this lesson complete. Please try again.");
      return false;
    } finally {
      setMarkingComplete(false);
    }
  };
  
  // Get current lesson index
  const currentIndex = categoryLessons.findIndex(l => l.id === currentLesson?.id);
  const hasCurrentLessonInCategory = currentIndex >= 0;
  const hasNext = hasCurrentLessonInCategory && currentIndex < categoryLessons.length - 1;
  const hasPrev = currentIndex > 0;
  const canGoNext = hasNext && Boolean(categoryLessons[currentIndex + 1]?.is_unlocked);
  
  // Navigate to next/prev (only if unlocked)
  const goToNext = () => {
    if (hasNext) {
      const nextLesson = categoryLessons[currentIndex + 1];
      if (nextLesson.is_unlocked) {
        router.push(`/lms/lesson/${nextLesson.id}`, { scroll: false });
      }
    }
  };
  
  const goToPrev = () => {
    if (hasPrev) {
      router.push(`/lms/lesson/${categoryLessons[currentIndex - 1].id}`, { scroll: false });
    }
  };
  
  // Go to first available lesson
  const goToAvailableLesson = () => {
    const firstUnlocked = categoryLessons.find(l => l.is_unlocked);
    if (firstUnlocked) {
      router.push(`/lms/lesson/${firstUnlocked.id}`, { scroll: false });
    } else {
      router.push("/lms", { scroll: false });
    }
  };
  
  // Calculate progress
  const totalLessonCount = categoryLessons.length || (currentLesson ? 1 : 0);
  const completedCount = categoryLessons.length > 0
    ? categoryLessons.filter(l => l.is_completed).length
    : currentLesson?.is_completed
      ? 1
      : 0;
  const progressPercentage = totalLessonCount > 0
    ? Math.round((completedCount / totalLessonCount) * 100)
    : 0;
  const lessonPosition = hasCurrentLessonInCategory ? currentIndex + 1 : currentLesson ? 1 : 0;
  const watchedPercentage = Math.min(100, Math.max(0, Math.floor(watchProgress.watchPercentage)));
  const lessonStatusLabel =
    currentLesson?.is_completed || watchProgress.isCompleted
      ? "Completed"
      : watchProgress.canComplete
        ? "Ready to complete"
        : `Watched ${watchedPercentage}%`;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading lesson...</span>
        </div>
      </div>
    );
  }
  
  if (error || !currentLesson) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || "Lesson not found"}
          </h2>
          <GlassButton variant="primary" onClick={() => router.push("/lms", { scroll: false })}>
            Back to Dashboard
          </GlassButton>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Lesson Guard Modal */}
      {showGuard && (
        <LessonGuard 
          isUnlocked={false} 
          previousLessonTitle={previousLessonTitle}
          onGoBack={goToAvailableLesson}
        />
      )}
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-14 lg:top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => router.push("/lms", { scroll: false })}
                aria-label="Back to LMS"
                title="Back to LMS"
                className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {category?.name || "Training"}
                </p>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {currentLesson.title}
                </h1>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 dark:bg-gray-700/60 dark:text-gray-200">
                <Clock className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                <span>{lessonPosition} / {totalLessonCount || 0} lessons</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Course {completedCount} / {totalLessonCount || 0}</span>
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                  currentLesson.is_completed || watchProgress.canComplete
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                }`}
              >
                {currentLesson.is_completed || watchProgress.canComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>{lessonStatusLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-3 py-4 sm:px-6 sm:py-6">
        {completionError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            {completionError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Left Column - Video Player */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-2">
            {/* Video Player */}
            <VideoPlayer 
              lessonId={currentLesson.id}
              title={currentLesson.title}
              youtubeUrl={currentLesson.youtube_url}
              youtubeVideoId={currentLesson.youtube_video_id}
              thumbnailUrl={currentLesson.thumbnail_url}
              stepByStepInstructions={currentLesson.step_by_step_instructions}
              durationMinutes={currentLesson.duration_minutes}
              isCompleted={currentLesson.is_completed}
              onComplete={handleMarkComplete}
              onPrevious={goToPrev}
              onNext={goToNext}
              canGoPrevious={hasPrev}
              canGoNext={canGoNext}
              onProgressChange={handleProgressChange}
            />
            
            {/* Video Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-gray-500 dark:text-gray-400">
                    Lesson Details
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {`${currentLesson.duration_minutes || 0} minutes`}
                    </span>
                    <span>•</span>
                    <span>{`Lesson ${lessonPosition} of ${totalLessonCount}`}</span>
                    <span>•</span>
                    <span>{`Watched ${watchedPercentage}%`}</span>
                    {!currentLesson.is_unlocked && (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {currentLesson.description && (
                <p className="mb-4 break-words text-sm text-gray-600 dark:text-gray-300">
                  {currentLesson.description}
                </p>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                <GlassButton
                  variant="secondary"
                  onClick={goToPrev}
                  disabled={!hasPrev}
                  className={!hasPrev ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </GlassButton>
                
                <GlassButton
                  variant="secondary"
                  onClick={goToNext}
                  disabled={!canGoNext}
                  className={!canGoNext ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </GlassButton>
              </div>
            </div>
            
            {/* Step-by-Step Instructions */}
            <StepByStepPanel instructions={currentLesson.step_by_step_instructions} />
          </div>
          
          {/* Right Column - Playlist */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  Course Content
                </h3>
                
                <div className="space-y-2 pr-2 lg:max-h-[calc(100vh-320px)] lg:overflow-y-auto custom-scrollbar">
                  {categoryLessons.map((lesson, index) => (
                    <LessonPlaylistItem
                      key={lesson.id}
                      lesson={lesson}
                      isActive={lesson.id === currentLesson.id}
                      index={index}
                      onClick={() => handleLessonClick(lesson)}
                    />
                  ))}
                </div>
                
                {/* Progress Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Course Progress</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {completedCount} / {totalLessonCount} lessons
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    {progressPercentage}% completed
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
