import type { Vehicle } from "@/shared/types/types";

export const VEHICLE_GROUP_BY_OPTIONS = ["none", "category", "brand", "year", "condition", "color"] as const;

export type VehicleGroupByOption = (typeof VEHICLE_GROUP_BY_OPTIONS)[number];

type SearchParamsLike = Pick<URLSearchParams, "get" | "getAll" | "toString">;
type VehicleListQueryKey = "category" | "withoutImage" | "noImage" | "groupBy";

const VEHICLE_LIST_QUERY_KEYS: VehicleListQueryKey[] = ["category", "withoutImage", "noImage", "groupBy"];

export function parseVehicleGroupByParam(value: string | null | undefined): VehicleGroupByOption {
  return VEHICLE_GROUP_BY_OPTIONS.includes(value as VehicleGroupByOption)
    ? (value as VehicleGroupByOption)
    : "none";
}

export function normalizeVehicleGroupText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
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
