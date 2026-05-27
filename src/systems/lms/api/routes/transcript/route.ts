/**
 * LMS transcript generation route.
 *
 * Generates lesson transcript text from available YouTube caption tracks and
 * saves it to step-by-step instructions so future views are instant.
 */

import { canAccessLMS, getSession } from "@/lib/auth-helpers";
import { lmsService } from "@/systems/lms/services/LmsService";
import {
  attachAllowedRolesToLessons,
  canRoleAccessLesson,
  normalizeLessonAudienceRoles,
} from "@/systems/lms/services/lms-lesson-access";
import type { LmsLesson } from "@/systems/lms/types/lms-schema";
import { extractYoutubeVideoId } from "@/systems/lms/types/lms-schema";
import { invalidateCategoryCache } from "@/systems/lms/utils/lms-cache";
import type { Role } from "@/shared/types/types";
import { NextRequest, NextResponse } from "next/server";

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  isTranslatable?: boolean;
  name?: {
    simpleText?: string;
    runs?: { text: string }[];
  };
};

type LessonEntityLike = {
  id: string | number;
  categoryId: number;
  title: string;
  description: string | null;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl?: string | null;
  thumbnailCloudinaryPublicId?: string | null;
  stepByStepInstructions: string | null;
  durationMinutes: number | null;
  orderIndex: number;
  isActive: boolean;
  allowedRoles?: string[];
  allowed_roles?: string[];
  createdAt?: string;
  updatedAt?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function toLegacyLesson(lesson: LessonEntityLike): LmsLesson {
  return {
    id: Number(lesson.id),
    category_id: lesson.categoryId,
    title: lesson.title,
    description: lesson.description,
    youtube_url: lesson.youtubeUrl,
    youtube_video_id: lesson.youtubeVideoId,
    thumbnail_url: lesson.thumbnailUrl ?? null,
    thumbnail_cloudinary_public_id: lesson.thumbnailCloudinaryPublicId ?? null,
    step_by_step_instructions: lesson.stepByStepInstructions,
    duration_minutes: lesson.durationMinutes,
    order_index: lesson.orderIndex,
    is_active: lesson.isActive,
    allowed_roles: normalizeLessonAudienceRoles(
      lesson.allowedRoles ?? lesson.allowed_roles
    ),
    created_at: lesson.createdAt ?? "",
    updated_at: lesson.updatedAt ?? "",
  };
}

async function canViewLesson(lesson: LessonEntityLike, role: Role) {
  if (role === "Admin") {
    return true;
  }

  const [lessonWithRoles] = await attachAllowedRolesToLessons([
    toLegacyLesson(lesson),
  ]);

  return canRoleAccessLesson(role, lessonWithRoles?.allowed_roles);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    );
}

function extractCaptionTracks(html: string): CaptionTrack[] {
  const match = html.match(
    /"captionTracks":(\[[\s\S]*?\])(?=,"audioTracks"|,"translationLanguages"|,"defaultAudioTrackIndex"|})/
  );

  if (!match?.[1]) {
    return [];
  }

  try {
    return JSON.parse(match[1]) as CaptionTrack[];
  } catch {
    try {
      return JSON.parse(
        match[1].replace(/\\"/g, '"').replace(/\\u0026/g, "&")
      ) as CaptionTrack[];
    } catch {
      return [];
    }
  }
}

function getTrackName(track: CaptionTrack) {
  return (
    track.name?.simpleText ??
    track.name?.runs?.map((run) => run.text).join("") ??
    track.languageCode ??
    "captions"
  );
}

function selectCaptionTrack(tracks: CaptionTrack[], requestedLanguage: string) {
  return (
    (requestedLanguage !== "auto"
      ? tracks.find((track) => track.languageCode === requestedLanguage)
      : null) ??
    tracks.find((track) => track.languageCode === "en") ??
    tracks.find((track) => track.languageCode === "km") ??
    tracks.find((track) => track.kind !== "asr") ??
    tracks[0] ??
    null
  );
}

function normalizeTranscriptLines(rawLines: string[]) {
  const lines: string[] = [];
  let buffer = "";

  for (const rawLine of rawLines) {
    const text = rawLine.replace(/\s+/g, " ").trim();

    if (!text) {
      continue;
    }

    const next = buffer ? `${buffer} ${text}` : text;
    const endsSentence = /[.!?។៕]$/.test(text);

    if (next.length >= 130 || endsSentence) {
      lines.push(next);
      buffer = "";
    } else {
      buffer = next;
    }
  }

  if (buffer) {
    lines.push(buffer);
  }

  return lines.join("\n");
}

function getCaptionUrl(track: CaptionTrack, requestedLanguage: string) {
  const url = new URL(track.baseUrl);

  if (
    requestedLanguage !== "auto" &&
    track.languageCode !== requestedLanguage &&
    track.isTranslatable
  ) {
    url.searchParams.set("tlang", requestedLanguage);
  }

  return url;
}

