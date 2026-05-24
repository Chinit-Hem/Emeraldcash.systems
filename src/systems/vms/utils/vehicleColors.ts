import { translatePhrase, type Language } from "@/shared/utils/i18n";

const VEHICLE_COLOR_HEX: Record<string, string> = {
  white: "#ffffff",
  black: "#111827",
  silver: "#c0c0c0",
  gray: "#808080",
  grey: "#808080",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#10b981",
  yellow: "#facc15",
  orange: "#f97316",
  brown: "#92400e",
  beige: "#d4c5b0",
  gold: "#fbbf24",
  navy: "#1e3a8a",
  "navy blue": "#1e3a8a",
  purple: "#8b5cf6",
  pink: "#ec4899",
  maroon: "#7f1d1d",
  champagne: "#f7e7ce",
  bronze: "#cd7f32",
  copper: "#b87333",
  cream: "#fffdd0",
  ivory: "#fffff0",
  "pearl white": "#f8fafc",
  "metallic silver": "#9ca3af",
  "metallic gray": "#6b7280",
  "metallic grey": "#6b7280",
  gunmetal: "#4b5563",
  "dark blue": "#1d4ed8",
  "light blue": "#93c5fd",
  "dark gray": "#4b5563",
  "dark grey": "#4b5563",
  "light gray": "#d1d5db",
  "light grey": "#d1d5db",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  lime: "#84cc16",
  olive: "#65a30d",
  coral: "#f87171",
  khaki: "#c3b091",
  lavender: "#c4b5fd",
  magenta: "#d946ef",
  mint: "#6ee7b7",
  peach: "#fdba74",
  plum: "#a855f7",
  tan: "#d2b48c",
  turquoise: "#40e0d0",
  violet: "#8b5cf6",
  indigo: "#6366f1",
  charcoal: "#374151",
  burgundy: "#9f1239",
  rose: "#fb7185",
  slate: "#475569",
  emerald: "#10b981",
  ruby: "#e11d48",
  sapphire: "#1d4ed8",
  amber: "#f59e0b",
  jade: "#00a86b",
  pearl: "#f0e6d2",
  graphite: "#4b5563",
  other: "#94a3b8",
};

const COLOR_PART_SEPARATOR = /(?:\s*\/\s*|\s*,\s*|\s*\+\s*|\s*&\s*|\s*-\s*|\s+and\s+)/i;

function normalizeColorName(colorName: string): string {
  return colorName.toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getEnglishColorCandidates(raw: string): string[] {
  const translatedRaw = translatePhrase(raw, "en");
  const candidates = [raw, translatedRaw];

  for (const value of [raw, translatedRaw]) {
    const parts = value.split(COLOR_PART_SEPARATOR);
    if (parts.length > 1) {
      candidates.push(...parts);
      candidates.push(...parts.map((part) => translatePhrase(part, "en")));
    }
  }

  return uniqueValues(candidates.map(normalizeColorName));
}

export function getVehicleColorHex(colorName: string | null | undefined): string {
  const raw = colorName?.trim();
  if (!raw) return "#94a3b8";

  const candidates = getEnglishColorCandidates(raw);
  for (const candidate of candidates) {
    const exact = VEHICLE_COLOR_HEX[candidate];
    if (exact) return exact;
  }

  for (const candidate of candidates) {
    for (const [name, hex] of Object.entries(VEHICLE_COLOR_HEX)) {
      if (candidate.includes(name) || name.includes(candidate)) {
        return hex;
      }
    }
  }

  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = raw.charCodeAt(index) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 70%, 50%)`;
}

function translateColorSegment(segment: string, language: Language): string {
  if (!segment.trim()) return segment;

  const leading = segment.match(/^\s*/)?.[0] ?? "";
  const trailing = segment.match(/\s*$/)?.[0] ?? "";
  const core = segment.trim();
  const translatedCore = translatePhrase(core, language);

  if (translatedCore !== core) {
    return `${leading}${translatedCore}${trailing}`;
  }

  const translatedWords = core
    .split(/(\s+)/)
    .map((part) => (part.trim() ? translatePhrase(part, language) : part))
    .join("");

  return translatedWords !== core ? `${leading}${translatedWords}${trailing}` : segment;
}

export function translateVehicleColor(colorName: string | null | undefined, language: Language): string {
  const raw = colorName?.trim();
  if (!raw) return "-";

  const translated = translatePhrase(raw, language);
  if (translated !== raw) return translated;

  return raw
    .split(/(\s*(?:\/|,|\+|&|-)\s*)/)
    .map((part) => (/^(?:\s*(?:\/|,|\+|&|-)\s*)$/.test(part) ? part : translateColorSegment(part, language)))
    .join("");
}
