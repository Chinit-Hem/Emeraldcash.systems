/**
 * YouTube duration lookup for LMS admin lesson forms.
 *
 * Reads public watch-page metadata and returns exact video seconds plus rounded
 * minutes for the existing duration_minutes field.
 */

import { canManageLMS, getSession } from "@/lib/auth-helpers";
import { extractYoutubeVideoId } from "@/systems/lms/types/lms-schema";
import { NextRequest, NextResponse } from "next/server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function formatVideoDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = String(safeSeconds % 60).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${remainingSeconds}`;
  }

  return `${minutes}:${remainingSeconds}`;
}

function durationSecondsToMinutes(seconds: number) {
  return Math.max(1, Math.ceil(seconds / 60));
}

function extractLengthSeconds(html: string) {
  const patterns = [
    /"lengthSeconds":"(\d+)"/,
    /\\"lengthSeconds\\":\\"(\d+)\\"/,
    /"approxDurationMs":"(\d+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const value = Number(match[1]);

    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    return pattern.source.includes("approxDurationMs")
      ? Math.round(value / 1000)
      : value;
  }

  return null;
}

async function lookupYouTubeDuration(videoId: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(
    videoId
  )}&hl=en`;
  const response = await fetch(watchUrl, {
    cache: "no-store",
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error("Could not load YouTube metadata");
  }

  const html = await response.text();
  const seconds = extractLengthSeconds(html);

  if (!seconds) {
    throw new Error("Could not read this video's duration");
  }

  return seconds;
}

async function handleDurationRequest(request: NextRequest) {
  const session = getSession(request);

  if (!session) {
    return jsonError("Unauthorized - Please log in", 401);
  }

  if (!canManageLMS(session)) {
    return jsonError("Admin access required", 403);
  }

  const { searchParams } = new URL(request.url);
  const body =
    request.method === "POST"
      ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
      : {};
  const rawUrl = body.youtubeUrl ?? body.youtube_url ?? searchParams.get("url");
  const rawVideoId = body.videoId ?? body.video_id ?? searchParams.get("videoId");
  const videoId =
    typeof rawVideoId === "string" && rawVideoId.trim()
      ? rawVideoId.trim()
      : typeof rawUrl === "string"
        ? extractYoutubeVideoId(rawUrl)
        : null;

  if (!videoId) {
    return jsonError("Valid YouTube URL is required", 400);
  }

  try {
    const durationSeconds = await lookupYouTubeDuration(videoId);

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        durationSeconds,
        durationMinutes: durationSecondsToMinutes(durationSeconds),
        durationLabel: formatVideoDuration(durationSeconds),
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not read YouTube duration",
      422
    );
  }
}

export async function GET(request: NextRequest) {
  return handleDurationRequest(request);
}

export async function POST(request: NextRequest) {
  return handleDurationRequest(request);
}
