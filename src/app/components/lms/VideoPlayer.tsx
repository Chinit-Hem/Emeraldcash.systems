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
  onComplete: (progress?: VideoProgressSnapshot) => void | Promise<boolean | void>;
  onBack: () => void;
  onProgressChange?: (progress: VideoProgressSnapshot) => void;
}

type VideoProgressSnapshot = {
  watchPercentage: number;
  canComplete: boolean;
  currentTimeSeconds: number;
  maxWatchedSeconds: number;
  isCompleted: boolean;
  completedAt: string | null;
};

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
    isCompleted?: boolean;
    completedAt?: string | null;
    currentTimeSeconds: number;
    maxWatchedSeconds: number;
    durationSeconds: number;
    watchPercentage: number;
    canComplete: boolean;
  };
};

const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const PROGRESS_SAVE_INTERVAL_MS = 10_000;
const PROGRESS_POLL_INTERVAL_MS = 1_000;
const VIDEO_CONTROLS_HIDE_DELAY_MS = 2_200;
const MAX_PLAYBACK_RATE = 1.25;
const SEEK_GRACE_SECONDS = 2;
const COMPLETE_END_TOLERANCE_SECONDS = 5;
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
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [seekPreviewPercent, setSeekPreviewPercent] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerMountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const maxWatchedRef = useRef(0);
  const durationRef = useRef(0);
  const isCompletedRef = useRef(initialCompleted);
  const playbackUnlockedRef = useRef(initialCompleted);
