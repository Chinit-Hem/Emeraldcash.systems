import type { Vehicle } from "@/shared/types/types";

export function tokenizeQuery(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function vehicleSearchText(vehicle: Vehicle) {
  return [
    vehicle.VehicleId,
    vehicle.Image,
    vehicle.Category,
    vehicle.Brand,
    vehicle.Model,
    vehicle.Year ?? "",
    vehicle.Plate,
    vehicle.Color,
    vehicle.Condition,
    vehicle.BodyType,
    vehicle.TaxType,
    vehicle.PriceNew ?? "",
    vehicle.Price40 ?? "",
    vehicle.Price70 ?? "",
    vehicle.Time,
  ]
    .map((v) => String(v ?? ""))
    .join(" ")
    .toLowerCase();
}
