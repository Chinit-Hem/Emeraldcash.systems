import type { Vehicle } from "@/shared/types/types";

export const VEHICLE_GROUP_BY_OPTIONS = ["none", "category", "brand", "year", "condition", "color"] as const;
export const VEHICLE_LIST_PATH = "/vehicles";
export const VEHICLE_LIST_PAGE_PARAM = "page";
export const VEHICLE_LIST_PAGE_SIZE_PARAM = "pageSize";
export const VEHICLE_LIST_FOCUS_PARAM = "focusVehicle";
export const VEHICLE_LIST_RETURN_PARAM = "from";
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

const VEHICLE_LIST_CONTEXT_KEYS: VehicleListQueryKey[] = [
  "category",
  "withoutImage",
  "noImage",
  "groupBy",
  VEHICLE_LIST_PAGE_SIZE_PARAM,
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

export function getCurrentVehicleListHref(fallback = VEHICLE_LIST_PATH): string {
  if (typeof window === "undefined") return fallback;

  const currentHref = normalizeVehicleListHref(`${window.location.pathname}${window.location.search}`);
  return currentHref ?? getStoredVehicleListHref(fallback);
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

function getVehicleListHrefFromParams(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${VEHICLE_LIST_PATH}?${query}` : VEHICLE_LIST_PATH;
}

function getStoredVehicleListSearchParams(): URLSearchParams {
  const storedHref = getStoredVehicleListHref("");
  const storedQuery = storedHref.split("?")[1] ?? "";

  return getVehicleListSearchParams(new URLSearchParams(storedQuery));
}

function haveSameQueryValues(
  left: URLSearchParams,
  right: URLSearchParams,
  key: VehicleListQueryKey
): boolean {
  const leftValues = left.getAll(key);
  const rightValues = right.getAll(key);

  return (
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index])
  );
}

function shouldMergeStoredVehicleListParams(
  current: URLSearchParams,
  stored: URLSearchParams
): boolean {
  if (!current.toString()) return true;
  if (!stored.toString()) return false;
  if (current.has(VEHICLE_LIST_PAGE_PARAM)) return false;

  return VEHICLE_LIST_CONTEXT_KEYS.every((key) => {
    if (!current.has(key)) return true;
    return haveSameQueryValues(current, stored, key);
  });
}

function mergeVehicleListSearchParams(
  base: URLSearchParams,
  overrides: URLSearchParams
): URLSearchParams {
  const merged = new URLSearchParams(base.toString());

  for (const key of VEHICLE_LIST_QUERY_KEYS) {
    const values = overrides.getAll(key);
    if (values.length === 0) continue;

    merged.delete(key);
    for (const value of values) {
      merged.append(key, value);
    }
  }

  return merged;
}

function getVehicleListSearchParamsWithFallback(
  searchParams: SearchParamsLike | null | undefined
): URLSearchParams {
  const current = getVehicleListSearchParams(searchParams);
  const stored = getStoredVehicleListSearchParams();

  return shouldMergeStoredVehicleListParams(current, stored)
    ? mergeVehicleListSearchParams(stored, current)
    : current;
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

export function withVehicleListFocusHref(href: string, focusVehicleId: string | null | undefined): string {
  const safeHref = normalizeVehicleListHref(href) ?? VEHICLE_LIST_PATH;
  const params = getVehicleListSearchParams(
    new URLSearchParams(safeHref.split("?")[1] ?? "")
  );

  if (focusVehicleId) {
    params.set(VEHICLE_LIST_FOCUS_PARAM, focusVehicleId);
  } else {
    params.delete(VEHICLE_LIST_FOCUS_PARAM);
  }

  return getVehicleListHrefFromParams(params);
}

export function withVehicleListReturnHref(path: string, returnHref: string): string {
  const safeReturnHref = normalizeVehicleListHref(returnHref) ?? VEHICLE_LIST_PATH;
  const params = getVehicleListSearchParams(
    new URLSearchParams(safeReturnHref.split("?")[1] ?? "")
  );
  params.set(VEHICLE_LIST_RETURN_PARAM, safeReturnHref);

  return `${path}?${params.toString()}`;
}

export function getVehicleViewHref(vehicleId: string, returnHref = getCurrentVehicleListHref()): string {
  return withVehicleListReturnHref(
    `/vehicles/${encodeURIComponent(vehicleId)}/view`,
    returnHref
  );
}

export function getVehicleEditHref(vehicleId: string, returnHref = getCurrentVehicleListHref()): string {
  return withVehicleListReturnHref(
    `/vehicles/${encodeURIComponent(vehicleId)}/edit`,
    returnHref
  );
}

export function getVehicleListHrefWithFallback(searchParams: SearchParamsLike | null | undefined): string {
  const returnHref = normalizeVehicleListHref(searchParams?.get(VEHICLE_LIST_RETURN_PARAM));
  if (returnHref) {
    const returnParams = getVehicleListSearchParams(
      new URLSearchParams(returnHref.split("?")[1] ?? "")
    );
    const currentParams = getVehicleListSearchParams(searchParams);

    for (const key of VEHICLE_LIST_QUERY_KEYS) {
      if (!returnParams.has(key) && currentParams.has(key)) {
        for (const value of currentParams.getAll(key)) {
          returnParams.append(key, value);
        }
      }
    }

    return getVehicleListHrefFromParams(returnParams);
  }

  return getVehicleListHrefFromParams(getVehicleListSearchParamsWithFallback(searchParams));
}

export function getVehicleListPageFromHref(href: string): number {
  try {
    const parsed = new URL(href, "http://localhost");
    return parseVehicleListPageParam(parsed.searchParams.get(VEHICLE_LIST_PAGE_PARAM));
  } catch {
    return 1;
  }
}

export function getVehicleListBackLabel(href: string): string {
  return `Back to List ${getVehicleListPageFromHref(href)}`;
}

export function withVehicleListQueryFallback(path: string, searchParams: SearchParamsLike | null | undefined): string {
  return withVehicleListReturnHref(path, getVehicleListHrefWithFallback(searchParams));
}
