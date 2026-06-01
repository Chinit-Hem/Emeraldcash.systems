import type { Vehicle } from "@/shared/types/types";

export const VEHICLE_GROUP_BY_OPTIONS = ["none", "category", "brand", "year", "condition", "color"] as const;
export const VEHICLE_LIST_PATH = "/vehicles";
export const VEHICLE_LIST_PAGE_PARAM = "page";
export const VEHICLE_LIST_PAGE_SIZE_PARAM = "pageSize";
export const VEHICLE_LIST_FOCUS_PARAM = "focusVehicle";
export const VEHICLE_LIST_RETURN_STORAGE_KEY = "vms-vehicle-list-return-href";

export type VehicleGroupByOption = (typeof VEHICLE_GROUP_BY_OPTIONS)[number];

type SearchParamsLike = Pick<URLSearchParams, "get" | "getAll" | "toString">;
type VehicleListQueryKey =
  | "category"
  | "withoutImage"
  | "noImage"
  | "groupBy"
  | typeof VEHICLE_LIST_PAGE_PARAM
  | typeof VEHICLE_LIST_PAGE_SIZE_PARAM
  | typeof VEHICLE_LIST_FOCUS_PARAM;

const VEHICLE_LIST_QUERY_KEYS: VehicleListQueryKey[] = [
  "category",
  "withoutImage",
  "noImage",
  "groupBy",
  VEHICLE_LIST_PAGE_PARAM,
  VEHICLE_LIST_PAGE_SIZE_PARAM,
  VEHICLE_LIST_FOCUS_PARAM,
];

export function parseVehicleGroupByParam(value: string | null | undefined): VehicleGroupByOption {
  return VEHICLE_GROUP_BY_OPTIONS.includes(value as VehicleGroupByOption)
    ? (value as VehicleGroupByOption)
    : "none";
}

export function parseVehicleListPageParam(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseVehicleListPageSizeParam(
  value: string | null | undefined,
  allowedSizes: readonly number[]
): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && allowedSizes.includes(parsed) ? parsed : null;
}

export function normalizeVehicleGroupText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function getVehicleListItemElementId(vehicleId: string): string {
  return `vehicle-list-item-${vehicleId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function normalizeVehicleListHref(href: string | null | undefined): string | null {
  const trimmedHref = href?.trim();
  if (!trimmedHref || trimmedHref.startsWith("//")) return null;

  try {
    if (trimmedHref.startsWith("/")) {
      const parsed = new URL(trimmedHref, "http://localhost");
      return parsed.pathname === VEHICLE_LIST_PATH
        ? `${parsed.pathname}${parsed.search}`
        : null;
    }

    if (typeof window === "undefined") return null;

    const parsed = new URL(trimmedHref);
    return parsed.origin === window.location.origin && parsed.pathname === VEHICLE_LIST_PATH
      ? `${parsed.pathname}${parsed.search}`
      : null;
  } catch {
    return null;
  }
}

export function rememberVehicleListHref(href: string): void {
  if (typeof window === "undefined") return;

  const safeHref = normalizeVehicleListHref(href);
  if (!safeHref) return;

  try {
    window.sessionStorage.setItem(VEHICLE_LIST_RETURN_STORAGE_KEY, safeHref);
  } catch {
    // Best-effort navigation handoff only.
  }
}

export function getStoredVehicleListHref(fallback = VEHICLE_LIST_PATH): string {
  if (typeof window === "undefined") return fallback;

  try {
    return normalizeVehicleListHref(window.sessionStorage.getItem(VEHICLE_LIST_RETURN_STORAGE_KEY)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getVehicleGroupValue(vehicle: Vehicle, groupBy: VehicleGroupByOption): string {
  switch (groupBy) {
    case "category": return normalizeVehicleGroupText(vehicle.Category || "") || "Uncategorized";
    case "brand": return normalizeVehicleGroupText(vehicle.Brand || "") || "Unknown Brand";
    case "year": return normalizeVehicleGroupText(vehicle.Year?.toString() || "") || "Unknown Year";
    case "condition": return normalizeVehicleGroupText(vehicle.Condition || "") || "Unknown Condition";
    case "color": return normalizeVehicleGroupText(vehicle.Color || "") || "Unknown Color";
    default: return "All";
  }
}

export function getVehicleGroupKey(vehicle: Vehicle, groupBy: VehicleGroupByOption): string {
  const normalizedValue = normalizeVehicleGroupText(getVehicleGroupValue(vehicle, groupBy));
  return groupBy === "year" ? normalizedValue : normalizedValue.toLocaleLowerCase("en-US");
}

export function getVehicleListSearchParams(searchParams: SearchParamsLike | null | undefined): URLSearchParams {
  const next = new URLSearchParams();
  if (!searchParams) return next;

  for (const key of VEHICLE_LIST_QUERY_KEYS) {
    for (const value of searchParams.getAll(key)) {
      if (value) next.append(key, value);
    }
  }

  return next;
}

export function setVehicleListQueryValue(
  searchParams: SearchParamsLike | null | undefined,
  key: VehicleListQueryKey,
  value: string | null | undefined
): URLSearchParams {
  const next = getVehicleListSearchParams(searchParams);
  next.delete(key);
  if (value) next.set(key, value);
  return next;
}

export function withVehicleListQuery(path: string, searchParams: SearchParamsLike | null | undefined): string {
  const query = getVehicleListSearchParams(searchParams).toString();
  return query ? `${path}?${query}` : path;
}

export function getVehicleListHrefWithFallback(searchParams: SearchParamsLike | null | undefined): string {
  const queryHref = withVehicleListQuery(VEHICLE_LIST_PATH, searchParams);
  return queryHref === VEHICLE_LIST_PATH ? getStoredVehicleListHref(queryHref) : queryHref;
}

export function withVehicleListQueryFallback(path: string, searchParams: SearchParamsLike | null | undefined): string {
  const query = getVehicleListSearchParams(searchParams).toString();
  if (query) return `${path}?${query}`;

  const storedHref = getStoredVehicleListHref();
  const storedQuery = getVehicleListSearchParams(new URLSearchParams(storedHref.split("?")[1] ?? "")).toString();
  return storedQuery ? `${path}?${storedQuery}` : path;
}
