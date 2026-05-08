/**
 * LMS YouTube player with overlay, anti-cheat tracking, Neon progress sync,
 * resume playback, and a dynamic staff watermark.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Maximize2,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassCard } from "@/components/ui/glass/GlassCard";

interface VideoPlayerProps {
  lessonId: number;
  title: string;
  description: string | null;
  youtubeUrl: string;
  youtubeVideoId: string;
  stepByStepInstructions: string | null;
  durationMinutes: number | null;
  isCompleted: boolean;
  staffName?: string;
  thumbnailUrl?: string | null;
  completionThreshold?: number;
  onComplete: () => void;
  onBack: () => void;
  onProgressChange?: (progress: {
    watchPercentage: number;
    canComplete: boolean;
    currentTimeSeconds: number;
    maxWatchedSeconds: number;
  }) => void;
}

interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  destroy: () => void;
}

interface YouTubePlayerEvent {
  data: number;
  target: YouTubePlayer;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      playerVars: Record<string, number>;
      events: {
        onReady: (event: YouTubePlayerEvent) => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
        onPlaybackRateChange: (event: YouTubePlayerEvent) => void;
        onError: () => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    ENDED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type ProgressResponse = {
  success: boolean;
  data?: {
    staffName?: string;
    currentTimeSeconds: number;
    maxWatchedSeconds: number;
    durationSeconds: number;
    watchPercentage: number;
    canComplete: boolean;
  };
};

const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const PROGRESS_SAVE_INTERVAL_MS = 10_000;
const MAX_PLAYBACK_RATE = 1.25;
const SEEK_GRACE_SECONDS = 2;
const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2];

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeIframeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();

      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube iframe API loaded without YT.Player."));
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_SRC}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("error", () =>
        reject(new Error("Unable to load YouTube iframe API."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = YOUTUBE_IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("Unable to load YouTube iframe API."));

    const firstScript = document.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  });

  return youtubeApiPromise;
}

function parseInstructionSteps(instructions: string | null) {
  if (!instructions) {
    return [];
  }

  return instructions
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .replace(/^[-*]\s*/, "")
        .trim()
    )
    .filter(Boolean);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function InstructionsPanel({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: string[];
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FileText className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No instructions available for this lesson
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const isActive = currentStep === index;

        return (
          <button
            key={`${index}-${step}`}
            type="button"
            onClick={() => onStepClick(index)}
            className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all ${
              isActive
                ? "border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800"
            }`}
          >
            <span
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                isActive
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`text-sm ${
                isActive
                  ? "font-medium text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {step}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function VideoPlayer({
  lessonId,
  title,
  description,
  youtubeUrl,
  youtubeVideoId,
  stepByStepInstructions,
  durationMinutes,
  isCompleted: initialCompleted,
  staffName,
  thumbnailUrl,
  completionThreshold = 95,
  onComplete,
  onBack,
  onProgressChange,
}: VideoPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxWatchedSeconds, setMaxWatchedSeconds] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [warning, setWarning] = useState<string | null>(null);
  const [watermarkName, setWatermarkName] = useState(staffName ?? "Staff");

  const containerRef = useRef<HTMLDivElement>(null);
  const playerMountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const maxWatchedRef = useRef(0);
  const durationRef = useRef(0);
  const playbackUnlockedRef = useRef(initialCompleted);

  const instructionSteps = useMemo(
    () => parseInstructionSteps(stepByStepInstructions),
    [stepByStepInstructions]
  );

  const completionAllowed = isCompleted || watchPercentage >= completionThreshold;
  const playbackUnlocked = isCompleted;
  const progressPercent =
    videoDuration > 0 ? clamp((currentTime / videoDuration) * 100, 0, 100) : 0;
  const maxSeekPercent =
    videoDuration > 0 ? clamp((maxWatchedSeconds / videoDuration) * 100, 0, 100) : 0;
  const durationLabel =
    videoDuration > 0
      ? formatTime(videoDuration)
      : durationMinutes
        ? `${durationMinutes} min`
        : "Loading";
  const playbackStatusLabel = playbackUnlocked
    ? "Replay: seek and speed unlocked"
    : "First watch: seek and speed protected";
  const lessonProgress =
    instructionSteps.length > 0
      ? ((currentStep + 1) / instructionSteps.length) * 100
      : 0;

  const showWarning = useCallback((message: string) => {
    setWarning(message);
    window.setTimeout(() => setWarning(null), 3500);
  }, []);

  useEffect(() => {
    playbackUnlockedRef.current = playbackUnlocked;
  }, [playbackUnlocked]);

  const updateWatchState = useCallback(
    (nextCurrentTime: number, nextMaxWatched: number, nextDuration: number) => {
      const safeCurrent = Math.max(0, nextCurrentTime);
      const safeMax = Math.max(0, nextMaxWatched);
      const safeDuration = Math.max(0, nextDuration);
      const nextPercentage =
        safeDuration > 0
          ? clamp(Number(((safeMax / safeDuration) * 100).toFixed(2)), 0, 100)
          : 0;

      currentTimeRef.current = safeCurrent;
      maxWatchedRef.current = safeMax;
      durationRef.current = safeDuration;

      setCurrentTime(safeCurrent);
      setMaxWatchedSeconds(safeMax);
      setVideoDuration(safeDuration);
      setWatchPercentage(nextPercentage);

      onProgressChange?.({
        watchPercentage: nextPercentage,
        canComplete: nextPercentage >= completionThreshold,
        currentTimeSeconds: safeCurrent,
        maxWatchedSeconds: safeMax,
      });
    },
    [completionThreshold, onProgressChange]
  );

  const saveProgress = useCallback(
    async (flags?: { playbackRateViolation?: boolean; tabHiddenPause?: boolean }) => {
      if (!lessonId || durationRef.current <= 0) {
        return;
      }

      try {
        const response = await fetch("/api/lms/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            currentTimeSeconds: Math.floor(currentTimeRef.current),
            maxWatchedSeconds: Math.floor(maxWatchedRef.current),
            durationSeconds: Math.floor(durationRef.current),
            playbackRateViolation: !!flags?.playbackRateViolation,
            tabHiddenPause: !!flags?.tabHiddenPause,
          }),
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as ProgressResponse;
        if (result.success && result.data) {
          setWatermarkName(result.data.staffName || staffName || "Staff");
          updateWatchState(
            result.data.currentTimeSeconds,
            result.data.maxWatchedSeconds,
            result.data.durationSeconds || durationRef.current
          );
        }
      } catch {
        // Progress saving is best-effort; the next interval will retry.
      }
    },
    [lessonId, staffName, updateWatchState]
  );

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const clearSaveInterval = useCallback(() => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedProgress() {
      if (!lessonId) {
        return null;
      }

      try {
        const response = await fetch(`/api/lms/progress?lessonId=${lessonId}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as ProgressResponse;
        return result.success ? result.data ?? null : null;
      } catch {
        return null;
      }
    }

    setHasError(false);
    setIsReady(false);
    setIsPlaying(false);
    setWarning(null);
    updateWatchState(0, 0, 0);
    clearProgressInterval();
    clearSaveInterval();

    Promise.all([loadYouTubeIframeApi(), loadSavedProgress()])
      .then(([yt, savedProgress]) => {
        if (!isMounted || !playerMountRef.current) {
          return;
        }

        if (savedProgress) {
          resumeTimeRef.current = savedProgress.currentTimeSeconds || 0;
          setWatermarkName(savedProgress.staffName || staffName || "Staff");
          updateWatchState(
            savedProgress.currentTimeSeconds,
            savedProgress.maxWatchedSeconds,
            savedProgress.durationSeconds
          );
        }

        playerRef.current = new yt.Player(playerMountRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (!isMounted) {
                return;
              }

              const duration = event.target.getDuration();
              const resumeAt = Math.min(resumeTimeRef.current, Math.max(0, duration - 3));

              setIsReady(true);
              updateWatchState(resumeAt, Math.max(maxWatchedRef.current, resumeAt), duration);

              if (resumeAt > 0) {
                event.target.seekTo(resumeAt, true);
              }

              void saveProgress();

              saveIntervalRef.current = setInterval(
                () => saveProgress(),
                PROGRESS_SAVE_INTERVAL_MS
              );
            },
            onStateChange: (event) => {
              if (!isMounted) {
                return;
              }

              const isNowPlaying = event.data === yt.PlayerState.PLAYING;
              setIsPlaying(isNowPlaying);
              clearProgressInterval();

              if (isNowPlaying) {
                progressIntervalRef.current = setInterval(() => {
                  const player = playerRef.current;
                  if (!player) {
                    return;
                  }

                  const nextCurrent = player.getCurrentTime();
                  const duration = player.getDuration() || durationRef.current || 1;
                  const nextMax = Math.max(maxWatchedRef.current, nextCurrent);
                  updateWatchState(nextCurrent, nextMax, duration);
                }, 1000);
              }
            },
            onPlaybackRateChange: (event) => {
              const playbackRate = event.target.getPlaybackRate();
              setPlaybackRate(playbackRate);

              if (!playbackUnlockedRef.current && playbackRate > MAX_PLAYBACK_RATE) {
                event.target.setPlaybackRate(1);
                setPlaybackRate(1);
                showWarning("Playback speed above 1.25x is not allowed. Speed reset to 1x.");
                saveProgress({ playbackRateViolation: true });
              }
            },
            onError: () => {
              if (isMounted) {
                setHasError(true);
              }
            },
          },
        });
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
        }
      });

    return () => {
      isMounted = false;
      clearProgressInterval();
      clearSaveInterval();
      saveProgress();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [
    clearProgressInterval,
    clearSaveInterval,
    lessonId,
    saveProgress,
    showWarning,
    staffName,
    updateWatchState,
    youtubeVideoId,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && playerRef.current) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        showWarning("Video paused because the tab is no longer active.");
        saveProgress({ tabHiddenPause: true });
      }
    };

    const handleBeforeUnload = () => {
      saveProgress();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveProgress, showWarning]);

  const togglePlay = useCallback(() => {
    if (!isReady || !playerRef.current) {
      return;
    }

    if (isPlaying) {
      playerRef.current.pauseVideo();
      saveProgress();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying, isReady, saveProgress]);

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Use refs for duration to ensure we have the most up-to-date value, not stale state
    const safeDuration = durationRef.current;
    if (!playerRef.current || safeDuration <= 0) {
      return;
    }

    const requestedProgress = Number(event.target.value);
    // Fix: Use durationRef.current instead of videoDuration (which can be stale state)
    const requestedTime = (requestedProgress / 100) * safeDuration;
    const maxAllowedTime = maxWatchedRef.current + SEEK_GRACE_SECONDS;

    if (!playbackUnlocked && requestedTime > maxAllowedTime) {
      playerRef.current.seekTo(maxWatchedRef.current, true);
      updateWatchState(maxWatchedRef.current, maxWatchedRef.current, safeDuration);
      showWarning("Seeking forward is locked until you watch that part of the lesson.");
      return;
    }

    playerRef.current.seekTo(requestedTime, true);
    updateWatchState(
      requestedTime,
      playbackUnlocked ? Math.max(maxWatchedRef.current, requestedTime) : maxWatchedRef.current,
      safeDuration
    );
    saveProgress();
  };

  const handlePlaybackRateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRate = Number(event.target.value);

    if (!playerRef.current || !Number.isFinite(nextRate)) {
      return;
    }

    if (!playbackUnlocked && nextRate > MAX_PLAYBACK_RATE) {
      playerRef.current.setPlaybackRate(1);
      setPlaybackRate(1);
      showWarning("Higher playback speeds unlock after you finish watching this lesson.");
      saveProgress({ playbackRateViolation: true });
      return;
    }

    playerRef.current.setPlaybackRate(nextRate);
    setPlaybackRate(nextRate);
  };

  const restartVideo = () => {
    // Use refs to get the most accurate duration value
    const safeDuration = durationRef.current;
    playerRef.current?.seekTo(0, true);
    playerRef.current?.playVideo();
    // Fix: Use durationRef.current instead of videoDuration (which can be stale state)
    updateWatchState(0, maxWatchedRef.current, safeDuration);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleComplete = () => {
    if (!completionAllowed) {
      showWarning(`Please watch at least ${completionThreshold}% before completing this lesson.`);
      return;
    }

    setIsCompleted(true);
    saveProgress();
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 sm:p-6 lms-lesson-page">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800"
              aria-label="Back to course"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
          </div>

          {isCompleted ? (
            <div className="inline-flex items-center gap-2 self-start rounded-lg bg-emerald-100 px-4 py-2 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 sm:self-auto">
              <CheckCircle2 className="h-5 w-5" />
              Completed
            </div>
          ) : (
            <GlassButton
              variant="primary"
              onClick={handleComplete}
              disabled={!completionAllowed}
              title={
                completionAllowed
                  ? "Mark lesson complete"
                  : `Watch ${completionThreshold}% to unlock completion`
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Complete
            </GlassButton>
          )}
        </header>

        <main className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div
              ref={containerRef}
              className={isFullscreen ? "fixed inset-0 z-50 bg-black" : ""}
            >
              <GlassCard className="overflow-hidden rounded-2xl p-0">
                <div className="relative aspect-video bg-black">
                  {thumbnailUrl && !isReady && !hasError && (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-70"
                    />
                  )}

                  {!hasError ? (
                    <>
                      <div ref={playerMountRef} className="absolute inset-0 h-full w-full" />

                      <button
                        type="button"
                        onClick={togglePlay}
                        disabled={!isReady}
                        className="absolute inset-0 z-10 cursor-pointer bg-transparent disabled:cursor-wait"
                        aria-label={isPlaying ? "Pause video" : "Play video"}
                      />

                      <div
                        aria-hidden="true"
                        className="absolute left-0 right-0 top-0 z-20 h-16 bg-transparent sm:h-20"
                      />

                      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                        <div className="lms-video-watermark absolute top-8 rounded-md bg-black/30 px-3 py-1 text-xs font-semibold text-white/70 shadow-sm">
                          {watermarkName} • {new Date().toLocaleDateString()}
                        </div>
                      </div>

                      {warning && (
                        <div className="absolute left-4 right-4 top-4 z-40 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/90 px-4 py-3 text-sm font-medium text-white shadow-lg">
                          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                          <span>{warning}</span>
                        </div>
                      )}

                      {!isReady && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950/70">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                            <p className="text-sm text-gray-200">Loading secure player...</p>
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-10">
                        <div className="mb-3 flex items-center justify-between text-xs text-white/80">
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4 text-emerald-300" />
                            Watched {watchPercentage.toFixed(0)}%
                          </span>
                          <span>
                            {playbackUnlocked
                              ? "Replay unlocked"
                              : `Complete unlocks at ${completionThreshold}%`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-11 text-xs font-medium tabular-nums text-white/80">
                            {formatTime(currentTime)}
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={progressPercent}
                            onChange={handleSeek}
                            disabled={!isReady}
                            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/25 accent-emerald-500 disabled:cursor-wait"
                            style={{
                              background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${progressPercent}%, rgba(255,255,255,0.45) ${progressPercent}%, rgba(255,255,255,0.45) ${maxSeekPercent}%, rgba(255,255,255,0.25) ${maxSeekPercent}%, rgba(255,255,255,0.25) 100%)`,
                            }}
                            aria-label="Video progress"
                          />
                          <span className="w-11 text-right text-xs font-medium tabular-nums text-white/80">
                            {formatTime(videoDuration)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={togglePlay}
                              disabled={!isReady}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-950 shadow-lg transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                              aria-label={isPlaying ? "Pause video" : "Play video"}
                            >
                              {isPlaying ? (
                                <Pause className="h-5 w-5 fill-current" />
                              ) : (
                                <Play className="h-5 w-5 fill-current" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={restartVideo}
                              disabled={!isReady}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                              aria-label="Restart video"
                            >
                              <RotateCcw className="h-5 w-5" />
                            </button>

                            <select
                              value={playbackRate}
                              onChange={handlePlaybackRateChange}
                              disabled={!isReady}
                              className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white outline-none transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                              aria-label="Playback speed"
                              title={
                                playbackUnlocked
                                  ? "Playback speed"
                                  : "Speeds above 1.25x unlock after completing"
                              }
                            >
                              {PLAYBACK_RATES.map((rate) => (
                                <option
                                  key={rate}
                                  value={rate}
                                  disabled={!playbackUnlocked && rate > MAX_PLAYBACK_RATE}
                                >
                                  {rate}x
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                            aria-label="Toggle fullscreen"
                          >
                            <Maximize2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 p-6 text-center text-white">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                        <MonitorPlay className="h-8 w-8 text-red-400" />
                      </div>
                      <h3 className="text-lg font-semibold">Video player unavailable</h3>
                      <p className="mt-2 max-w-md text-sm text-gray-400">
                        The embedded video player cannot load due to browser or network restrictions.
                      </p>
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-medium text-white transition-colors hover:bg-red-700"
                      >
                        <MonitorPlay className="h-5 w-5" />
                        Open video on YouTube
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{durationLabel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      <span>{playbackStatusLabel}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowInstructions((value) => !value)}
                    className={`rounded-lg p-2 transition-colors ${
                      showInstructions
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                    aria-label={showInstructions ? "Hide instructions" : "Show instructions"}
                    title={showInstructions ? "Hide instructions" : "Show instructions"}
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lesson Progress
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Watched {watchPercentage.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${watchPercentage}%` }}
                />
              </div>
            </GlassCard>

            <GlassCard className="rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Instruction Progress
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Step {instructionSteps.length > 0 ? currentStep + 1 : 0} of{" "}
                  {instructionSteps.length}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${lessonProgress}%` }}
                />
              </div>
            </GlassCard>
          </section>

          {showInstructions && (
            <aside className="lg:col-span-1">
              <GlassCard className="h-full rounded-2xl p-0">
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    Step-by-Step Instructions
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Follow along with the video
                  </p>
                </div>

                <div className="max-h-[600px] overflow-y-auto p-4 lms-instructions-panel">
                  <InstructionsPanel
                    steps={instructionSteps}
                    currentStep={currentStep}
                    onStepClick={setCurrentStep}
                  />
                </div>

                {instructionSteps.length > 0 && (
                  <div className="flex justify-between border-t border-gray-200 p-4 dark:border-gray-700">
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                      disabled={currentStep === 0}
                    >
                      Previous
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        setCurrentStep((step) =>
                          Math.min(instructionSteps.length - 1, step + 1)
                        )
                      }
                      disabled={currentStep === instructionSteps.length - 1}
                    >
                      Next Step
                    </GlassButton>
                  </div>
                )}
              </GlassCard>
            </aside>
          )}
        </main>

        {!isCompleted && (
          <GlassCard className="rounded-2xl border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Finished the lesson?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Watch at least {completionThreshold}% to unlock completion.
                </p>
              </div>
              <GlassButton
                variant="primary"
                size="lg"
                onClick={handleComplete}
                disabled={!completionAllowed}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Mark as Complete
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

export default VideoPlayer;
