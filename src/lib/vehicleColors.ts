import { translatePhrase, type Language } from "@/lib/i18n";

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
};

function normalizeColorName(colorName: string): string {
  return colorName.toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
}

export function getVehicleColorHex(colorName: string | null | undefined): string {
  const raw = colorName?.trim();
  if (!raw) return "#94a3b8";

  const normalized = normalizeColorName(raw);
  const exact = VEHICLE_COLOR_HEX[normalized];
  if (exact) return exact;

  for (const [name, hex] of Object.entries(VEHICLE_COLOR_HEX)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return hex;
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
  if (language === "en") return raw;

  const translated = translatePhrase(raw, language);
  if (translated !== raw) return translated;

  return raw
    .split(/(\s*(?:\/|,|\+|&|-)\s*)/)
    .map((part) => (/^(?:\s*(?:\/|,|\+|&|-)\s*)$/.test(part) ? part : translateColorSegment(part, language)))
    .join("");
}
