"use client";

import VehiclesClientEnhanced from "./VehiclesClientEnhanced"; // 0ms: Direct import, no dynamic

export default function VehiclesPage() {
  return <VehiclesClientEnhanced />; // 0ms: No Suspense
}
