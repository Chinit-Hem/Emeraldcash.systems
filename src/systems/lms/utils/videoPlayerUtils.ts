export type VideoProgressSnapshot = {
  watchPercentage: number;
  canComplete: boolean;
  currentTimeSeconds: number;
  maxWatchedSeconds: number;
  isCompleted: boolean;
  completedAt: string | null;
};

export interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  destroy: () => void;
}

export interface YouTubePlayerEvent {
  data: number;
  target: YouTubePlayer;
}

export interface YouTubeNamespace {
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

export type ProgressResponse = {
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
export const PROGRESS_SAVE_INTERVAL_MS = 10_000;
export const PROGRESS_POLL_INTERVAL_MS = 1_000;
export const SMOOTH_PROGRESS_FRAME_MS = 90;
export const VIDEO_CONTROLS_HIDE_DELAY_MS = 2_200;
export const TOUCH_CLICK_SUPPRESS_MS = 600;
export const DOUBLE_TAP_WINDOW_MS = 320;
export const SEEK_JUMP_SECONDS = 15;
export const SEEK_FEEDBACK_HIDE_DELAY_MS = 700;
export const SEEK_SETTLE_LOCK_MS = 8_000;
export const SEEK_SETTLE_TOLERANCE_SECONDS = 0.75;
export const MAX_PLAYBACK_RATE = 1.25;
export const SEEK_GRACE_SECONDS = 2;
export const COMPLETE_END_TOLERANCE_SECONDS = 5;
export const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2];

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

export type SeekJumpDirection = "backward" | "forward";

export type SurfaceTapState = {
  direction: SeekJumpDirection;
  time: number;
};

export type SeekFeedbackState = {
  direction: SeekJumpDirection;
  key: number;
};

export function loadYouTubeIframeApi() {
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

export function parseInstructionSteps(instructions: string | null) {
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

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getSeekGestureDirection(clientX: number, element: HTMLElement): SeekJumpDirection {
  const rect = element.getBoundingClientRect();
  const midpoint = rect.left + rect.width / 2;

  return clientX < midpoint ? "backward" : "forward";
}

export function getActiveFullscreenElement() {
  const fullscreenDocument = document as FullscreenCapableDocument;

  return (
    document.fullscreenElement ??
    fullscreenDocument.webkitFullscreenElement ??
    fullscreenDocument.mozFullScreenElement ??
    fullscreenDocument.msFullscreenElement ??
    null
  );
}

export async function requestFullscreenElement(element: HTMLElement) {
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

export async function exitFullscreenElement() {
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

export async function lockLandscapeOrientation() {
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

export function unlockScreenOrientation() {
  if (typeof screen === "undefined") {
    return;
  }

  try {
    (screen.orientation as OrientationController | undefined)?.unlock?.();
  } catch {
    // Some mobile browsers expose unlock but reject outside native fullscreen.
  }
}

export function isMobileViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
}

export function isIOSMobileBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /\b(iPad|iPhone|iPod)\b/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
