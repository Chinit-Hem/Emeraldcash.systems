"use client";

import { useCallback, useEffect, useState } from "react";
import type { SmsAssetOption } from "@/systems/sms/types/sms-movement";
import { fetchSmsAssetOptions } from "@/systems/sms/utils/smsMovementAssets";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useSmsAssetOptions() {
  const [assets, setAssets] = useState<SmsAssetOption[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const refreshAssets = useCallback(async (signal?: AbortSignal) => {
    setAssetsLoading(true);

    try {
      const nextAssets = await fetchSmsAssetOptions(signal);
      if (!signal?.aborted) setAssets(nextAssets);
    } catch (error) {
      if (!isAbortError(error) && !signal?.aborted) setAssets([]);
    } finally {
      if (!signal?.aborted) setAssetsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshAssets(controller.signal);

    return () => controller.abort();
  }, [refreshAssets]);

  return {
    assets,
    assetsLoading,
    refreshAssets,
  };
}
