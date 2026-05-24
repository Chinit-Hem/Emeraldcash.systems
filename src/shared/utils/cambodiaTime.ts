export const CAMBODIA_TIMEZONE = "Asia/Phnom_Penh";
export const CAMBODIA_UTC_OFFSET_MINUTES = 7 * 60;

const DEFAULT_CAMBODIA_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: CAMBODIA_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
};

function formatDateParts(parts: Intl.DateTimeFormatPart[]) {
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    map[part.type] = part.value;
  }

  const year = map.year;
  const month = map.month;
  const day = map.day;
  const hour = map.hour;
  const minute = map.minute;
  const second = map.second;

  if (!year || !month || !day || !hour || !minute || !second) return null;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatCambodiaDateTime(date: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: CAMBODIA_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const formatted = formatDateParts(dtf.formatToParts(date));
    if (formatted) return formatted;
  } catch {
    // ignore and fallback
  }

  return date.toISOString();
}

export function getCambodiaNowString(now = new Date()): string {
  return formatCambodiaDateTime(now);
}

function getDateWallClockParts(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds(),
  };
}

function parseTimestampWithoutZone(raw: string) {
  const match = raw
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/
    );
  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00", fraction = ""] = match;
  return {
    year: Number(year),
    month: Number(month) - 1,
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(fraction.padEnd(3, "0").slice(0, 3) || "0"),
  };
}

function hasExplicitTimezone(raw: string) {
  return raw.includes("T") && (raw.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(raw));
}

function toIsoFromTimestampWithoutZone(value: unknown, sourceOffsetMinutes: number): string {
  if (value == null || value === "") return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const parts = getDateWallClockParts(value);
    return new Date(
      Date.UTC(
        parts.year,
        parts.month,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
        parts.millisecond
      ) - sourceOffsetMinutes * 60_000
    ).toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return "";

  if (hasExplicitTimezone(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  const parts = parseTimestampWithoutZone(raw);
  if (!parts) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  return new Date(
    Date.UTC(
      parts.year,
      parts.month,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond
    ) - sourceOffsetMinutes * 60_000
  ).toISOString();
}

export function timestampWithoutTimeZoneToUtcIso(value: unknown): string {
  return toIsoFromTimestampWithoutZone(value, 0);
}

export function timestampWithoutTimeZoneToCambodiaIso(value: unknown): string {
  return toIsoFromTimestampWithoutZone(value, CAMBODIA_UTC_OFFSET_MINUTES);
}

export function toIsoInstantString(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function toDateInstant(value: unknown): Date | null {
  const iso = toIsoInstantString(value);
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCambodiaDisplayDateTime(
  value: unknown,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = DEFAULT_CAMBODIA_DISPLAY_OPTIONS
): string {
  const date = toDateInstant(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(locale, {
    ...DEFAULT_CAMBODIA_DISPLAY_OPTIONS,
    ...options,
    timeZone: CAMBODIA_TIMEZONE,
  }).format(date);
}

export function normalizeCambodiaTimeString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return formatCambodiaDateTime(value);

  const raw = String(value).trim();
  if (!raw) return "";

  const looksIso =
    raw.includes("T") ||
    raw.endsWith("Z") ||
    /[+-]\d{2}:?\d{2}$/.test(raw);

  if (!looksIso) return raw;

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;

  return formatCambodiaDateTime(dt);
}
