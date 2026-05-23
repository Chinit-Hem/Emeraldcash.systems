"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Vehicle } from "@/lib/types";
import { formatPrice } from "@/lib/vehicle-helpers";

const DEFAULT_ROW_HEIGHT = 80;
const OVERSCAN = 6;

type VirtualTableProps = {
  vehicles: Vehicle[];
  height?: number;
  itemSize?: number;
  isAdmin: boolean;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  sortField: keyof Vehicle | null;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof Vehicle) => void;
};

type SortableField = "Brand" | "Model" | "Year" | "PriceNew" | "Condition" | "Category" | "Plate";

function SortHeader({
  field,
  children,
  sortField,
  sortDirection,
  onSort,
}: {
  field: SortableField;
  children: ReactNode;
  sortField: keyof Vehicle | null;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof Vehicle) => void;
}) {
  const active = sortField === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
    >
      {children}
      <span className={active ? "text-emerald-600" : "text-slate-400"}>
        {active && sortDirection === "desc" ? "↓" : "↑"}
      </span>
    </button>
  );
}

export function VirtualTable({
  vehicles,
  height = 70 * 16,
  itemSize = DEFAULT_ROW_HEIGHT,
  isAdmin,
  onEdit,
  onDelete,
  sortField,
  sortDirection,
  onSort,
}: VirtualTableProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = vehicles.length * itemSize;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemSize) - OVERSCAN);
  const visibleCount = Math.ceil(height / itemSize) + OVERSCAN * 2;
  const endIndex = Math.min(vehicles.length, startIndex + visibleCount);

  const visibleVehicles = useMemo(
    () => vehicles.slice(startIndex, endIndex),
    [endIndex, startIndex, vehicles]
  );

  return (
    <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-[0.8fr_1fr_1fr_0.7fr_1fr_1fr_1fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <SortHeader field="Brand" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Brand</SortHeader>
        <SortHeader field="Model" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Model</SortHeader>
        <SortHeader field="Category" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Category</SortHeader>
        <SortHeader field="Year" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Year</SortHeader>
        <SortHeader field="Plate" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Plate</SortHeader>
        <SortHeader field="Condition" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Condition</SortHeader>
        <SortHeader field="PriceNew" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Price</SortHeader>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</span>
      </div>

      <div
        className="relative overflow-auto"
        style={{ height }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div
          className="relative"
          style={{ height: totalHeight }}
        >
          {visibleVehicles.map((vehicle, offset) => {
            const index = startIndex + offset;
            return (
              <div
                key={vehicle.VehicleId || index}
                className="absolute left-0 right-0 grid grid-cols-[0.8fr_1fr_1fr_0.7fr_1fr_1fr_1fr_1fr] items-center gap-3 border-b border-slate-100 px-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200"
                style={{ height: itemSize, transform: `translateY(${index * itemSize}px)` }}
              >
                <span className="truncate font-semibold">{vehicle.Brand || "-"}</span>
                <span className="truncate">{vehicle.Model || "-"}</span>
                <span className="truncate">{vehicle.Category || "-"}</span>
                <span>{vehicle.Year || "-"}</span>
                <span className="truncate font-mono uppercase">{vehicle.Plate || "-"}</span>
                <span className="truncate">{vehicle.Condition || "-"}</span>
                <span className="truncate font-semibold text-emerald-600">{formatPrice(vehicle.PriceNew)}</span>
                <span className="flex gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onEdit(vehicle)}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(vehicle)}
                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function getRowHeight(_vehicle: Vehicle): number {
  return DEFAULT_ROW_HEIGHT;
}

export default VirtualTable;
