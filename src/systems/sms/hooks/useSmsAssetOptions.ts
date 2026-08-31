"use client";

import { useCallback, useEffect, useState } from "react";
import type { SmsAssetOption } from "@/systems/sms/types/sms-movement";
import { fetchSmsAssetOptions } from "@/systems/sms/utils/smsMovementAssets";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const CACHE_TTL_MS = 30_000;
let cachedAssets: SmsAssetOption[] | null = null;
let cachedAssetsAt = 0;
let assetsRequest: Promise<SmsAssetOption[]> | null = null;

function loadAssets(force = false): Promise<SmsAssetOption[]> {
  if (!force && cachedAssets && Date.now() - cachedAssetsAt < CACHE_TTL_MS) {
    return Promise.resolve(cachedAssets);
  }
  if (!force && assetsRequest) return assetsRequest;

  const request = fetchSmsAssetOptions().then((assets) => {
    cachedAssets = assets;
    cachedAssetsAt = Date.now();
    return assets;
  }).finally(() => {
    if (assetsRequest === request) assetsRequest = null;
  });
  assetsRequest = request;
  return request;
}

export function useSmsAssetOptions() {
  const [assets, setAssets] = useState<SmsAssetOption[]>(() => cachedAssets || []);
  const [assetsLoading, setAssetsLoading] = useState(!cachedAssets);

  const requestAssets = useCallback(async (force: boolean, signal?: AbortSignal) => {
    setAssetsLoading(true);

    try {
      const nextAssets = await loadAssets(force);
      if (!signal?.aborted) setAssets(nextAssets);
    } catch (error) {
      if (!isAbortError(error) && !signal?.aborted) setAssets([]);
    } finally {
      if (!signal?.aborted) setAssetsLoading(false);
    }
  }, []);

  const refreshAssets = useCallback(
    (signal?: AbortSignal) => requestAssets(true, signal),
    [requestAssets]
  );

  useEffect(() => {
    const controller = new AbortController();
    void requestAssets(false, controller.signal);

    return () => controller.abort();
  }, [requestAssets]);

  return {
    assets,
    assetsLoading,
    refreshAssets,
  };
}