const isScrubbingRef = useRef(false);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const doubleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onProgressChangeRef = useRef(onProgressChange);

  const instructionSteps = useMemo(
    () => parseInstructionSteps(stepByStepInstructions),
    [stepByStepInstructions]
  );

  const completionAllowed = isCompleted || watchPercentage >= completionThreshold;
  const playbackUnlocked = completionAllowed;
  const currentProgressPercent =
    videoDuration > 0 ? clamp((currentTime / videoDuration) * 100, 0, 100) : 0;
  const progressPercent = seekPreviewPercent ?? currentProgressPercent;
  const displayTime =
    seekPreviewPercent !== null && videoDuration > 0
      ? (seekPreviewPercent / 100) * videoDuration
      : currentTime;
  const maxSeekPercent =
    playbackUnlocked
      ? 100
      : videoDuration > 0
        ? clamp((maxWatchedSeconds / videoDuration) * 100, 0, 100)
        : 0;
  const durationLabel =
    videoDuration > 0
      ? formatTime(videoDuration)
      : durationMinutes
        ? `${durationMinutes} min`
        : "Loading";
  const playbackStatusLabel = playbackUnlocked
    ? "Replay: seek and speed unlocked"
    : "First watch: seek and speed protected";
  const shouldShowVideoControls = !isReady || !isPlaying || !!warning || areControlsVisible;
  const lessonProgress =
    instructionSteps.length > 0
      ? ((currentStep + 1) / instructionSteps.length) * 100
      : 0;

  const showWarning = useCallback((message: string) => {
    setWarning(message);
    window.setTimeout(() => setWarning(null), 3500);
  }, []);

  const clearControlsHideTimeout = useCallback(() => {
    if (controlsHideTimeoutRef.current) {
      clearTimeout(controlsHideTimeoutRef.current);
      controlsHideTimeoutRef.current = null;
    }
  }, []);

  const revealVideoControls = useCallback(() => {
    setAreControlsVisible(true);
    clearControlsHideTimeout();

    if (isPlaying && isReady) {
      controlsHideTimeoutRef.current = setTimeout(() => {
        setAreControlsVisible(false);
        controlsHideTimeoutRef.current = null;
      }, VIDEO_CONTROLS_HIDE_DELAY_MS);
    }
  }, [clearControlsHideTimeout, isPlaying, isReady]);

  useEffect(() => {
    setIsCompleted(initialCompleted);
    isCompletedRef.current = initialCompleted;
    playbackUnlockedRef.current = initialCompleted;
  }, [initialCompleted, lessonId]);

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  useEffect(() => {
    playbackUnlockedRef.current = playbackUnlocked;
  }, [playbackUnlocked]);

  useEffect(() => {
    if (!isPlaying || !isReady || warning) {
      clearControlsHideTimeout();
      setAreControlsVisible(true);
      return;
    }

    revealVideoControls();
    return clearControlsHideTimeout;
  }, [clearControlsHideTimeout, isPlaying, isReady, revealVideoControls, warning]);

  const updateWatchState = useCallback(
    (
      nextCurrentTime: number,
      nextMaxWatched: number,
      nextDuration: number,
      completion?: { isCompleted?: boolean; completedAt?: string | null }
    ) => {
      const safeCurrent = Math.max(0, nextCurrentTime);
      const safeMax = Math.max(0, nextMaxWatched);
      const safeDuration = Math.max(0, nextDuration);
      const nextPercentage =
        safeDuration > 0
          ? clamp(Number(((safeMax / safeDuration) * 100).toFixed(2)), 0, 100)
          : 0;
      const reachedVideoEnd =
        safeDuration > 0 &&
        safeMax >= Math.max(0, safeDuration - COMPLETE_END_TOLERANCE_SECONDS);
      const nextIsCompleted = Boolean(completion?.isCompleted ?? isCompletedRef.current);

      currentTimeRef.current = safeCurrent;
      maxWatchedRef.current = safeMax;
      durationRef.current = safeDuration;
      const nextCanComplete =
        nextIsCompleted || nextPercentage >= completionThreshold || reachedVideoEnd;
      if (nextIsCompleted) {
        isCompletedRef.current = true;
        setIsCompleted(true);
      }
      playbackUnlockedRef.current = nextCanComplete;

      setCurrentTime(safeCurrent);
      setMaxWatchedSeconds(safeMax);
      setVideoDuration(safeDuration);
      setWatchPercentage(nextPercentage);

      onProgressChangeRef.current?.({
        watchPercentage: nextPercentage,
        canComplete: nextCanComplete,
        currentTimeSeconds: safeCurrent,
        maxWatchedSeconds: safeMax,
        isCompleted: nextIsCompleted,
        completedAt: completion?.completedAt ?? null,
      });
    },
    [completionThreshold]
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
          playbackUnlockedRef.current =
            playbackUnlockedRef.current || result.data.canComplete || isCompletedRef.current;
          setWatermarkName(result.data.staffName || staffName || "Staff");
          updateWatchState(
            result.data.currentTimeSeconds,
            result.data.maxWatchedSeconds,
            result.data.durationSeconds || durationRef.current,
            {
              isCompleted: result.data.isCompleted,
              completedAt: result.data.completedAt ?? null,
            }
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
          playbackUnlockedRef.current =
            playbackUnlockedRef.current || savedProgress.canComplete || isCompletedRef.current;
          setWatermarkName(savedProgress.staffName || staffName || "Staff");
          updateWatchState(
            savedProgress.currentTimeSeconds,
            savedProgress.maxWatchedSeconds,
            savedProgress.durationSeconds,
            {
              isCompleted: savedProgress.isCompleted,
              completedAt: savedProgress.completedAt ?? null,
            }
          );
        }

playerRef.current = new yt.Player(playerMountRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            // Enable proper mobile fullscreen like YouTube
            webkitfullscreen: 1,
            mozfullscreen: 1,
            allowfullscreen: 1,
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

              if (event.data === yt.PlayerState.ENDED) {
                const duration = event.target.getDuration() || durationRef.current;
                const completedDuration = Math.max(duration, durationRef.current);
                playbackUnlockedRef.current = true;
                updateWatchState(completedDuration, completedDuration, completedDuration);
                void saveProgress();
                return;
              }

              if (isNowPlaying) {
                progressIntervalRef.current = setInterval(() => {
                  const player = playerRef.current;
                  if (!player) {
                    return;
                  }

                  if (isScrubbingRef.current) {
                    return;
                  }

                  const nextCurrent = player.getCurrentTime();
                  const duration = player.getDuration() || durationRef.current || 1;
                  const nextMax = Math.max(maxWatchedRef.current, nextCurrent);
                  updateWatchState(nextCurrent, nextMax, duration);
                }, PROGRESS_POLL_INTERVAL_MS);
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

    // Track fullscreen changes (works on mobile and desktop)
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Handle orientation change on mobile - re-center video
    const handleOrientationChange = () => {
      // Small delay to allow orientation to complete
      setTimeout(() => {
        revealVideoControls();
      }, 100);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
      clearControlsHideTimeout();
    };
  }, [clearControlsHideTimeout, saveProgress, showWarning, revealVideoControls]);

  const togglePlay = useCallback(() => {
    if (!isReady || !playerRef.current) {
      return;
    }

    revealVideoControls();

    if (isPlaying) {
      playerRef.current.pauseVideo();
      saveProgress();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying, isReady, revealVideoControls, saveProgress]);

  const commitSeek = useCallback(
    (requestedProgress: number) => {
      const safeDuration = durationRef.current;
      if (!playerRef.current || safeDuration <= 0) {
        setSeekPreviewPercent(null);
        return;
      }

      const safeProgress = clamp(requestedProgress, 0, 100);
      const requestedTime = (safeProgress / 100) * safeDuration;
      const maxAllowedTime = maxWatchedRef.current + SEEK_GRACE_SECONDS;
      const isUnlockedForReplay =
        playbackUnlockedRef.current ||
        (safeDuration > 0 &&
          ((maxWatchedRef.current / safeDuration) * 100 >= completionThreshold ||
            maxWatchedRef.current >= Math.max(0, safeDuration - COMPLETE_END_TOLERANCE_SECONDS)));

      setSeekPreviewPercent(null);

      if (!isUnlockedForReplay && requestedTime > maxAllowedTime) {
        playerRef.current.seekTo(maxWatchedRef.current, true);
        updateWatchState(maxWatchedRef.current, maxWatchedRef.current, safeDuration);
        showWarning("Seeking forward is locked until you watch that part of the lesson.");
        return;
      }

      playerRef.current.seekTo(requestedTime, true);
      updateWatchState(
        requestedTime,
        isUnlockedForReplay
          ? Math.max(maxWatchedRef.current, requestedTime)
          : maxWatchedRef.current,
        safeDuration
      );
      saveProgress();
    },
    [completionThreshold, saveProgress, showWarning, updateWatchState]
  );

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    revealVideoControls();
    const requestedProgress = clamp(Number(event.target.value), 0, 100);
    setSeekPreviewPercent(requestedProgress);

    if (!isScrubbingRef.current) {
      commitSeek(requestedProgress);
    }
  };

  const handleSeekStart = () => {
    isScrubbingRef.current = true;
    revealVideoControls();
  };

const handleSeekCommit = (event: React.PointerEvent<HTMLInputElement>) => {
    if (!isScrubbingRef.current) {
      return;
    }

    isScrubbingRef.current = false;
    commitSeek(seekPreviewPercent ?? Number(event.currentTarget.value));
  };

// Mobile touch gesture handler - double tap sides to seek, center to play/pause
  const handleTouchGesture = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isReady || !playerRef.current) return;
    
    // Use changedTouches for touchend event (touches is empty on touchend)
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const now = Date.now();
    
    // Check for double tap (within 300ms and close location)
    if (
      lastTapRef.current &&
      now - lastTapRef.current.time < 300 &&
      Math.abs(touch.clientX - lastTapRef.current.x) < 50 &&
      Math.abs(touch.clientY - lastTapRef.current.y) < 50
    ) {
      // Double tap detected - seek left (25%) or right (75%)
      if (x < 0.35) {
        // Left side - seek back 10 seconds
        const newTime = Math.max(0, currentTimeRef.current - 10);
        playerRef.current.seekTo(newTime, true);
        updateWatchState(newTime, Math.max(maxWatchedRef.current, newTime), durationRef.current);
      } else if (x > 0.65) {
        // Right side - seek forward 10 seconds
        const newTime = Math.min(durationRef.current, currentTimeRef.current + 10);
        playerRef.current.seekTo(newTime, true);
        updateWatchState(newTime, Math.max(maxWatchedRef.current, newTime), durationRef.current);
      }
      // Clear timeout
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current);
        doubleTapTimeoutRef.current = null;
      }
      lastTapRef.current = null;
    } else {
      // Single tap - store for double tap detection
      lastTapRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      // Clear any pending timeout
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current);
      }
      // Toggle play/pause after short delay if no double tap
      doubleTapTimeoutRef.current = setTimeout(() => {
        if (lastTapRef.current) {
          // Toggle play/pause on single tap
          if (isPlaying) {
            playerRef.current?.pauseVideo();
          } else {
            playerRef.current?.playVideo();
          }
          lastTapRef.current = null;
        }
      }, 200);
    }
    
    revealVideoControls();
  }, [isReady, isPlaying, commitSeek, updateWatchState]);

  const handlePlaybackRateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    revealVideoControls();
    const nextRate = Number(event.target.value);

    if (!playerRef.current || !Number.isFinite(nextRate)) {
      return;
    }

    if (!playbackUnlockedRef.current && nextRate > MAX_PLAYBACK_RATE) {
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
    revealVideoControls();
    // Use refs to get the most accurate duration value
    const safeDuration = durationRef.current;
    playerRef.current?.seekTo(0, true);
    playerRef.current?.playVideo();
    // Fix: Use durationRef.current instead of videoDuration (which can be stale state)
    updateWatchState(0, maxWatchedRef.current, safeDuration);
  };

