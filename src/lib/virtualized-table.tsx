"use client";

import {
  FixedSizeList as List,
  ListChildComponentProps,
} from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { useCallback, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/ui";
import type { Vehicle } from "@/lib/types";

export interface VirtualTableProps {
  /** Data for virtual rows */
  data: Vehicle[];
  /** Height of each row */
  rowHeight?: number;
  /** Width of table (auto if not provided) */
  width?: number;
  /** Height of table container */
  height?: number;
  /** Render function for each row */
  renderRow: (vehicle: Vehicle, index: number, style: React.CSSProperties) => React.ReactNode;
  /** Optional header */
  header?: React.ReactNode;
  /** Loading indicator for empty state */
  isLoading?: boolean;
  /** Total estimated rows for scroll height */
  estimatedRowCount?: number;
  /** On row click handler */
  onRowClick?: (vehicle: Vehicle) => void;
}

const DEFAULT_ROW_HEIGHT = 80;
const OVERSCAN = 5;

interface VirtualTableProps {
  /** Vehicles data */
  vehicles: Vehicle[];
  /** Container height */
  height?: number;
  /** Single row height (fixed) */
  itemSize?: number;
  /** Admin mode */
  isAdmin: boolean;
  /** Callbacks */
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  /** Sorting */
  sortField: keyof Vehicle | null;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof Vehicle) => void;
}

export function VirtualTable({
  vehicles,
  height = 70 * 16, // 70vh
  itemSize = 80,
  isAdmin,
  onEdit,
  onDelete,
  sortField,
  sortDirection,
  onSort,
}: VirtualTableProps) {
  const VehicleRowRenderer = useCallback(({ index, style }: ListChildComponentProps) => {
    const vehicle = vehicles[index];
    if (!vehicle) return null;

    return (
      <VehicleRow
        key={vehicle.VehicleId || index}
        vehicle={vehicle}
        index={index}
        style={style}
        isAdmin={isAdmin}
        visibleColumns={['id', 'image', 'category', 'brand', 'model', 'year', 'plate', 'priceNew', 'price40', 'price70', 'taxType', 'condition', 'bodyType', 'color', 'actions']}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        onEdit={onEdit}
        onDelete={onDelete}
        imageErrors={new Set()}
        setImageErrors={() => {}}
        deletingId={null}
        handleOptimisticDelete={onDelete}
        router={{ push: () => {} }}
      />
    );
  }, [vehicles, isAdmin, onEdit, onDelete, sortField, sortDirection, onSort]);


  const itemCount = data.length || estimatedRowCount;

  if (isLoading) {
    return (
      <div className="flex flex-col h-[600px] items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <span className="mt-2 text-sm text-slate-500">Loading vehicles...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-white rounded-xl shadow-sm border">
      {header && (
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 rounded-t-xl">
          {header}
        </div>
      )}
      <AutoSizer>
        {({ height: autoHeight, width: autoWidth }: { height: number; width: number }) => (
          <List
            height={autoHeight || height}
            itemCount={itemCount}
            itemSize={rowHeight}
            width={autoWidth || width || "100%"}
            overscanCount={OVERSCAN}
            className="border-t"
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

// Row height calculator for variable content
export function getRowHeight(vehicle: Vehicle): number {
  return DEFAULT_ROW_HEIGHT;
}

// Export types for VehicleTable compatibility
export type { Vehicle };

export default VirtualTable;


// Row height calculator for variable content
export function getRowHeight(vehicle: Vehicle): number {
  return DEFAULT_ROW_HEIGHT;
}

// Export types for VehicleTable compatibility
export type { Vehicle };

export default VirtualTable;