function parseJsonCaptionText(text: string) {
  try {
    const payload = JSON.parse(text) as {
      events?: { segs?: { utf8?: string }[] }[];
    };

    const rawLines =
      payload.events
        ?.map((event) =>
          event.segs
            ?.map((segment) => segment.utf8 ?? "")
            .join("")
            .replace(/\n/g, " ")
            .trim()
        )
        .filter((line): line is string => Boolean(line)) ?? [];

    return normalizeTranscriptLines(rawLines);
  } catch {
    return "";
  }
}

function parseXmlCaptionText(text: string) {
  const rawLines = Array.from(text.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g))
    .map((match) => decodeHtmlEntities(match[1] ?? "").replace(/<[^>]+>/g, " "))
    .filter((line) => Boolean(line.trim()));

  return normalizeTranscriptLines(rawLines);
}

async function fetchCaptionUrlText(url: URL) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    return "";
  }

  return response.text();
}

async function fetchCaptionText(track: CaptionTrack, requestedLanguage: string) {
  const jsonUrl = getCaptionUrl(track, requestedLanguage);
  jsonUrl.searchParams.set("fmt", "json3");
  const jsonText = await fetchCaptionUrlText(jsonUrl);
  const jsonTranscript =
    parseJsonCaptionText(jsonText) || parseXmlCaptionText(jsonText);

  if (jsonTranscript) {
    return jsonTranscript;
  }

  const xmlUrl = getCaptionUrl(track, requestedLanguage);
  const xmlText = await fetchCaptionUrlText(xmlUrl);
  const xmlTranscript = parseXmlCaptionText(xmlText);

  if (!xmlTranscript) {
    throw new Error("YouTube did not return transcript text for this video");
  }

  return xmlTranscript;
}

async function generateYoutubeTranscript(videoId: string, language: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(
    videoId
  )}&hl=en`;
  const watchResponse = await fetch(watchUrl, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!watchResponse.ok) {
    throw new Error("Unable to load video metadata");
  }

  const html = await watchResponse.text();
  const tracks = extractCaptionTracks(html);
  const track = selectCaptionTrack(tracks, language);

  if (!track) {
    throw new Error("This video does not have captions available yet");
  }

  const transcript = await fetchCaptionText(track, language);

  if (!transcript.trim()) {
    throw new Error("Captions were found, but the transcript is empty");
  }

  return {
    transcript,
    language: track.languageCode ?? language,
    sourceName: getTrackName(track),
  };
}

async function handleTranscriptRequest(request: NextRequest) {
  const session = getSession(request);

  if (!session) {
    return jsonError("Unauthorized - Please log in", 401);
  }

  if (!canAccessLMS(session)) {
    return jsonError("Access denied - LMS access required", 403);
  }

  const { searchParams } = new URL(request.url);
  const lessonId = Number(searchParams.get("lessonId"));
  const body =
    request.method === "POST"
      ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
      : {};
  const requestedLanguage =
    typeof body.language === "string" && body.language.trim()
      ? body.language.trim()
      : "auto";

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return jsonError("Valid lessonId is required", 400);
  }

  const result = await lmsService.getLessonById(lessonId);

  if (!result.success || !result.data) {
    return jsonError(result.error ?? "Lesson not found", 404);
  }

  const lesson = result.data as LessonEntityLike;
  const visible = await canViewLesson(lesson, session.role);

  if (!visible) {
    return jsonError("Lesson not found", 404);
  }

  if (lesson.stepByStepInstructions?.trim()) {
    return NextResponse.json({
      success: true,
      data: {
        transcript: lesson.stepByStepInstructions,
        source: "saved",
      },
    });
  }

  const videoId =
    lesson.youtubeVideoId || extractYoutubeVideoId(lesson.youtubeUrl ?? "");

  if (!videoId) {
    return jsonError("This lesson does not have a supported video URL", 400);
  }

  try {
    const generated = await generateYoutubeTranscript(videoId, requestedLanguage);
    const updateResult = await lmsService.updateLesson(lessonId, {
      stepByStepInstructions: generated.transcript,
    });

    if (!updateResult.success) {
      return jsonError(updateResult.error ?? "Unable to save transcript", 500);
    }

    await invalidateCategoryCache(lesson.categoryId);

    return NextResponse.json({
      success: true,
      data: {
        transcript: generated.transcript,
        source: "youtube-captions",
        language: generated.language,
        sourceName: decodeHtmlEntities(generated.sourceName),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate transcript from this video";

    return NextResponse.json({ success: false, error: message });
  }
}

export async function GET(request: NextRequest) {
  return handleTranscriptRequest(request);
}

export async function POST(request: NextRequest) {
  return handleTranscriptRequest(request);
}