const toggleFullscreen = useCallback(() => {
    revealVideoControls();
    const container = containerRef.current;
    if (!container) return;

    // Check if already in fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
      return;
    }

    // Detect iOS Safari and use webkit fullscreen (with type assertion)
    const isIOSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
      /Safari/.test(navigator.userAgent) && 
      !/Chrome/.test(navigator.userAgent);
    
    // Try iOS webkit fullscreen first for iOS devices
    if (isIOSafari && (container as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
      (container as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      setIsFullscreen(true);
      return;
    }

    // Standard fullscreen API for Android and desktop
    container.requestFullscreen().catch(() => {
      // Fallback: rely on YouTube's native fullscreen button (fs:1)
      // which will trigger fullscreen in the iframe
    });
    setIsFullscreen(true);
  }, [revealVideoControls]);

  const handleComplete = async () => {
    if (!completionAllowed) {
      showWarning(`Please watch at least ${completionThreshold}% before completing this lesson.`);
      return;
    }

    const wasCompleted = isCompletedRef.current;
    const completedAt = new Date().toISOString();
    isCompletedRef.current = true;
    playbackUnlockedRef.current = true;
    setIsCompleted(true);

    try {
      await saveProgress();
      const result = await onComplete({
        watchPercentage,
        canComplete: true,
        currentTimeSeconds: currentTimeRef.current,
        maxWatchedSeconds: maxWatchedRef.current,
        isCompleted: true,
        completedAt,
      });

      if (result === false && !wasCompleted) {
        isCompletedRef.current = false;
        setIsCompleted(false);
      }
    } catch {
      if (!wasCompleted) {
        isCompletedRef.current = false;
        setIsCompleted(false);
      }
      showWarning("Unable to mark this lesson complete. Please try again.");
    }
  };

  return (
    <div className="bg-gray-50 p-0 dark:bg-gray-900 sm:p-0 lms-lesson-page">
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
              className="w-full sm:w-auto"
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
              className={isFullscreen ? "fixed inset-0 z-50 bg-black flex items-center justify-center" : ""}
            >
<GlassCard className={`overflow-hidden rounded-2xl p-0 ${isFullscreen ? "w-full h-full max-w-full max-h-full" : ""}`}>
                <div
className={`relative bg-black ${
                    shouldShowVideoControls ? "" : "cursor-none"
                  } ${
                    isFullscreen 
                      ? "w-full h-full aspect-video md:aspect-video flex items-center justify-center" 
                      : "aspect-video"
                  }`}
                  onMouseMove={revealVideoControls}
                  onTouchStart={revealVideoControls}
                  onPointerDown={revealVideoControls}
                  onFocusCapture={revealVideoControls}
                  onTouchEnd={handleTouchGesture}
                >
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

                      <div
                        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-10 transition-all duration-300 ${
                          shouldShowVideoControls
                            ? "translate-y-0 opacity-100"
                            : "pointer-events-none translate-y-4 opacity-0"
                        }`}
                      >
                        <div className="mb-3 flex flex-col gap-1 text-xs text-white/80 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
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
                            {formatTime(displayTime)}
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={progressPercent}
                            onChange={handleSeekChange}
                            onPointerDown={handleSeekStart}
                            onPointerUp={handleSeekCommit}
                            onPointerCancel={handleSeekCommit}
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

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
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
                              className="h-10 max-w-[74px] rounded-full border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white outline-none transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60 sm:max-w-none sm:px-3"
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

                <div className="flex flex-col gap-3 border-t border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
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
                    className={`self-start rounded-lg p-2 transition-colors sm:self-auto ${
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
              <div className="mb-2 flex items-center justify-between gap-3">
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

            {instructionSteps.length > 0 && (
              <GlassCard className="rounded-2xl p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Instruction Progress
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {`Step ${currentStep + 1} of ${instructionSteps.length}`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${lessonProgress}%` }}
                  />
                </div>
              </GlassCard>
            )}
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
