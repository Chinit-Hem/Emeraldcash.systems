"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function RedirectToVehiclesView() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const id = params?.id;

  useEffect(() => {
    if (!id) return;
    router.replace(`/vehicles/${encodeURIComponent(id)}/view`);
  }, [id, router]);

  return null;
}
