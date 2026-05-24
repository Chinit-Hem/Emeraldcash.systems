"use client";

import VehiclesClientEnhanced from "@/systems/vms/views/VehiclesClientEnhanced"; // 0ms: Direct import, no dynamic

export default function VehiclesPage() {
  return <VehiclesClientEnhanced />; // 0ms: No Suspense
}
