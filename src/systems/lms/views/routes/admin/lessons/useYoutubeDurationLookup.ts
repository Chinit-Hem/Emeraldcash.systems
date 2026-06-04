"use client";

import { useEffect, useState } from "react";

import { extractYoutubeVideoId } from "@/systems/lms/types/lms-schema";

import {
  DURATION_IDLE_MESSAGE,
  type DurationLookupResponse,
  type DurationLookupState,
} from "./lesson-admin-utils";

interface UseYoutubeDurationLookupOptions {
  enabled: boolean;
  youtubeUrl: string;
  onDurationCleared: () => void;
  onDurationDetected: (durationMinutes: number, youtubeUrl: string) => void;
}

export function useYoutubeDurationLookup({
  enabled,
  youtubeUrl,
  onDurationCleared,
  onDurationDetected,
}: UseYoutubeDurationLookupOptions) {
  const [durationLookup, setDurationLookup] = useState<DurationLookupState>({
    status: "idle",
    message: DURATION_IDLE_MESSAGE,
  });

  useEffect(() => {
    if (!enabled) {
      setDurationLookup({
        status: "idle",
        message: DURATION_IDLE_MESSAGE,
      });
      return;
    }

    const url = youtubeUrl.trim();
    const videoId = extractYoutubeVideoId(url);

    if (!url) {
      setDurationLookup({
        status: "idle",
        message: DURATION_IDLE_MESSAGE,
      });
      onDurationCleared();
      return;
    }

    if (!videoId) {
      setDurationLookup({
        status: "error",
        message: "Enter a valid YouTube URL to detect duration.",
      });
      onDurationCleared();
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
          throw new Error(
            payload?.error ?? "Could not read this video's duration."
          );
        }

        const durationMinutes = payload.data?.durationMinutes;
        const durationLabel = payload.data?.durationLabel;

        if (!durationMinutes || durationMinutes < 1) {
          throw new Error("Could not read this video's duration.");
        }

        if (cancelled) {
          return;
        }

        onDurationDetected(durationMinutes, url);
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
  }, [enabled, onDurationCleared, onDurationDetected, youtubeUrl]);

  return durationLookup;
}
