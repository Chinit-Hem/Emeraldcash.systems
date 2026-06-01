"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  getVehicleListBackLabel,
  getVehicleListHrefWithFallback,
} from "@/systems/vms/utils/vehicleListState";

export function useVehicleListBackLink() {
  const searchParams = useSearchParams();
  const href = useMemo(() => getVehicleListHrefWithFallback(searchParams), [searchParams]);
  const label = useMemo(() => getVehicleListBackLabel(href), [href]);

  return { href, label, searchParams };
}
