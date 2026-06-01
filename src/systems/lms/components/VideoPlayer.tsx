/**
 * LMS YouTube player with overlay, anti-cheat tracking, Neon progress sync,
 * resume playback, and a dynamic staff watermark.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Captions,
  Cast,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Maximize2,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";

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
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
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

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozFullScreenElement?: Element | null;
  mozCancelFullScreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
};

type OrientationController = {
  lock?: (orientation: "landscape" | "portrait" | "any" | "natural") => Promise<void>;
  unlock?: () => void;
};

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
const SMOOTH_PROGRESS_FRAME_MS = 90;
const VIDEO_CONTROLS_HIDE_DELAY_MS = 2_200;
const TOUCH_CLICK_SUPPRESS_MS = 600;
const DOUBLE_TAP_WINDOW_MS = 320;
const SEEK_JUMP_SECONDS = 15;
const SEEK_FEEDBACK_HIDE_DELAY_MS = 700;
const SEEK_SETTLE_LOCK_MS = 8_000;
const SEEK_SETTLE_TOLERANCE_SECONDS = 0.75;
const MAX_PLAYBACK_RATE = 1.25;
const SEEK_GRACE_SECONDS = 2;
const COMPLETE_END_TOLERANCE_SECONDS = 5;
const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2];

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

type SeekJumpDirection = "backward" | "forward";

type SurfaceTapState = {
  direction: SeekJumpDirection;
  time: number;
};

type SeekFeedbackState = {
  direction: SeekJumpDirection;
  key: number;
};

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

function getSeekGestureDirection(clientX: number, element: HTMLElement): SeekJumpDirection {
  const rect = element.getBoundingClientRect();
  const midpoint = rect.left + rect.width / 2;

  return clientX < midpoint ? "backward" : "forward";
}

function getActiveFullscreenElement() {
  const fullscreenDocument = document as FullscreenCapableDocument;

  return (
    document.fullscreenElement ??
    fullscreenDocument.webkitFullscreenElement ??
    fullscreenDocument.mozFullScreenElement ??
    fullscreenDocument.msFullscreenElement ??
    null
  );
}

async function requestFullscreenElement(element: HTMLElement) {
  const fullscreenElement = element as FullscreenCapableElement;

  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
      return true;
    }

    if (fullscreenElement.webkitRequestFullscreen) {
      await fullscreenElement.webkitRequestFullscreen();
      return true;
    }

    if (fullscreenElement.mozRequestFullScreen) {
      await fullscreenElement.mozRequestFullScreen();
      return true;
    }

    if (fullscreenElement.msRequestFullscreen) {
      await fullscreenElement.msRequestFullscreen();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function exitFullscreenElement() {
  const fullscreenDocument = document as FullscreenCapableDocument;

  try {
    if (document.exitFullscreen && document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (fullscreenDocument.webkitExitFullscreen && fullscreenDocument.webkitFullscreenElement) {
      await fullscreenDocument.webkitExitFullscreen();
      return;
    }

    if (fullscreenDocument.mozCancelFullScreen && fullscreenDocument.mozFullScreenElement) {
      await fullscreenDocument.mozCancelFullScreen();
      return;
    }

    if (fullscreenDocument.msExitFullscreen && fullscreenDocument.msFullscreenElement) {
      await fullscreenDocument.msExitFullscreen();
    }
  } catch {
    // The app-level fullscreen fallback is still closed by local state.
  }
}

async function lockLandscapeOrientation() {
  if (typeof screen === "undefined") {
    return false;
  }

  const orientation = screen.orientation as OrientationController | undefined;

  if (!orientation?.lock) {
    return false;
  }

  try {
    await orientation.lock("landscape");
    return true;
  } catch {
    return false;
  }
}

function unlockScreenOrientation() {
  if (typeof screen === "undefined") {
    return;
  }

  try {
    (screen.orientation as OrientationController | undefined)?.unlock?.();
  } catch {
    // Some mobile browsers expose unlock but reject outside native fullscreen.
  }
}

function isMobileViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
}

function isIOSMobileBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /\b(iPad|iPhone|iPod)\b/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function InstructionsPanel({
  steps,
  currentStep,
  isGeneratingTranscript,
  transcriptError,
  onStepClick,
}: {
  steps: string[];
  currentStep: number;
  isGeneratingTranscript?: boolean;
  transcriptError?: string | null;
  onStepClick: (step: number) => void;
}) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        {isGeneratingTranscript ? (
          <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-500" />
        ) : (
          <FileText className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isGeneratingTranscript
            ? "Generating transcript from video..."
            : "No transcript available for this lesson"}
        </p>
        {transcriptError && (
          <p className="mt-2 max-w-xs text-xs text-gray-400 dark:text-gray-500">
            {transcriptError}
          </p>
        )}
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

function getTranscriptTimeSeconds(index: number, totalSteps: number, duration: number) {
  if (index <= 0 || duration <= 0 || totalSteps <= 1) {
    return index === 0 ? 1 : 0;
  }

  return clamp((index / Math.max(1, totalSteps)) * duration, 1, duration);
}

function getFallbackTimelineItems(duration: number) {
  if (duration <= 0) {
    return [
      {
        timeSeconds: 0,
        label: "Timeline will appear after the video loads",
      },
    ];
  }

  const itemCount = duration >= 900 ? 5 : duration >= 300 ? 4 : 3;
  const labels = ["Start of video", "Early section", "Middle section", "Later section", "End of video"];

  return Array.from({ length: itemCount }, (_, index) => {
    const isLast = index === itemCount - 1;
    const timeSeconds = isLast ? duration : (duration / Math.max(1, itemCount - 1)) * index;

    return {
      timeSeconds,
      label: labels[index] ?? `Section ${index + 1}`,
    };
  });
}

function MobileTranscriptSheet({
  steps,
  currentStep,
  duration,
  title,
  staffName,
  thumbnailUrl,
  isGeneratingTranscript,
  transcriptError,
  searchValue,
  onSearchChange,
  onClose,
  onStepClick,
  onTimelineClick,
}: {
  steps: string[];
  currentStep: number;
  duration: number;
  title: string;
  staffName?: string;
  thumbnailUrl?: string | null;
  isGeneratingTranscript: boolean;
  transcriptError: string | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onStepClick: (step: number) => void;
  onTimelineClick: (seconds: number) => void;
}) {
  const transcriptSource = steps;
  const fallbackTimelineItems = getFallbackTimelineItems(duration);
  const normalizedSearch = searchValue.trim().toLowerCase();
  const transcriptItems = transcriptSource
    .map((step, index) => ({
      index,
      step,
      timeSeconds: getTranscriptTimeSeconds(index, transcriptSource.length, duration),
    }))
    .filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        item.step.toLowerCase().includes(normalizedSearch) ||
        formatTime(item.timeSeconds).includes(normalizedSearch)
      );
    });

  return (
    <div
      data-lms-video-controls
      className="lms-mobile-transcript-layer fixed inset-0 z-[70] flex items-end lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Transcript"
    >
      <div className="lms-mobile-transcript-sheet flex w-full flex-col overflow-hidden bg-white text-slate-950 shadow-2xl">
        <div className="flex justify-center px-4 pt-2">
          <div className="h-1 w-12 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-lg font-bold tracking-normal">Transcript</h2>
          <div className="flex items-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-950 transition active:scale-95"
              aria-label="Close transcript"
              title="Close transcript"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        <div className="lms-mobile-transcript-scroll flex-1 overflow-y-auto px-4 py-3">
          <label className="lms-mobile-transcript-search flex h-10 items-center gap-2 rounded-full px-3.5 text-slate-500">
            <Search className="h-4 w-4 flex-shrink-0" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search transcript"
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-700 outline-none placeholder:text-slate-500"
              aria-label="Search transcript"
            />
          </label>

          <div className="mt-3 flex min-w-0 items-center gap-3 rounded-xl bg-sky-100 p-2.5">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="h-12 w-16 flex-shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <MonitorPlay className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="lms-mobile-transcript-card-title text-sm font-bold leading-snug">
                {title}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
                {staffName ? `${staffName} • ${title}` : "Lesson video"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {transcriptItems.length > 0 ? (
              transcriptItems.map((item) => {
                const isActive = currentStep === item.index;

                return (
                  <button
                    key={`${item.index}-${item.step}`}
                    type="button"
                    onClick={() => onStepClick(item.index)}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-1 py-1 text-left transition-colors ${
                      isActive ? "bg-slate-50" : "active:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${
                        isActive
                          ? "bg-sky-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {formatTime(item.timeSeconds)}
                    </span>
                    <span
                      className={`min-w-0 flex-1 break-words text-sm font-semibold leading-snug ${
                        isActive ? "text-slate-950" : "text-slate-600"
                      }`}
                    >
                      {item.step}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                {isGeneratingTranscript ? (
                  <>
                    <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                    <p className="text-sm font-semibold text-slate-700">
                      Generating transcript from video...
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700">
                      No transcript available yet
                    </p>
                    {transcriptError && (
                      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                        {transcriptError}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {transcriptItems.length === 0 && !isGeneratingTranscript && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">Timeline</p>
                  <p className="text-xs font-semibold text-slate-400">Script unavailable</p>
                </div>
                <div className="space-y-2">
                  {fallbackTimelineItems.map((item) => (
                    <button
                      key={`${item.timeSeconds}-${item.label}`}
                      type="button"
                      onClick={() => onTimelineClick(item.timeSeconds)}
                      disabled={duration <= 0}
                      className="flex w-full items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-left transition active:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
                    >
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-blue-700">
                        {formatTime(item.timeSeconds)}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
  onProgressChange,
}: VideoPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [smoothCurrentTime, setSmoothCurrentTime] = useState(0);
  const [maxWatchedSeconds, setMaxWatchedSeconds] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasRequestedLandscapeFullscreen, setHasRequestedLandscapeFullscreen] = useState(false);
  const [isLandscapeFullscreen, setIsLandscapeFullscreen] = useState(false);
  const [isVideoDocked, setIsVideoDocked] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [warning, setWarning] = useState<string | null>(null);
  const [watermarkName, setWatermarkName] = useState(staffName ?? "Staff");
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [seekPreviewPercent, setSeekPreviewPercent] = useState<number | null>(null);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [generatedTranscript, setGeneratedTranscript] = useState<string | null>(null);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [showPlaybackSettings, setShowPlaybackSettings] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<SeekFeedbackState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerMountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smoothProgressFrameRef = useRef<number | null>(null);
  const lastSmoothProgressFrameAtRef = useRef(0);
  const areControlsVisibleRef = useRef(true);
  const resumeTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const maxWatchedRef = useRef(0);
  const durationRef = useRef(0);
  const isCompletedRef = useRef(initialCompleted);
  const playbackUnlockedRef = useRef(initialCompleted);
  const isScrubbingRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const pendingSeekUntilRef = useRef(0);
  const seekPreviewPercentRef = useRef<number | null>(null);
  const lastTouchInteractionRef = useRef(0);
  const pendingSurfaceTapRef = useRef<SurfaceTapState | null>(null);
  const surfaceTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onProgressChangeRef = useRef(onProgressChange);

  const effectiveInstructions = generatedTranscript ?? stepByStepInstructions;
  const instructionSteps = useMemo(
    () => parseInstructionSteps(effectiveInstructions),
    [effectiveInstructions]
  );

  useEffect(() => {
    setGeneratedTranscript(null);
    setIsGeneratingTranscript(false);
    setTranscriptError(null);
    setTranscriptSearch("");
  }, [lessonId, stepByStepInstructions]);

  const completionAllowed = isCompleted || watchPercentage >= completionThreshold;
  const playbackUnlocked = completionAllowed;
  const currentProgressPercent =
    videoDuration > 0 ? clamp((smoothCurrentTime / videoDuration) * 100, 0, 100) : 0;
  const progressPercent = seekPreviewPercent ?? currentProgressPercent;
  const displayTime =
    seekPreviewPercent !== null && videoDuration > 0
      ? (seekPreviewPercent / 100) * videoDuration
      : smoothCurrentTime;
  const maxSeekPercent =
    playbackUnlocked
      ? 100
      : videoDuration > 0
        ? clamp((Math.max(maxWatchedSeconds, smoothCurrentTime) / videoDuration) * 100, 0, 100)
        : 0;
  const watchedRailPercent = Math.max(maxSeekPercent, progressPercent);
  const durationLabel =
    videoDuration > 0
      ? formatTime(videoDuration)
      : durationMinutes
        ? `${durationMinutes} min`
        : "Loading";
  const playbackStatusLabel = playbackUnlocked
    ? "Replay: seek and speed unlocked"
    : "First watch: seek and speed protected";
  const shouldShowVideoControls = !isReady || areControlsVisible;
  const shouldShowCenterControls = isReady && !warning && areControlsVisible;
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

  const clearSmoothProgressFrame = useCallback(() => {
    if (smoothProgressFrameRef.current !== null) {
      window.cancelAnimationFrame(smoothProgressFrameRef.current);
      smoothProgressFrameRef.current = null;
    }
  }, []);

  const clearSurfaceTapTimeout = useCallback(() => {
    if (surfaceTapTimeoutRef.current) {
      clearTimeout(surfaceTapTimeoutRef.current);
      surfaceTapTimeoutRef.current = null;
    }
  }, []);

  const clearSeekFeedbackTimeout = useCallback(() => {
    if (seekFeedbackTimeoutRef.current) {
      clearTimeout(seekFeedbackTimeoutRef.current);
      seekFeedbackTimeoutRef.current = null;
    }
  }, []);

  const showSeekGestureFeedback = useCallback(
    (direction: SeekJumpDirection) => {
      clearSeekFeedbackTimeout();
      setSeekFeedback({ direction, key: Date.now() });

      seekFeedbackTimeoutRef.current = setTimeout(() => {
        setSeekFeedback(null);
        seekFeedbackTimeoutRef.current = null;
      }, SEEK_FEEDBACK_HIDE_DELAY_MS);
    },
    [clearSeekFeedbackTimeout]
  );

  const lockSeekDisplay = useCallback((seconds: number, duration: number) => {
    const safeSeekTime =
      duration > 0 ? clamp(seconds, 0, duration) : Math.max(0, seconds);

    pendingSeekTimeRef.current = safeSeekTime;
    pendingSeekUntilRef.current = performance.now() + SEEK_SETTLE_LOCK_MS;
  }, []);

  const getSeekHoldTime = useCallback((playerTime: number, duration: number) => {
    const pendingSeekTime = pendingSeekTimeRef.current;

    if (pendingSeekTime === null) {
      return null;
    }

    const safePendingTime =
      duration > 0 ? clamp(pendingSeekTime, 0, duration) : Math.max(0, pendingSeekTime);
    const hasPlayerCaughtUp =
      Math.abs(playerTime - safePendingTime) <= SEEK_SETTLE_TOLERANCE_SECONDS;
    const hasLockExpired = performance.now() >= pendingSeekUntilRef.current;

    if (hasPlayerCaughtUp || hasLockExpired) {
      pendingSeekTimeRef.current = null;
      pendingSeekUntilRef.current = 0;
      return null;
    }

    return safePendingTime;
  }, []);

  const getPendingSeekDisplayTime = useCallback((duration: number) => {
    const pendingSeekTime = pendingSeekTimeRef.current;

    if (pendingSeekTime === null || performance.now() >= pendingSeekUntilRef.current) {
      return null;
    }

    return duration > 0 ? clamp(pendingSeekTime, 0, duration) : Math.max(0, pendingSeekTime);
  }, []);

  const revealVideoControls = useCallback(() => {
    areControlsVisibleRef.current = true;
    setAreControlsVisible(true);
    clearControlsHideTimeout();

    if (isPlaying && isReady) {
      controlsHideTimeoutRef.current = setTimeout(() => {
        areControlsVisibleRef.current = false;
        setAreControlsVisible(false);
        controlsHideTimeoutRef.current = null;
      }, VIDEO_CONTROLS_HIDE_DELAY_MS);
    }
  }, [clearControlsHideTimeout, isPlaying, isReady]);

  const hideVideoControls = useCallback(() => {
    clearControlsHideTimeout();
    areControlsVisibleRef.current = false;
    setAreControlsVisible(false);
    setShowPlaybackSettings(false);
  }, [clearControlsHideTimeout]);

  const toggleVideoControls = useCallback(() => {
    if (!isReady) {
      revealVideoControls();
      return;
    }

    if (areControlsVisibleRef.current) {
      hideVideoControls();
      return;
    }

    revealVideoControls();
  }, [
    hideVideoControls,
    isReady,
    revealVideoControls,
  ]);

  const syncFullscreenVideoLayout = useCallback(() => {
    window.requestAnimationFrame(() => {
      const iframe = playerMountRef.current?.querySelector("iframe");

      if (iframe instanceof HTMLIFrameElement) {
        iframe.style.width = "100%";
        iframe.style.height = "100%";
      }

      revealVideoControls();
    });
  }, [revealVideoControls]);

  const restoreDockedVideo = useCallback(() => {
    setIsVideoDocked(false);
    revealVideoControls();

    window.requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, [revealVideoControls]);

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
    if (!isPlaying || !isReady) {
      clearSmoothProgressFrame();
      return;
    }

    const animateProgress = (timestamp: number) => {
      if (timestamp - lastSmoothProgressFrameAtRef.current >= SMOOTH_PROGRESS_FRAME_MS) {
        lastSmoothProgressFrameAtRef.current = timestamp;

        const player = playerRef.current;
        if (player && !isScrubbingRef.current) {
          const duration = player.getDuration() || durationRef.current;
          const nextCurrent = player.getCurrentTime();
          const heldSeekTime = getSeekHoldTime(nextCurrent, duration);

          if (heldSeekTime !== null) {
            setSmoothCurrentTime(heldSeekTime);
          } else {
            setSmoothCurrentTime(
              duration > 0 ? clamp(nextCurrent, 0, duration) : Math.max(0, nextCurrent)
            );
          }
        }
      }

      smoothProgressFrameRef.current = window.requestAnimationFrame(animateProgress);
    };

    lastSmoothProgressFrameAtRef.current = performance.now();
    smoothProgressFrameRef.current = window.requestAnimationFrame(animateProgress);

    return clearSmoothProgressFrame;
  }, [clearSmoothProgressFrame, getSeekHoldTime, isPlaying, isReady]);

  useEffect(() => {
    if (!isReady || warning) {
      clearControlsHideTimeout();
      areControlsVisibleRef.current = true;
      setAreControlsVisible(true);
      return;
    }

    revealVideoControls();
    return clearControlsHideTimeout;
  }, [clearControlsHideTimeout, isPlaying, isReady, revealVideoControls, warning]);

  useEffect(() => {
    document.documentElement.classList.toggle("lms-video-fullscreen-open", isFullscreen);
    document.body.classList.toggle("lms-video-fullscreen-open", isFullscreen);

    if (isFullscreen) {
      syncFullscreenVideoLayout();
    }

    return () => {
      document.documentElement.classList.remove("lms-video-fullscreen-open");
      document.body.classList.remove("lms-video-fullscreen-open");
    };
  }, [isFullscreen, syncFullscreenVideoLayout]);

  useEffect(() => {
    document.body.classList.toggle("lms-mobile-transcript-open", showInstructions);

    if (!showInstructions) {
      document.documentElement.style.removeProperty("--lms-mobile-transcript-top");
    }

    return () => {
      document.body.classList.remove("lms-mobile-transcript-open");
    };
  }, [showInstructions]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--lms-mobile-transcript-top");
    };
  }, []);

  useEffect(() => {
    return () => {
      clearSurfaceTapTimeout();
      clearSeekFeedbackTimeout();
    };
  }, [clearSeekFeedbackTimeout, clearSurfaceTapTimeout]);

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
      const heldSeekTime = getPendingSeekDisplayTime(safeDuration);
      const displayCurrent = heldSeekTime ?? safeCurrent;
      const nextPercentage =
        safeDuration > 0
          ? clamp(Number(((safeMax / safeDuration) * 100).toFixed(2)), 0, 100)
          : 0;
      const reachedVideoEnd =
        safeDuration > 0 &&
        safeMax >= Math.max(0, safeDuration - COMPLETE_END_TOLERANCE_SECONDS);
      const nextIsCompleted = Boolean(completion?.isCompleted ?? isCompletedRef.current);

      currentTimeRef.current = displayCurrent;
      maxWatchedRef.current = safeMax;
      durationRef.current = safeDuration;
      const nextCanComplete =
        nextIsCompleted || nextPercentage >= completionThreshold || reachedVideoEnd;
      if (nextIsCompleted) {
        isCompletedRef.current = true;
        setIsCompleted(true);
      }
      playbackUnlockedRef.current = nextCanComplete;

      setCurrentTime(displayCurrent);
      setSmoothCurrentTime(displayCurrent);
      setMaxWatchedSeconds(safeMax);
      setVideoDuration(safeDuration);
      setWatchPercentage(nextPercentage);

      onProgressChangeRef.current?.({
        watchPercentage: nextPercentage,
        canComplete: nextCanComplete,
        currentTimeSeconds: displayCurrent,
        maxWatchedSeconds: safeMax,
        isCompleted: nextIsCompleted,
        completedAt: completion?.completedAt ?? null,
      });
    },
    [completionThreshold, getPendingSeekDisplayTime]
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
    setShowInstructions(false);
    setIsVideoDocked(false);
    setTranscriptSearch("");
    pendingSeekTimeRef.current = null;
    pendingSeekUntilRef.current = 0;
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

              if (!isNowPlaying) {
                const nextCurrent = event.target.getCurrentTime();
                const duration = event.target.getDuration() || durationRef.current || 1;
                const heldSeekTime = getSeekHoldTime(nextCurrent, duration);

                if (heldSeekTime !== null) {
                  return;
                }

                updateWatchState(nextCurrent, Math.max(maxWatchedRef.current, nextCurrent), duration);
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
                  const heldSeekTime = getSeekHoldTime(nextCurrent, duration);

                  if (heldSeekTime !== null) {
                    return;
                  }

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
    getSeekHoldTime,
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

    const handleFullscreenChange = () => {
      const isNativeFullscreen = !!getActiveFullscreenElement();
      setIsFullscreen(isNativeFullscreen);

      if (!isNativeFullscreen) {
        setHasRequestedLandscapeFullscreen(false);
        setIsLandscapeFullscreen(false);
        unlockScreenOrientation();
      }

      syncFullscreenVideoLayout();
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        if (window.innerWidth > window.innerHeight) {
          setIsLandscapeFullscreen(false);
        }

        syncFullscreenVideoLayout();
      }, 100);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
      clearControlsHideTimeout();
      unlockScreenOrientation();
    };
  }, [clearControlsHideTimeout, saveProgress, showWarning, syncFullscreenVideoLayout]);

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

  const handlePreviousLesson = useCallback(() => {
    if (!canGoPrevious || !onPrevious) {
      return;
    }

    revealVideoControls();
    void saveProgress();
    onPrevious();
  }, [canGoPrevious, onPrevious, revealVideoControls, saveProgress]);

  const handleNextLesson = useCallback(() => {
    if (!canGoNext || !onNext) {
      return;
    }

    revealVideoControls();
    void saveProgress();
    onNext();
  }, [canGoNext, onNext, revealVideoControls, saveProgress]);

  const setSmoothTimeFromProgress = useCallback((requestedProgress: number) => {
    const safeDuration = durationRef.current;
    if (safeDuration <= 0) {
      setSmoothCurrentTime(0);
      return 0;
    }

    const requestedTime = (clamp(requestedProgress, 0, 100) / 100) * safeDuration;
    const safeTime = clamp(requestedTime, 0, safeDuration);
    setSmoothCurrentTime(safeTime);
    lastSmoothProgressFrameAtRef.current = performance.now();
    return safeTime;
  }, []);

  const commitSeek = useCallback(
    (requestedProgress: number) => {
      const safeDuration = durationRef.current;
      if (!playerRef.current || safeDuration <= 0) {
        seekPreviewPercentRef.current = null;
        setSeekPreviewPercent(null);
        return false;
      }

      const safeProgress = clamp(requestedProgress, 0, 100);
      const requestedTime = (safeProgress / 100) * safeDuration;
      const maxAllowedTime = maxWatchedRef.current + SEEK_GRACE_SECONDS;
      const isUnlockedForReplay =
        playbackUnlockedRef.current ||
        (safeDuration > 0 &&
          ((maxWatchedRef.current / safeDuration) * 100 >= completionThreshold ||
            maxWatchedRef.current >= Math.max(0, safeDuration - COMPLETE_END_TOLERANCE_SECONDS)));

      seekPreviewPercentRef.current = null;
      setSeekPreviewPercent(null);

      if (!isUnlockedForReplay && requestedTime > maxAllowedTime) {
        lockSeekDisplay(maxWatchedRef.current, safeDuration);
        setSmoothCurrentTime(maxWatchedRef.current);
        lastSmoothProgressFrameAtRef.current = performance.now();
        playerRef.current.seekTo(maxWatchedRef.current, true);
        updateWatchState(maxWatchedRef.current, maxWatchedRef.current, safeDuration);
        showWarning("Seeking forward is locked until you watch that part of the lesson.");
        return false;
      }

      lockSeekDisplay(requestedTime, safeDuration);
      setSmoothCurrentTime(requestedTime);
      lastSmoothProgressFrameAtRef.current = performance.now();
      playerRef.current.seekTo(requestedTime, true);
      updateWatchState(
        requestedTime,
        isUnlockedForReplay
          ? Math.max(maxWatchedRef.current, requestedTime)
          : maxWatchedRef.current,
        safeDuration
      );
      saveProgress();
      return true;
    },
    [completionThreshold, lockSeekDisplay, saveProgress, showWarning, updateWatchState]
  );

  const previewSeekProgress = useCallback(
    (requestedProgress: number) => {
      const safeProgress = clamp(requestedProgress, 0, 100);
      seekPreviewPercentRef.current = safeProgress;
      setSeekPreviewPercent(safeProgress);
      setSmoothTimeFromProgress(safeProgress);
      return safeProgress;
    },
    [setSmoothTimeFromProgress]
  );

  const getSeekProgressFromPointer = useCallback(
    (event: React.PointerEvent<HTMLInputElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      if (
        isLandscapeFullscreen &&
        !event.currentTarget.classList.contains("lms-video-landscape-progress-range")
      ) {
        return clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
      }

      return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    },
    [isLandscapeFullscreen]
  );

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const requestedProgress = previewSeekProgress(Number(event.target.value));

    if (!isScrubbingRef.current) {
      commitSeek(requestedProgress);
    }
  };

  const handleSeekStart = (event: React.PointerEvent<HTMLInputElement>) => {
    const requestedProgress = getSeekProgressFromPointer(event);

    if (requestedProgress === null) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    isScrubbingRef.current = true;
    previewSeekProgress(requestedProgress);
  };

  const handleSeekMove = (event: React.PointerEvent<HTMLInputElement>) => {
    if (!isScrubbingRef.current) {
      return;
    }

    const requestedProgress = getSeekProgressFromPointer(event);

    if (requestedProgress === null) {
      return;
    }

    event.preventDefault();
    previewSeekProgress(requestedProgress);
  };

  const handleSeekCommit = (event: React.PointerEvent<HTMLInputElement>) => {
    if (!isScrubbingRef.current) {
      return;
    }

    const requestedProgress =
      getSeekProgressFromPointer(event) ??
      seekPreviewPercentRef.current ??
      Number(event.currentTarget.value);

    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    isScrubbingRef.current = false;
    commitSeek(requestedProgress);
  };

  const jumpVideoBySeconds = useCallback(
    (direction: SeekJumpDirection) => {
      const player = playerRef.current;
      const duration = durationRef.current || player?.getDuration() || videoDuration;

      if (!isReady || !player || duration <= 0) {
        revealVideoControls();
        return;
      }

      const playerTime = player.getCurrentTime();
      const currentTime =
        getPendingSeekDisplayTime(duration) ??
        (Number.isFinite(playerTime) ? playerTime : currentTimeRef.current);
      const nextTime =
        direction === "forward"
          ? currentTime + SEEK_JUMP_SECONDS
          : currentTime - SEEK_JUMP_SECONDS;
      const didSeek = commitSeek((clamp(nextTime, 0, duration) / duration) * 100);

      revealVideoControls();

      if (didSeek) {
        showSeekGestureFeedback(direction);
      }
    },
    [
      commitSeek,
      getPendingSeekDisplayTime,
      isReady,
      revealVideoControls,
      showSeekGestureFeedback,
      videoDuration,
    ]
  );

  const handleVideoSurfaceTap = useCallback(
    (clientX: number, element: HTMLElement) => {
      if (isVideoDocked) {
        clearSurfaceTapTimeout();
        pendingSurfaceTapRef.current = null;
        restoreDockedVideo();
        return;
      }

      if (!isReady) {
        revealVideoControls();
        return;
      }

      const now = Date.now();
      const direction = getSeekGestureDirection(clientX, element);
      const pendingTap = pendingSurfaceTapRef.current;
      const isDoubleTap =
        pendingTap?.direction === direction &&
        now - pendingTap.time <= DOUBLE_TAP_WINDOW_MS;

      if (isDoubleTap) {
        clearSurfaceTapTimeout();
        pendingSurfaceTapRef.current = null;
        jumpVideoBySeconds(direction);
        return;
      }

      clearSurfaceTapTimeout();
      pendingSurfaceTapRef.current = { direction, time: now };
      surfaceTapTimeoutRef.current = setTimeout(() => {
        pendingSurfaceTapRef.current = null;
        toggleVideoControls();
        surfaceTapTimeoutRef.current = null;
      }, DOUBLE_TAP_WINDOW_MS);
    },
    [
      clearSurfaceTapTimeout,
      isReady,
      isVideoDocked,
      jumpVideoBySeconds,
      revealVideoControls,
      restoreDockedVideo,
      toggleVideoControls,
    ]
  );

  const handleVideoSurfaceClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (Date.now() - lastTouchInteractionRef.current < TOUCH_CLICK_SUPPRESS_MS) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      handleVideoSurfaceTap(event.clientX, event.currentTarget);
    },
    [handleVideoSurfaceTap]
  );

  const handleTouchGesture = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-lms-video-controls]")
      ) {
        return;
      }

      const touch = event.changedTouches[0] || event.touches[0];
      if (!touch) {
        return;
      }

      event.preventDefault();
      lastTouchInteractionRef.current = Date.now();
      handleVideoSurfaceTap(touch.clientX, event.currentTarget);
    },
    [handleVideoSurfaceTap]
  );

  const handleTranscriptTimelineClick = useCallback(
    (seconds: number) => {
      const duration = durationRef.current || videoDuration;

      revealVideoControls();

      if (duration <= 0) {
        return;
      }

      commitSeek((clamp(seconds, 0, duration) / duration) * 100);
    },
    [commitSeek, revealVideoControls, videoDuration]
  );

  const handleTranscriptStepClick = useCallback(
    (step: number) => {
      setCurrentStep(step);
      revealVideoControls();
    },
    [revealVideoControls]
  );

  const requestTranscriptGeneration = useCallback(async () => {
    if (instructionSteps.length > 0 || isGeneratingTranscript) {
      return;
    }

    setIsGeneratingTranscript(true);
    setTranscriptError(null);

    try {
      const response = await fetch(`/api/lms/transcript?lessonId=${lessonId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: "auto" }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; data?: { transcript?: string }; error?: string }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Unable to generate transcript");
      }

      const transcript = payload.data?.transcript?.trim();

      if (!transcript) {
        throw new Error("No transcript was returned for this video");
      }

      setGeneratedTranscript(transcript);
    } catch (error) {
      setTranscriptError(
        error instanceof Error
          ? error.message
          : "Unable to generate transcript from this video"
      );
    } finally {
      setIsGeneratingTranscript(false);
    }
  }, [instructionSteps.length, isGeneratingTranscript, lessonId]);

  const openTranscriptSheet = useCallback(() => {
    revealVideoControls();
    void requestTranscriptGeneration();

    if (isMobileViewport()) {
      containerRef.current?.scrollIntoView({
        block: "start",
        behavior: "auto",
      });

      window.requestAnimationFrame(() => {
        const videoStage = containerRef.current?.querySelector<HTMLElement>(".lms-video-stage");
        const videoBottom = videoStage?.getBoundingClientRect().bottom;
        const sheetTop = clamp(
          videoBottom ?? window.innerHeight * 0.35,
          window.innerHeight * 0.22,
          window.innerHeight * 0.45
        );

        document.documentElement.style.setProperty(
          "--lms-mobile-transcript-top",
          `${sheetTop}px`
        );
        setShowInstructions(true);
      });
      return;
    }

    setShowInstructions(true);
  }, [requestTranscriptGeneration, revealVideoControls]);

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
    const safeDuration = durationRef.current;
    playerRef.current?.seekTo(0, true);
    playerRef.current?.playVideo();
    setSmoothCurrentTime(0);
    lastSmoothProgressFrameAtRef.current = performance.now();
    updateWatchState(0, maxWatchedRef.current, safeDuration);
  };

  const toggleFullscreen = useCallback(async () => {
    revealVideoControls();
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      setIsFullscreen(true);
      setHasRequestedLandscapeFullscreen(false);
      setIsLandscapeFullscreen(false);
      await requestFullscreenElement(container);
      syncFullscreenVideoLayout();
      return;
    }

    if (isMobileViewport() && !hasRequestedLandscapeFullscreen) {
      setHasRequestedLandscapeFullscreen(true);
      const isPortraitViewport = window.innerHeight > window.innerWidth;
      const didLockLandscape = isIOSMobileBrowser() ? false : await lockLandscapeOrientation();
      setIsLandscapeFullscreen(!didLockLandscape && isPortraitViewport);
      syncFullscreenVideoLayout();
      return;
    }

    if (getActiveFullscreenElement()) {
      await exitFullscreenElement();
    }

    unlockScreenOrientation();
    setHasRequestedLandscapeFullscreen(false);
    setIsLandscapeFullscreen(false);
    setIsFullscreen(false);
  }, [
    hasRequestedLandscapeFullscreen,
    isFullscreen,
    revealVideoControls,
    syncFullscreenVideoLayout,
  ]);

  const handleVideoDropdown = useCallback(async () => {
    if (isVideoDocked) {
      restoreDockedVideo();
      return;
    }

    revealVideoControls();
    setShowPlaybackSettings(false);
    setShowInstructions(false);
    void saveProgress();

    if (getActiveFullscreenElement()) {
      await exitFullscreenElement();
    }

    unlockScreenOrientation();
    setHasRequestedLandscapeFullscreen(false);
    setIsLandscapeFullscreen(false);
    setIsFullscreen(false);
    setIsVideoDocked(true);
  }, [isVideoDocked, restoreDockedVideo, revealVideoControls, saveProgress]);

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
      <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800 sm:p-2"
              aria-label="Back to course"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400 sm:h-6 sm:w-6" />
            </button>

            <div className="min-w-0">
              <h1 className="break-words text-base font-bold leading-snug text-gray-900 dark:text-white sm:text-2xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                  {description}
                </p>
              )}
            </div>
          </div>

          {isCompleted ? (
            <div className="inline-flex items-center gap-1.5 self-start rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 sm:self-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-base">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div
              ref={containerRef}
              className={`${isFullscreen ? "lms-video-fullscreen-shell" : ""} ${
                isVideoDocked ? "lms-video-docked-shell" : ""
              }`.trim()}
            >
              <GlassCard
                className={`overflow-hidden rounded-2xl p-0 ${
                  isFullscreen ? "lms-video-fullscreen-card" : ""
                } ${isVideoDocked ? "lms-video-docked-card" : ""}`}
              >
                <div
                  className={`lms-video-stage relative bg-black ${
                    shouldShowVideoControls ? "" : "cursor-none"
                  } ${
                    isFullscreen
                      ? `lms-video-stage-fullscreen ${
                          isLandscapeFullscreen ? "lms-video-stage-fullscreen-landscape" : ""
                        }`
                      : "aspect-video"
                  } ${isVideoDocked ? "lms-video-stage-docked" : ""}`}
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
                      <div
                        ref={playerMountRef}
                        className="lms-youtube-mount absolute inset-0 h-full w-full"
                      />

                      <button
                        type="button"
                        onClick={handleVideoSurfaceClick}
                        aria-disabled={!isReady}
                        className="absolute inset-0 z-10 cursor-pointer bg-transparent"
                        aria-label={
                          areControlsVisible
                            ? "Hide video controls. Double-tap left or right to skip 15 seconds."
                            : "Show video controls. Double-tap left or right to skip 15 seconds."
                        }
                      />

                      <div
                        data-lms-video-controls
                        className={`lms-video-top-controls pointer-events-none absolute left-0 right-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/65 via-black/20 to-transparent transition-all duration-300 ${
                          shouldShowVideoControls
                            ? "translate-y-0 opacity-100"
                            : "pointer-events-none -translate-y-3 opacity-0"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={handleVideoDropdown}
                          className="lms-video-top-button lms-video-top-ghost-button pointer-events-auto inline-flex items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95"
                          aria-label={isVideoDocked ? "Restore video" : "Minimize video"}
                          title={isVideoDocked ? "Restore video" : "Minimize video"}
                        >
                          <ChevronDown
                            className={`lms-video-top-icon stroke-[3] ${
                              isVideoDocked ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <div className="lms-video-top-action-row pointer-events-auto flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              revealVideoControls();
                              showWarning("Casting is not available in this secure player.");
                            }}
                            className="lms-video-top-button lms-video-top-ghost-button inline-flex items-center justify-center rounded-xl text-white transition hover:scale-105 active:scale-95"
                            aria-label="Cast"
                            title="Cast"
                          >
                            <Cast className="lms-video-top-icon stroke-[2.7]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              revealVideoControls();
                              showWarning("Captions are controlled by the YouTube lesson video.");
                            }}
                            className="lms-video-top-button lms-video-cc-button inline-flex items-center justify-center rounded-xl bg-white text-slate-950 shadow-2xl transition hover:scale-105 active:scale-95"
                            aria-label="Captions"
                            title="Captions"
                          >
                            <Captions className="lms-video-top-icon stroke-[2.7]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              revealVideoControls();
                              setShowPlaybackSettings((value) => !value);
                            }}
                            className="lms-video-top-button lms-video-top-ghost-button inline-flex items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95"
                            aria-label="Playback settings"
                            title="Playback settings"
                          >
                            <Settings className="lms-video-top-icon stroke-[2.5]" />
                          </button>
                        </div>
                      </div>

                      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                        <div className="lms-video-watermark absolute top-8 rounded-md bg-black/30 px-3 py-1 text-xs font-semibold text-white/70 shadow-sm">
                          {watermarkName} • {new Date().toLocaleDateString()}
                        </div>
                      </div>

                      {seekFeedback && (
                        <div
                          key={seekFeedback.key}
                          aria-hidden="true"
                          className={`lms-video-seek-feedback pointer-events-none absolute z-30 flex items-center justify-center text-white ${
                            seekFeedback.direction === "backward"
                              ? "lms-video-seek-feedback-left"
                              : "lms-video-seek-feedback-right"
                          }`}
                        >
                          <div className="lms-video-seek-feedback-badge flex flex-col items-center justify-center">
                            {seekFeedback.direction === "backward" ? (
                              <SkipBack className="lms-video-seek-feedback-icon fill-current" />
                            ) : (
                              <SkipForward className="lms-video-seek-feedback-icon fill-current" />
                            )}
                            <span className="lms-video-seek-feedback-text">
                              {SEEK_JUMP_SECONDS}s
                            </span>
                          </div>
                        </div>
                      )}

                      {warning && (
                        <div className="absolute left-4 right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/90 px-4 py-3 text-sm font-medium text-white shadow-lg">
                          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                          <span>{warning}</span>
                        </div>
                      )}

                      {showPlaybackSettings && shouldShowVideoControls && (
                        <div
                          data-lms-video-controls
                          className="lms-video-settings-panel absolute z-50 w-48 rounded-2xl bg-slate-950/80 p-3 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              restartVideo();
                              setShowPlaybackSettings(false);
                            }}
                            disabled={!isReady}
                            className="mb-2 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                          >
                            <RotateCcw className="h-5 w-5" />
                            Restart
                          </button>

                          <select
                            value={playbackRate}
                            onChange={handlePlaybackRateChange}
                            disabled={!isReady}
                            className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white outline-none transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
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
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 z-20 bg-black/20 transition-opacity duration-300 ${
                          shouldShowCenterControls ? "opacity-100" : "opacity-0"
                        }`}
                      />

                      <div
                        data-lms-video-controls
                        className={`lms-video-center-layer pointer-events-none absolute left-0 right-0 z-40 flex items-center justify-center transition-all duration-300 ${
                          shouldShowCenterControls
                            ? "scale-100 opacity-100"
                            : "scale-95 opacity-0"
                        }`}
                      >
                        <div className="lms-video-center-controls pointer-events-auto flex items-center">
                          <button
                            type="button"
                            onClick={handlePreviousLesson}
                            disabled={!canGoPrevious || !onPrevious}
                            className="lms-video-side-media-button lms-video-media-button-surface inline-flex items-center justify-center rounded-full text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Previous lesson"
                            title="Previous lesson"
                          >
                            <SkipBack className="lms-video-side-media-icon fill-current" />
                          </button>

                          <button
                            type="button"
                            onClick={togglePlay}
                            disabled={!isReady}
                            className="lms-video-main-media-button lms-video-media-button-surface inline-flex items-center justify-center rounded-full text-white transition hover:scale-105 disabled:cursor-wait disabled:opacity-60"
                            aria-label={isPlaying ? "Pause video" : "Play video"}
                            title={isPlaying ? "Pause video" : "Play video"}
                          >
                            {isPlaying ? (
                              <Pause className="lms-video-main-media-icon fill-current" />
                            ) : (
                              <Play className="lms-video-main-media-icon lms-video-play-icon fill-current" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleNextLesson}
                            disabled={!canGoNext || !onNext}
                            className="lms-video-side-media-button lms-video-media-button-surface inline-flex items-center justify-center rounded-full text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Next lesson"
                            title="Next lesson"
                          >
                            <SkipForward className="lms-video-side-media-icon fill-current" />
                          </button>
                        </div>
                      </div>

                      <div
                        data-lms-video-controls
                        className={`lms-video-bottom-controls lms-video-bottom-overlay pointer-events-none absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
                          shouldShowVideoControls
                            ? "lms-video-controls-visible bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                            : "lms-video-controls-hidden"
                        }`}
                      >
                        <div
                          className={`lms-video-bottom-row pointer-events-auto flex items-end justify-between transition-all duration-300 ${
                            shouldShowVideoControls
                              ? "translate-y-0 opacity-100"
                              : "pointer-events-none translate-y-3 opacity-0"
                          }`}
                        >
                          <div className="lms-video-bottom-pill-group flex min-w-0 items-center">
                            <span className="lms-video-time-pill lms-video-bottom-control-surface inline-flex items-center rounded-full font-extrabold leading-none tracking-normal text-white">
                              {formatTime(displayTime)} / {formatTime(videoDuration)}
                            </span>

                            <button
                              type="button"
                              onClick={openTranscriptSheet}
                              className="lms-video-context-pill lms-video-bottom-control-surface inline-flex min-w-0 items-center rounded-full font-extrabold leading-none text-white transition hover:scale-[1.02] active:scale-95"
                              aria-label={
                                showInstructions ? "Hide in this video" : "Show in this video"
                              }
                              title={
                                showInstructions ? "Hide in this video" : "Show in this video"
                              }
                            >
                              <span className="truncate">In this video</span>
                              <ChevronRight className="lms-video-context-chevron flex-shrink-0" />
                            </button>

                            <span className="lms-video-bottom-title truncate font-bold text-white">
                              {title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="lms-video-fullscreen-button lms-video-media-button-surface inline-flex flex-shrink-0 items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95"
                            aria-label={
                              isFullscreen
                                ? hasRequestedLandscapeFullscreen
                                  ? "Exit fullscreen"
                                  : "Rotate fullscreen to landscape"
                                : "Enter fullscreen"
                            }
                            title={
                              isFullscreen
                                ? hasRequestedLandscapeFullscreen
                                  ? "Exit fullscreen"
                                  : "Rotate fullscreen to landscape"
                                : "Enter fullscreen"
                            }
                          >
                            <Maximize2 className="lms-video-fullscreen-icon" />
                          </button>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={progressPercent}
                          onChange={handleSeekChange}
                          onPointerDown={handleSeekStart}
                          onPointerMove={handleSeekMove}
                          onPointerUp={handleSeekCommit}
                          onPointerCancel={handleSeekCommit}
                          disabled={!isReady}
                          className="lms-video-progress-range lms-video-progress-range-edge pointer-events-auto absolute bottom-0 left-0 right-0 h-8 w-full cursor-pointer appearance-none rounded-none bg-transparent disabled:cursor-wait"
                          style={{
                            background: `linear-gradient(to right, rgb(255 0 51) 0%, rgb(255 0 51) ${progressPercent}%, rgba(255,255,255,0.85) ${progressPercent}%, rgba(255,255,255,0.85) ${watchedRailPercent}%, rgba(255,255,255,0.5) ${watchedRailPercent}%, rgba(255,255,255,0.5) 100%)`,
                          }}
                          aria-label="Video progress"
                        />
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

                <div className="lms-video-card-footer flex flex-col gap-2 border-t border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{durationLabel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{playbackStatusLabel}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (showInstructions) {
                        setShowInstructions(false);
                        return;
                      }

                      openTranscriptSheet();
                    }}
                    className={`self-start rounded-lg p-1.5 transition-colors sm:self-auto sm:p-2 ${
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
            <aside className="hidden lg:col-span-1 lg:block">
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
                    isGeneratingTranscript={isGeneratingTranscript}
                    transcriptError={transcriptError}
                    onStepClick={handleTranscriptStepClick}
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
        </div>

        {showInstructions && (
          <MobileTranscriptSheet
            steps={instructionSteps}
            currentStep={currentStep}
            duration={videoDuration}
            title={title}
            staffName={staffName}
            thumbnailUrl={thumbnailUrl}
            isGeneratingTranscript={isGeneratingTranscript}
            transcriptError={transcriptError}
            searchValue={transcriptSearch}
            onSearchChange={setTranscriptSearch}
            onClose={() => setShowInstructions(false)}
            onStepClick={handleTranscriptStepClick}
            onTimelineClick={handleTranscriptTimelineClick}
          />
        )}

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
